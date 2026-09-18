import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Supabase Auth(구글·카카오 소셜 로그인)가 발급한 JWT를 검증한다.
 *
 * 이 프로젝트의 Access Token은 원래 JWT_SECRET 으로 서명한 우리 자체 토큰만
 * 상정하고 있었다. 소셜 로그인은 Supabase 자신의 키(ES256, 비대칭키)로
 * 서명한 JWT를 내려주는데, 우리 검증기가 그걸 처리할 방법이 없어 예전엔
 * "서명 검증 없이 통과"라는 실제 보안 구멍이 있었고, 그걸 막으면서 소셜
 * 로그인 자체가 아무 보호된 API도 못 쓰는 상태로 남아 있었다(2026-09-17
 * 실측: auth.users 에는 구글 로그인 기록이 있는데 대응하는 public.User 행이
 * 없었다). 이 파일이 그 자리를 제대로 채운다 — Supabase 프로젝트 자신의
 * JWKS 엔드포인트로 서명을 검증한다.
 */

export interface SupabaseTokenPayload {
  /** Supabase auth.users.id. 우리 자체 public.User.id 와는 별개의 값이다. */
  sub: string;
  email?: string;
  name?: string;
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (jwks) return jwks;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL 이 설정되지 않았습니다.");
  }
  // jose 가 내부적으로 키를 캐시하고 kid 로테이션 시 자동으로 다시 받아온다.
  jwks = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));
  return jwks;
}

/**
 * 서명 검증 없이 페이로드만 들여다본다. 이 토큰을 어느 경로(우리 자체 HMAC
 * vs Supabase JWKS)로 검증해야 할지 고르는 데만 쓴다 — 신뢰 판단에는
 * 절대 쓰지 않는다.
 */
export function peekIssuer(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
    return typeof payload?.iss === "string" ? payload.iss : null;
  } catch {
    return null;
  }
}

/**
 * Supabase 발급 JWT의 서명·만료·발급자를 검증한다.
 * 성공하면 Supabase 쪽 신원(sub=auth.users.id, email)을 돌려준다.
 */
export async function verifySupabaseToken(
  token: string
): Promise<{ valid: true; payload: SupabaseTokenPayload } | { valid: false; reason: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return { valid: false, reason: "Supabase 설정이 없습니다." };
  }

  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: `${supabaseUrl}/auth/v1`,
      audience: "authenticated",
    });
    if (typeof payload.sub !== "string" || !payload.sub) {
      return { valid: false, reason: "토큰에 sub 클레임이 없습니다." };
    }
    const email = typeof payload.email === "string" ? payload.email : undefined;
    const name =
      typeof (payload as any).user_metadata?.full_name === "string"
        ? (payload as any).user_metadata.full_name
        : typeof (payload as any).user_metadata?.name === "string"
        ? (payload as any).user_metadata.name
        : undefined;
    return { valid: true, payload: { sub: payload.sub, email, name } };
  } catch (err: any) {
    return { valid: false, reason: err?.code || err?.message || "Supabase 토큰 검증 실패" };
  }
}
