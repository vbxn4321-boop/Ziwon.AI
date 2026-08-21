import { NextRequest, NextResponse } from "next/server";
import { triggerBackendCrawler } from "@/lib/backend-client";
import { runIngestionPipeline } from "@/lib/crawler/collector";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (
      process.env.NODE_ENV === "production" &&
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized Cron Trigger" }, { status: 401 });
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
