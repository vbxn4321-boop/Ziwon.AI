import { NextRequest, NextResponse } from "next/server";
import { processPendingDocumentsPipeline } from "@/lib/pipeline/document-processor";

export const maxDuration = 60; // Max execution time for Vercel Serverless Function

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "5");

    console.log(`📡 [API Trigger] Processing Pending Documents (Limit: ${limit})...`);
    const report = await processPendingDocumentsPipeline(limit);

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error("API /api/pipeline/process-documents Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process documents" },
      { status: 500 }
    );
  }
}
