import { NextRequest, NextResponse } from "next/server";
import { runIngestionPipeline } from "@/lib/crawler/collector";

export const maxDuration = 60; // Max execution time for Vercel Serverless Function

export async function GET(req: NextRequest) {
  try {
    // 1. Verify Vercel Cron Authorization Secret in Production
    const authHeader = req.headers.get("authorization");
    if (
      process.env.NODE_ENV === "production" &&
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized Cron Trigger" }, { status: 401 });
    }

    console.log("⏰ [Vercel Cron Engine] Triggering Automated Ingestion Pipeline...");

    // 2. Run ingestion pipeline (fetch latest notices from Bizinfo & K-Startup APIs)
    const newCount = await runIngestionPipeline(0);

    return NextResponse.json({
      success: true,
      message: "Automated ingestion pipeline completed successfully",
      newNoticesIngested: newCount,
      executedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("❌ [Vercel Cron Engine] Ingestion Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Cron ingestion failed" },
      { status: 500 }
    );
  }
}
