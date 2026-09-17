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
 *   Supabase JWT 는 JWT_SECRET 이 아니라 Supabase 프로젝트 키로 서명되므로
 *   여기서는 검증할 수 없고, 검증 없이 통과시키는 것은 곧 인증 우회입니다.
 *   따라서 현재는 명시적으로 거부합니다. 소셜 로그인 사용자에게 보호된 API를
 *   열어주려면 JWKS 기반 검증(jose + <project>.supabase.co/auth/v1/.well-known/jwks.json)
 *   또는 SUPABASE_JWT_SECRET 기반 HS256 검증을 별도로 추가해야 합니다.
 */

import crypto from "crypto";
import type { NextRequest } from "next/server";

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

/**
 * Access Token 을 검증합니다. 서명·만료·토큰 종류를 모두 확인합니다.
 */
export function verifyAccessToken(token: string): VerifyResult {
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
export function requireUser(
  req: NextRequest
): { ok: true; user: AccessTokenPayload } | { ok: false; reason: string } {
  const token = extractBearerToken(req);
  if (!token) return { ok: false, reason: "로그인이 필요합니다." };
  const result = verifyAccessToken(token);
  if (!result.valid) return { ok: false, reason: `유효하지 않은 인증 토큰입니다. (${result.reason})` };
  return { ok: true, user: result.payload };
}

export function getOptionalUser(req: NextRequest): AccessTokenPayload | null {
  const token = extractBearerToken(req);
  if (!token) return null;
  const result = verifyAccessToken(token);
  return result.valid ? result.payload : null;
}
