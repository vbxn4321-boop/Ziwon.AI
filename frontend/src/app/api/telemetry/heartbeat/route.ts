import { NextRequest, NextResponse } from "next/server";
import { recordHeartbeat, getActiveUsersStats } from "@/lib/telemetry/active-user-tracker";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const forwarded = req.headers.get("x-forwarded-for");
    const clientIp =
      (forwarded ? forwarded.split(",")[0].trim() : null) ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    // 2번 하이브리드 세션 통합 정책:
    // - 로그인 회원: "user_${userId}" (어떤 기기나 브라우저에서 접속해도 계정당 1명으로 통합)
    // - 비로그인 방문자: "ip_${clientIp}" (동일 PC에서 크롬, 엣지, 시크릿 창을 여러 개 열어도 IP당 1명으로 통합)
    const userId = body.userId || null;
    const trackingKey = userId ? `user_${userId}` : `ip_${clientIp}`;

    const path = body.path || "/";
    const isUser = !!userId || !!body.isUser;

    recordHeartbeat(trackingKey, path, isUser);

    return NextResponse.json({
      success: true,
      identifier: trackingKey,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  const stats = getActiveUsersStats(90);
  return NextResponse.json({
    success: true,
    data: stats,
  });
}
