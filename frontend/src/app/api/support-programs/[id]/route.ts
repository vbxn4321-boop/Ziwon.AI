import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { scrapeMissingAttachments } from "@/lib/parser/attachment-scraper";

export const maxDuration = 60; // 60s max execution time for scraping and syncing attachments

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let program = await prisma.supportProgram.findUnique({
      where: { id },
      include: {
        sources: true,
        documents: {
          include: {
            chunks: true,
          },
        },
        analyses: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!program) {
      return NextResponse.json(
        { success: false, error: "Support program not found" },
        { status: 404 }
      );
    }

    const forceRefresh = req.nextUrl.searchParams.get("refresh") === "true";

    // Check if notice already has documents or has already been checked/enriched
    const alreadyEnriched = program.sources.some(
      (s) =>
        s.rawData &&
        (s.rawData.includes("신청방법") ||
          s.rawData.includes("지원내용") ||
          s.rawData.includes("공고소개") ||
          s.rawData.includes("문의처"))
    );

    // Auto-resolve real binary attachment links if missing and never checked, or having legacy corrupted text
    const needsScraping =
      forceRefresh ||
      (program.documents.length === 0 && !alreadyEnriched) ||
      program.documents.some(
        (d) =>
          d.fileType !== "NOTICE_ONLY" &&
          (d.fileUrl.includes("selectSIIA200Detail") ||
            d.fileUrl.includes("bizpbanc-ongoing.do") ||
            (d.extractedText && d.extractedText.includes("html lang style")) ||
            (d.extractedText && d.extractedText.includes(".basic-btn")))
      );

    if (needsScraping && program.sources.length > 0) {
      try {
        const sourceUrl = program.sources[0].sourceUrl;
        await scrapeMissingAttachments(program.id, sourceUrl);
        program = await prisma.supportProgram.findUnique({
          where: { id },
          include: {
            sources: true,
            documents: {
              include: {
                chunks: true,
              },
            },
            analyses: {
              orderBy: { createdAt: "desc" },
            },
          },
        });
      } catch (err: any) {
        console.warn("[Program Details API] Auto-scrape attachments fallback:", err.message);
      }
    }

    return NextResponse.json({
      success: true,
      data: program,
    });
  } catch (error) {
    console.error("API /api/support-programs/[id] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch support program details" },
      { status: 500 }
    );
  }
}
