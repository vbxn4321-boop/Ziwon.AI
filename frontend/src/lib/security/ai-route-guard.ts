/**
 * Gemini 를 호출하는 라우트 공용 가드.
 *
 * 정책: PSST 생성기는 현재 비로그인으로도 쓸 수 있는 체험 기능입니다
 * (consultant 페이지와 PsstPlanGenerator 에 로그인 게이트가 없습니다).
 * 그래서 로그인을 강제하지 않고, 대신 비로그인은 IP 기준으로 빡빡하게,
 * 로그인 사용자는 계정 기준으로 넉넉하게 허용합니다.
 *
 * 로그인 필수로 바꾸려면 guardAiRoute 에 requireLogin: true 만 넘기면 됩니다.
 */

import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/auth/verify-token";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
  type RateLimitRule,
} from "@/lib/security/rate-limit";

const TEN_MINUTES = 10 * 60 * 1000;

/** 문서 생성처럼 토큰을 많이 쓰는 호출 */
export const HEAVY_LIMITS = {
  anon: { limit: 5, windowMs: TEN_MINUTES } satisfies RateLimitRule,
  user: { limit: 40, windowMs: TEN_MINUTES } satisfies RateLimitRule,
};

/** 채팅·매칭처럼 상대적으로 가벼운 호출 */
export const LIGHT_LIMITS = {
  anon: { limit: 20, windowMs: TEN_MINUTES } satisfies RateLimitRule,
  user: { limit: 120, windowMs: TEN_MINUTES } satisfies RateLimitRule,
};

export interface AiGuardOptions {
  anon: RateLimitRule;
  user: RateLimitRule;
  /** true 면 비로그인 요청을 401 로 거부합니다. */
  requireLogin?: boolean;
}

/**
 * 통과하면 null, 막아야 하면 그대로 반환할 NextResponse 를 돌려줍니다.
 */
export async function guardAiRoute(
  req: NextRequest,
  routeName: string,
  options: AiGuardOptions
): Promise<NextResponse | null> {
  const user = await getOptionalUser(req);

  if (!user && options.requireLogin) {
    return NextResponse.json(
      { success: false, error: "로그인이 필요한 기능입니다." },
      { status: 401 }
    );
  }

  const rule = user ? options.user : options.anon;
  const identity = user ? `u:${user.sub}` : `ip:${getClientIp(req)}`;
  const result = checkRateLimit(`${routeName}:${identity}`, rule);

  if (!result.allowed) {
    console.warn(`[RateLimit] ${routeName} 차단: ${identity} (${result.retryAfterSec}s)`);
    return rateLimitResponse(result.retryAfterSec);
  }

  return null;
}
