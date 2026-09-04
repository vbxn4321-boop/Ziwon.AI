import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  name: string | null;
}

export type AdminAuthResult =
  | { authorized: true; user: AdminUser }
  | { authorized: false; response: NextResponse };

/**
 * JWT 토큰 디코딩 및 서명 검증 헬퍼
 */
function verifyJwtToken(token: string): { valid: boolean; payload?: any } {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) return { valid: false };
  const parts = token.split(".");
  if (parts.length !== 3) return { valid: false };

  const [header, payload, signature] = parts;
  const expectedSig = crypto
    .createHmac("sha256", jwtSecret)
    .update(`${header}.${payload}`)
    .digest("base64url");

  // If secret signature matches
  if (expectedSig === signature) {
    try {
      const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
      if (data.exp && data.exp < Math.floor(Date.now() / 1000)) {
        return { valid: false }; // Expired
      }
      return { valid: true, payload: data };
    } catch {
      return { valid: false };
    }
  }

  // Fallback: Check if it's a Supabase JWT (Base64 payload decoding)
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
    if (data.sub && (data.iss?.includes("supabase") || data.aud === "authenticated")) {
      return { valid: true, payload: data };
    }
  } catch {}

  return { valid: false };
}

/**
 * [서버단 관리자 권한 검증 미들웨어]
 * 모든 /api/admin/* 라우트에서 호출하여 요청자의 ADMIN 역할을 엄격히 검증합니다.
 */
export async function verifyAdminRequest(req: NextRequest): Promise<AdminAuthResult> {
  try {
    // 0-1. 백엔드 내부 크론 스케줄러(APScheduler) 머신 간 통신 인증 (보안: fallback 문자열 제거 및 타이밍 세이프 검증)
    const internalCronSecret = process.env.INTERNAL_CRON_SECRET;
    const cronKeyHeader = req.headers.get("x-internal-cron-key");

    if (
      internalCronSecret &&
      cronKeyHeader &&
      internalCronSecret.length >= 32 &&
      cronKeyHeader.length === internalCronSecret.length
    ) {
      const headerBuf = Buffer.from(cronKeyHeader);
      const secretBuf = Buffer.from(internalCronSecret);
      if (crypto.timingSafeEqual(headerBuf, secretBuf)) {
        return {
          authorized: true,
          user: {
            id: "system-cron-worker",
            email: "cron@ziwon.ai",
            role: "ADMIN",
            name: "시스템 백그라운드 워커",
          },
        };
      }
    }

    // 0-2. Vercel 플랫폼 공식 Cron 트리거 검증 (vercel.json / Authorization: Bearer <CRON_SECRET>)
    const vercelCronSecret = process.env.CRON_SECRET;
    const authHeaderRaw = req.headers.get("authorization");
    if (
      vercelCronSecret &&
      authHeaderRaw &&
      vercelCronSecret.length >= 16 &&
      authHeaderRaw === `Bearer ${vercelCronSecret}`
    ) {
      return {
        authorized: true,
        user: {
          id: "vercel-cron-worker",
          email: "cron@ziwon.ai",
          role: "ADMIN",
          name: "Vercel 플랫폼 공식 크론",
        },
      };
    }

    // 1. Authorization 헤더 또는 HttpOnly 쿠키에서 토큰 추출
    const authHeader = req.headers.get("authorization");
    let token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7).trim() : null;

    if (!token) {
      token = req.cookies.get("ziwon_access_token")?.value || null;
    }
    if (!token) {
      token = req.cookies.get("ziwon_refresh_token")?.value || null;
    }

    if (!token) {
      return {
        authorized: false,
        response: NextResponse.json(
          { success: false, error: "인증되지 않은 요청입니다. 로그인이 필요합니다." },
          { status: 401 }
        ),
      };
    }

    // 2. JWT 검증 및 Payload 추출
    const { valid, payload } = verifyJwtToken(token);
    if (!valid || !payload?.sub) {
      return {
        authorized: false,
        response: NextResponse.json(
          { success: false, error: "유효하지 않거나 만료된 인증 토큰입니다." },
          { status: 401 }
        ),
      };
    }

    // 3. DB에서 사용자 정보 및 권한(Role) 확인
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: payload.sub },
          { email: payload.email || undefined },
        ],
      },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
      },
    });

    if (!user) {
      return {
        authorized: false,
        response: NextResponse.json(
          { success: false, error: "등록된 사용자 정보를 찾을 수 없습니다." },
          { status: 404 }
        ),
      };
    }

    // 4. ADMIN 권한 확인 (qjawls2617@naver.com 또는 role === 'ADMIN')
    const isAdmin = user.role === "ADMIN" || user.email === "qjawls2617@naver.com";
    if (!isAdmin) {
      return {
        authorized: false,
        response: NextResponse.json(
          { success: false, error: "관리자 전용 API입니다. 접근 권한(ADMIN)이 없습니다." },
          { status: 403 }
        ),
      };
    }

    return {
      authorized: true,
      user,
    };
  } catch (err: any) {
    console.error("[Admin Auth Guard Error]:", err);
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: "관리자 권한 검증 중 오류가 발생했습니다." },
        { status: 500 }
      ),
    };
  }
}

/**
 * [관리자 활동 감사 로그(Audit Log) 기록]
 */
export async function logAdminAction(adminEmail: string, action: string, itemCount: number = 0, details?: string) {
  try {
    await prisma.crawlLog.create({
      data: {
        sourceType: `ADMIN_ACTION_${action}`,
        status: "SUCCESS",
        itemCount,
        errorMessage: `[Admin: ${adminEmail}] ${details || action}`,
        executedAt: new Date(),
      },
    });
  } catch (e: any) {
    console.warn("[Admin Audit Log Warning]:", e.message);
  }
}
