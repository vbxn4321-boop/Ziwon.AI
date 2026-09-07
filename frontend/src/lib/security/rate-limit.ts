/**
 * 요청 빈도 제한 (고정 윈도우).
 *
 * 한계를 먼저 밝힙니다: 이 카운터는 프로세스 메모리에 있습니다. Vercel 서버리스에서는
 * 인스턴스가 여러 개 뜨므로 실제 허용량이 (설정값 × 인스턴스 수)까지 늘어날 수 있고,
 * 콜드 스타트마다 초기화됩니다. 즉 **정밀한 쿼터가 아니라 남용 억제 장치**입니다.
 *
 * 그럼에도 지금 넣는 이유는, 인증 없이 열려 있던 Gemini 호출 라우트에 대해
 * "무제한"과 "느슨한 제한"의 차이가 비용 측면에서 크기 때문입니다.
 * 정확한 분산 쿼터가 필요해지면 백엔드에 이미 있는 Redis(또는 Upstash)로 옮기면 됩니다.
 */

import { NextRequest, NextResponse } from "next/server";

export interface RateLimitRule {
  /** 윈도우당 허용 요청 수 */
  limit: number;
  /** 윈도우 길이(ms) */
  windowMs: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** 만료된 버킷을 정리합니다. Map 이 무한히 커지는 것을 막습니다. */
function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

export function checkRateLimit(key: string, rule: RateLimitRule): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + rule.windowMs });
    return { allowed: true, remaining: rule.limit - 1, retryAfterSec: 0 };
  }

  existing.count += 1;
  if (existing.count > rule.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  return {
    allowed: true,
    remaining: rule.limit - existing.count,
    retryAfterSec: 0,
  };
}

/**
 * 클라이언트 IP 추정. 프록시 뒤에 있으므로 x-forwarded-for 의 첫 항목을 씁니다.
 * 헤더는 위조 가능하지만, 위조하려면 매 요청 IP를 바꿔야 하므로 억제 효과는 남습니다.
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export function rateLimitResponse(retryAfterSec: number): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: `요청이 너무 잦습니다. ${retryAfterSec}초 후에 다시 시도해주세요.`,
    },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
  );
}
