import { NextRequest, NextResponse } from "next/server";
import { processPendingDocumentsPipeline } from "@/lib/pipeline/document-processor";
import { verifyAdminRequest } from "@/lib/auth/admin-guard";

export const maxDuration = 15; // Safe maxDuration for Vercel Hobby Tier

export async function POST(req: NextRequest) {
  try {
    // 첨부파일 스크래핑 + AI 분석을 돌리는 배치 트리거입니다.
    // 클라이언트 호출부가 없는 운영용 엔드포인트라 관리자/크론으로 제한합니다.
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) return auth.response;

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
