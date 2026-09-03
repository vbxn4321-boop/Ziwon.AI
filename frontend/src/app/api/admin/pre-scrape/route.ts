import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { scrapeMissingAttachments } from "@/lib/parser/attachment-scraper";
import { verifyAdminRequest, logAdminAction } from "@/lib/auth/admin-guard";

export const maxDuration = 120; // 2 minutes max for batch run

export async function GET(req: NextRequest) {
  try {
    // [보안] 최고 관리자 검증
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) return auth.response;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Active programs missing attachments
    const pendingPrograms = await prisma.supportProgram.findMany({
      where: {
        OR: [{ endDate: null }, { endDate: { gte: today } }],
        documents: { none: {} },
      },
      include: {
        sources: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      data: {
        queueCount: pendingPrograms.length,
        queue: pendingPrograms.map((p) => ({
          id: p.id,
          title: p.title,
          organizer: p.organizer,
          endDate: p.endDate,
          sourceUrl: p.sources[0]?.sourceUrl || null,
          sourceType: p.sources[0]?.sourceType || "UNKNOWN",
        })),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch pre-scrape queue" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // [보안 1순위] 최고 관리자 검증
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) return auth.response;

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Math.max(Number(body.limit) || 5, 1), 20);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch batch of target programs with sources
    const targetPrograms = await prisma.supportProgram.findMany({
      where: {
        OR: [{ endDate: null }, { endDate: { gte: today } }],
        documents: { none: {} },
        sources: { some: {} },
      },
      include: {
        sources: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    if (targetPrograms.length === 0) {
      return NextResponse.json({
        success: true,
        message: "사전 적재가 필요한 공고가 없습니다. 모든 활성 공고가 이미 처리되었습니다.",
        data: { processedCount: 0, results: [] },
      });
    }

    const results = [];

    for (let i = 0; i < targetPrograms.length; i++) {
      const prog = targetPrograms[i];
      const sourceUrl = prog.sources[0]?.sourceUrl;

      if (!sourceUrl) {
        results.push({
          id: prog.id,
          title: prog.title,
          status: "SKIPPED",
          reason: "No source URL",
          docCount: 0,
        });
        continue;
      }

      try {
        console.log(`[Admin Pre-Scrape]: (${i + 1}/${targetPrograms.length}) Processing '${prog.title}'...`);
        const docs = await scrapeMissingAttachments(prog.id, sourceUrl);
        results.push({
          id: prog.id,
          title: prog.title,
          status: docs.length > 0 ? "SUCCESS" : "NO_ATTACHMENTS_FOUND",
          docCount: docs.length,
          files: docs.map((d) => d.fileName),
        });
      } catch (err: any) {
        console.error(`[Admin Pre-Scrape Error] Failed for ${prog.id}:`, err);
        results.push({
          id: prog.id,
          title: prog.title,
          status: "FAILED",
          error: err.message,
          docCount: 0,
        });
      }

      // Respectful rate limiting: wait 1.5s between notices to protect external servers
      if (i < targetPrograms.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    const successCount = results.filter((r) => r.status === "SUCCESS").length;
    const noDocCount = results.filter((r) => r.status === "NO_ATTACHMENTS_FOUND").length;
    const failedCount = results.filter((r) => r.status === "FAILED" || r.status === "SKIPPED").length;

    let statusDetails = `총 ${targetPrograms.length}건 처리 ➔ ${successCount}건 적재 완료`;
    if (noDocCount > 0) {
      statusDetails += ` (원문에 첨부파일 없음/외부URL 접수: ${noDocCount}건)`;
    }
    if (failedCount > 0) {
      statusDetails += ` (오류: ${failedCount}건)`;
    }

    // [감사 로그] 최고 관리자 활동 기록
    await logAdminAction(auth.user.email, "PRE_SCRAPE", successCount, statusDetails);

    return NextResponse.json({
      success: true,
      message: statusDetails,
      data: {
        processedCount: targetPrograms.length,
        successCount,
        noDocCount,
        failedCount,
        results,
      },
    });
  } catch (error: any) {
    console.error("[Admin Pre-Scrape Batch Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Pre-scrape batch execution failed" },
      { status: 500 }
    );
  }
}
