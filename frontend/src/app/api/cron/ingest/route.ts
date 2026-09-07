import { NextRequest, NextResponse } from "next/server";
import { triggerBackendCrawler } from "@/lib/backend-client";
import { runIngestionPipeline } from "@/lib/crawler/collector";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    // CRON_SECRET 이 설정되지 않으면 조건문 전체가 건너뛰어져 라우트가 무인증으로
    // 열리던 구조였습니다. 프로덕션에서는 시크릿 부재 자체를 실패로 처리합니다.
    if (process.env.NODE_ENV === "production") {
      const cronSecret = process.env.CRON_SECRET;
      if (!cronSecret) {
        console.error("[Cron] CRON_SECRET 이 설정되지 않아 인제스트 트리거를 거부합니다.");
        return NextResponse.json(
          { error: "Cron trigger is not configured" },
          { status: 503 }
        );
      }
      if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized Cron Trigger" }, { status: 401 });
      }
    }

    console.log("⏰ [Ingestion] Triggering Ingestion Pipeline via Python Backend...");

    // 1. Try Python FastAPI Backend first
    try {
      const backendResult = await triggerBackendCrawler(0);
      return NextResponse.json({
        success: true,
        source: "PYTHON_FASTAPI_BACKEND",
        ...backendResult,
      });
    } catch (backendErr: any) {
      console.warn("⚠️ [Ingestion] Python backend unreachable, falling back to Next.js native collector:", backendErr.message);
    }

    // 2. Fallback to native collector
    const newCount = await runIngestionPipeline(0);
    return NextResponse.json({
      success: true,
      source: "NEXTJS_NATIVE_FALLBACK",
      message: "Automated ingestion pipeline completed successfully",
      newNoticesIngested: newCount,
      executedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("❌ [Ingestion Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ingestion failed" },
      { status: 500 }
    );
  }
}
