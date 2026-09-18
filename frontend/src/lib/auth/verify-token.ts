/**
 * 1차 발급(Next.js) Access Token 검증기.
 *
 * 기존 구현들이 공통으로 가지고 있던 문제를 여기서 한 번에 정리합니다:
 *   1. 서명이 틀려도 "Supabase 토큰인 척하면" 통과시키던 폴백 → 제거
 *   2. 문자열 !== 비교(타이밍 노출) → 길이 확인 후 timingSafeEqual
 *   3. exp 미검증 경로 존재 → 항상 검증
 *   4. type 클레임 미검증 → refresh 토큰이 access 토큰으로 통과하던 문제 차단
 *
 * Supabase OAuth 토큰(Google/Kakao 소셜 로그인)에 대해:
 *   Supabase JWT 는 JWT_SECRET 이 아니라 Supabase 프로젝트 자신의 키(이 프로젝트는
 *   ES256 비대칭키)로 서명되므로, 우리 자체 HMAC 검증으로는 볼 수 없다. 예전엔
 *   이걸 서명 검증 없이 통과시키던 실제 보안 구멍이 있었고, 그걸 막은 뒤로는
 *   소셜 로그인 자체가 보호된 API를 하나도 못 쓰는 상태로 방치돼 있었다
 *   (2026-09-17 실측: 구글로 로그인한 계정이 auth.users 에는 있는데 대응하는
 *   public.User 행이 없었다 — 로그인은 되는데 아무것도 못 하는 상태).
 *
 *   지금은 토큰의 iss 클레임(서명 검증 전, 판단용으로만 봄)으로 두 경로를
 *   가른다. "/auth/v1" 이 있으면 Supabase JWKS 로, 아니면 우리 자체 HMAC 으로
 *   검증한다. Supabase 쪽이 검증되면 이메일로 우리 public.User 를 찾거나
 *   새로 만들어(findOrCreateUserForSocialLogin) sub 를 우리 쪽 id 로 바꿔치기
 *   한다 — 이 앱의 모든 쿼리가 sub 를 public.User.id 로 가정하고 있어서다.
 */

import crypto from "crypto";
import type { NextRequest } from "next/server";
import { peekIssuer, verifySupabaseToken } from "@/lib/auth/supabase-jwt";
import { findOrCreateUserForSocialLogin } from "@/lib/auth/provision-social-user";

export interface AccessTokenPayload {
  sub: string;
  email?: string;
  name?: string;
  role?: string;
  type?: string;
  exp?: number;
}

export type VerifyResult =
  | { valid: true; payload: AccessTokenPayload }
  | { valid: false; reason: string };

/** 서명 비교. 길이가 다르면 timingSafeEqual 이 RangeError 를 던지므로 먼저 걸러냅니다. */
function signaturesMatch(expected: string, actual: string): boolean {
  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(actual, "utf8");
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

/** 우리 자체 HMAC 서명 토큰 검증. 서명·만료·토큰 종류를 모두 확인합니다. */
function verifyOwnToken(token: string): VerifyResult {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    // 시크릿이 없으면 어떤 토큰도 신뢰할 수 없습니다. 통과시키지 않습니다.
    console.error("[Auth] JWT_SECRET 환경변수가 설정되지 않았습니다.");
    return { valid: false, reason: "서버 인증 설정 오류" };
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return { valid: false, reason: "올바르지 않은 토큰 형식입니다." };
  }

  const [header, payload, signature] = parts;

  const expectedSig = crypto
    .createHmac("sha256", jwtSecret)
    .update(`${header}.${payload}`)
    .digest("base64url");

  if (!signaturesMatch(expectedSig, signature)) {
    return { valid: false, reason: "토큰 서명이 유효하지 않습니다." };
  }

  let data: AccessTokenPayload;
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
  } catch {
    return { valid: false, reason: "토큰 페이로드를 해석할 수 없습니다." };
  }

  if (!data || typeof data.sub !== "string" || !data.sub) {
    return { valid: false, reason: "토큰에 sub 클레임이 없습니다." };
  }

  if (typeof data.exp !== "number" || data.exp < Math.floor(Date.now() / 1000)) {
    return { valid: false, reason: "토큰이 만료되었습니다." };
  }

  // refresh 토큰은 수명이 30일입니다. access 토큰 자리에 쓰이면 안 됩니다.
  if (data.type !== "access") {
    return { valid: false, reason: "access 토큰이 아닙니다." };
  }

  return { valid: true, payload: data };
}

/**
 * Access Token 을 검증합니다. 우리 자체 토큰과 Supabase 소셜 로그인 토큰을
 * 모두 받아들입니다 — 판단 기준은 검증 전에 들여다본 iss 클레임입니다.
 *
 * Supabase 쪽이면 서명 검증 후 이메일로 우리 public.User 를 찾거나 새로
 * 만들어서, 반환하는 payload.sub 는 항상 public.User.id 공간의 값이 되도록
 * 맞춥니다 — 호출부는 두 경로를 구분할 필요가 없습니다.
 */
export async function verifyAccessToken(token: string): Promise<VerifyResult> {
  const issuer = peekIssuer(token);
  if (issuer && issuer.includes("/auth/v1")) {
    const result = await verifySupabaseToken(token);
    if (!result.valid) return result;
    if (!result.payload.email) {
      return { valid: false, reason: "소셜 로그인 토큰에 이메일이 없습니다." };
    }
    const user = await findOrCreateUserForSocialLogin(result.payload.email, result.payload.name);
    return {
      valid: true,
      payload: {
        sub: user.id,
        email: user.email,
        name: user.name || undefined,
        role: user.role,
        type: "access",
      },
    };
  }

  return verifyOwnToken(token);
}

/** Authorization: Bearer <token> 에서 토큰만 꺼냅니다. */
export function extractBearerToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;
  const [scheme, value] = authHeader.split(" ");
  if (!value || scheme.toLowerCase() !== "bearer") return null;
  return value.trim() || null;
}

/**
 * 요청에서 인증된 사용자를 꺼냅니다. 인증되지 않았으면 null.
 * 로그인 필수가 아닌 라우트(비로그인 체험 허용)에서 사용합니다.
 */
/**
 * 로그인이 반드시 필요한 라우트용. 인증되지 않았으면 이유를 함께 돌려줍니다.
 *
 * `getOptionalUser` 는 실패 사유를 버려서 "토큰이 없다"와 "토큰이 만료됐다"를
 * 구분하지 못합니다. 만료는 클라이언트가 조용히 리프레시하면 되는 상황이라
 * 호출부가 구분할 수 있어야 합니다.
 */
export async function requireUser(
  req: NextRequest
): Promise<{ ok: true; user: AccessTokenPayload } | { ok: false; reason: string }> {
  const token = extractBearerToken(req);
  if (!token) return { ok: false, reason: "로그인이 필요합니다." };
  const result = await verifyAccessToken(token);
  if (!result.valid) return { ok: false, reason: `유효하지 않은 인증 토큰입니다. (${result.reason})` };
  return { ok: true, user: result.payload };
}

export async function getOptionalUser(req: NextRequest): Promise<AccessTokenPayload | null> {
  const token = extractBearerToken(req);
  if (!token) return null;
  const result = await verifyAccessToken(token);
  return result.valid ? result.payload : null;
}
