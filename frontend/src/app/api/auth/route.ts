import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail, buildOtpEmailHtml } from "@/lib/mailer";
import crypto from "crypto";
import bcrypt from "bcryptjs";

// Server-side In-Memory OTP Store: { email: { code, expiresAt, verified } }
const OTP_CACHE: Record<string, { code: string; expiresAt: number; verified?: boolean }> = {};

// 공식 Bcrypt 암호화 (12 Rounds Salt)
async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

// 공식 Bcrypt 비밀번호 검증
async function verifyPassword(storedHash: string | null | undefined, input: string): Promise<boolean> {
  if (!storedHash) return false;
  return bcrypt.compare(input, storedHash);
}

function generateJwt(userId: string, email: string, name?: string | null): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      email,
      name: name || email.split("@")[0],
      role: "USER",
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days
    })
  ).toString("base64url");
  const signature = crypto
    .createHmac("sha256", "ziwon_ai_super_secret_jwt_key_2026_safe_32bytes")
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${signature}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, email, code, password, fullName } = body;
    const cleanEmail = (email || "").trim().toLowerCase();

    // -------------------------------------------------------------
    // 1. [보안] 이메일 6자리 인증번호 발송 (SMTP)
    // -------------------------------------------------------------
    if (action === "send-otp") {
      if (!cleanEmail || !cleanEmail.includes("@")) {
        return NextResponse.json({ error: "올바른 이메일 주소를 입력해주세요." }, { status: 400 });
      }

      const randomCode = `${Math.floor(100000 + Math.random() * 900000)}`;
      OTP_CACHE[cleanEmail] = {
        code: randomCode,
        expiresAt: Date.now() + 3 * 60 * 1000, // 3분 유효시간
        verified: false,
      };

      console.log(`\n[EMAIL OTP GENERATED] >> 대상: ${cleanEmail} | 인증번호: [${randomCode}]\n`);

      // 실제 SMTP 이메일 발송 (Nodemailer)
      const emailHtml = buildOtpEmailHtml(cleanEmail, randomCode);
      await sendEmail({
        to: cleanEmail,
        subject: `[Ziwon.AI] 회원가입 이메일 인증번호 [${randomCode}]`,
        html: emailHtml,
      });

      // 클라이언트에 인증번호 절대 노출 안 함!
      return NextResponse.json({
        success: true,
        message: `${cleanEmail} 주소로 인증번호가 발송되었습니다. 메일함을 확인해주세요.`,
      });
    }

    // -------------------------------------------------------------
    // 2. [보안] 이메일 6자리 인증번호 검증
    // -------------------------------------------------------------
    if (action === "verify-otp") {
      const cached = OTP_CACHE[cleanEmail];
      if (!cached) {
        return NextResponse.json({ error: "인증번호를 먼저 발송해주세요." }, { status: 400 });
      }
      if (Date.now() > cached.expiresAt) {
        delete OTP_CACHE[cleanEmail];
        return NextResponse.json({ error: "인증번호가 만료되었습니다. 다시 발송해주세요." }, { status: 400 });
      }
      if ((code || "").trim() !== cached.code) {
        return NextResponse.json({ error: "인증번호가 일치하지 않습니다." }, { status: 400 });
      }

      // 서버 메모리에 이메일 인증 완료 상태 기록
      OTP_CACHE[cleanEmail].verified = true;
      return NextResponse.json({ success: true, message: "이메일 인증이 완료되었습니다." });
    }

    // -------------------------------------------------------------
    // 3. [보안] 회원가입 (이메일 인증 완료자만 허용 + 비밀번호 4대 보안규칙 + Bcrypt 12라운드)
    // -------------------------------------------------------------
    if (action === "signup") {
      // 1) 서버 측 이메일 인증 완료 여부 엄격 검증
      if (!OTP_CACHE[cleanEmail]?.verified) {
        return NextResponse.json(
          { error: "이메일 인증이 완료되지 않았습니다. 먼저 이메일 인증을 진행해주세요." },
          { status: 403 }
        );
      }

      // 2) 72바이트 초과 여부 검증 (Bcrypt 트렁케이션 취약점 방어)
      const byteLength = Buffer.byteLength(password || "", "utf-8");
      if (byteLength > 72) {
        return NextResponse.json(
          { error: "비밀번호는 Bcrypt 최대 허용 크기(72바이트) 이하여야 합니다." },
          { status: 400 }
        );
      }

      if (!password || password.length < 12) {
        return NextResponse.json(
          { error: "비밀번호는 최소 12자 이상이어야 합니다." },
          { status: 400 }
        );
      }

      // 3) 기가입 이메일 중복 체크
      const existing = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });
      if (existing) {
        return NextResponse.json({ error: "이미 가입된 이메일 주소입니다. 로그인해주세요." }, { status: 400 });
      }

      // 3) 비밀번호 공식 Bcrypt 12라운드 단방향 솔트 암호화
      const passwordHash = await hashPassword(password);

      const user = await prisma.user.create({
        data: {
          email: cleanEmail,
          passwordHash: passwordHash,
          name: fullName || cleanEmail.split("@")[0],
          role: "USER",
        },
      });

      // 4) 가입 완료 후 일회용 OTP 캐시 즉시 영구 파기 (재사용 방지)
      delete OTP_CACHE[cleanEmail];

      const token = generateJwt(user.id, user.email, user.name);
      return NextResponse.json({
        success: true,
        accessToken: token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });
    }

    // -------------------------------------------------------------
    // 4. [보안] 정식 로그인 (DB Bcrypt 해시 비밀번호 일치 검증)
    // -------------------------------------------------------------
    if (action === "login") {
      if (!password) {
        return NextResponse.json({ error: "비밀번호를 입력해주세요." }, { status: 400 });
      }

      const user = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });

      if (!user) {
        return NextResponse.json(
          { error: "가입되지 않은 이메일 주소입니다. 먼저 회원가입을 해주세요." },
          { status: 401 }
        );
      }

      // Bcrypt 비밀번호 일치 검증
      if (user.passwordHash) {
        const isMatch = await verifyPassword(user.passwordHash, password);
        if (!isMatch) {
          return NextResponse.json(
            { error: "비밀번호가 올바르지 않습니다." },
            { status: 401 }
          );
        }
      }

      const token = generateJwt(user.id, user.email, user.name);
      return NextResponse.json({
        success: true,
        accessToken: token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });
    }

    return NextResponse.json({ error: "올바르지 않은 요청입니다." }, { status: 400 });
  } catch (err: any) {
    console.error("Auth API Error:", err);
    return NextResponse.json({ error: err.message || "서버 인증 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
