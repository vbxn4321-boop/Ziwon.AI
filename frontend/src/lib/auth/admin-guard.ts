import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAccessToken, extractBearerToken } from "@/lib/auth/verify-token";
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
 * 관리자로 인정할 이메일 목록.
 * 소스코드에 이메일을 박아두면 저장소를 읽을 수 있는 누구나 표적을 알게 되므로
 * 환경변수로 뺍니다. 평소에는 비워두고 DB 의 role 컬럼만 쓰는 것이 정상 운영입니다.
 * (비상시 role 이 유실됐을 때만 쓰는 탈출구)
 */
function getAdminEmailAllowlist(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
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

    // 1. Authorization 헤더에서 Access Token 추출
    //    - ziwon_access_token 쿠키는 어디서도 설정하지 않는 죽은 경로여서 제거했습니다.
    //    - ziwon_refresh_token 을 대신 읽던 경로도 제거했습니다. 30일짜리 리프레시
    //      토큰을 API 접근에 그대로 쓰는 것은 Access Token 을 30분으로 짧게 유지하는
    //      설계 자체를 무의미하게 만듭니다.
    const token = extractBearerToken(req);

    if (!token) {
      return {
        authorized: false,
        response: NextResponse.json(
          { success: false, error: "인증되지 않은 요청입니다. 로그인이 필요합니다." },
          { status: 401 }
        ),
      };
    }

    // 2. JWT 검증 (서명 + 만료 + 토큰 종류). 검증 실패 시 폴백 없이 거부합니다.
    const verified = await verifyAccessToken(token);
    if (!verified.valid) {
      return {
        authorized: false,
        response: NextResponse.json(
          { success: false, error: `유효하지 않은 인증 토큰입니다. (${verified.reason})` },
          { status: 401 }
        ),
      };
    }

    // 3. DB에서 사용자 정보 및 권한(Role) 확인
    //    토큰의 email 로도 조회하던 OR 절을 제거했습니다. 신원은 sub 하나로 정합니다.
    const user = await prisma.user.findUnique({
      where: { id: verified.payload.sub },
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

    // 4. ADMIN 권한 확인 (DB role 우선, ADMIN_EMAILS 는 비상용 탈출구)
    const isAdmin =
      user.role === "ADMIN" ||
      getAdminEmailAllowlist().includes(user.email.toLowerCase());
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
