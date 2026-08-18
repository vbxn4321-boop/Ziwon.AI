import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { scrapeMissingAttachments } from "@/lib/parser/attachment-scraper";

export const maxDuration = 30;

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

    // Auto-resolve real binary attachment links if missing or pointing to webpage URL
    const needsScraping =
      program.documents.length === 0 ||
      program.documents.some((d) => d.fileUrl.includes("selectSIIA200Detail") || d.fileUrl.includes("k-startup.go.kr"));

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
