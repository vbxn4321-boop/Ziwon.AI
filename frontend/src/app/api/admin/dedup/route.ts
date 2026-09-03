import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest, logAdminAction } from "@/lib/auth/admin-guard";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export async function GET(req: NextRequest) {
  try {
    // [보안 1순위] 최고 관리자 검증
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) return auth.response;

    const res = await fetch(`${BACKEND_URL}/api/v1/admin/dedup/candidates`, {
      cache: "no-store",
    });
    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ success: false, error: err }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch dedup candidates" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // [보안 1순위] 최고 관리자 검증
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) return auth.response;

    const res = await fetch(`${BACKEND_URL}/api/v1/admin/dedup/merge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ success: false, error: err }, { status: res.status });
    }
    const data = await res.json();

    // [감사 로그] 최고 관리자 활동 기록
    await logAdminAction(
      auth.user.email,
      "DEDUP_MERGE",
      data.data?.mergedCount || 0,
      `중복 공고 일괄 통합 실행 (통합: ${data.data?.mergedCount || 0}건)`
    );

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute dedup merge" },
      { status: 500 }
    );
  }
}
