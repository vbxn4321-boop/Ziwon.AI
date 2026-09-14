import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const maxDuration = 60;
type RouteContext = { params: Promise<{ id: string }> };

const summaryInclude = {
  sources: {
    select: { id: true, sourceType: true, externalId: true, sourceUrl: true, rawTitle: true, createdAt: true },
  },
} as const;

const detailInclude = {
  sources: true,
  documents: true,
  analyses: { orderBy: { createdAt: "desc" }, take: 1 },
} as const;

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const started = performance.now();
    const program = await prisma.supportProgram.findUnique({
      where: { id },
      include: req.nextUrl.searchParams.get("view") === "summary" ? summaryInclude : detailInclude,
    });
    if (!program) {
      return NextResponse.json({ success: false, error: "Support program not found" }, { status: 404 });
    }
    // Reads never wait for external sites, downloads, or parsing.
    return NextResponse.json({ success: true, data: program }, {
      headers: {
        "Server-Timing": "db;dur=" + (performance.now() - started).toFixed(1),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Program detail read failed:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch support program details" }, { status: 500 });
  }
}

export async function POST(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const program = await prisma.supportProgram.findUnique({
      where: { id },
      select: { id: true, sources: { select: { sourceUrl: true }, take: 1 } },
    });
    if (!program) {
      return NextResponse.json({ success: false, error: "Support program not found" }, { status: 404 });
    }
    if (program.sources.length === 0) {
      return NextResponse.json({ success: false, error: "동기화할 원문 주소가 없습니다." }, { status: 422 });
    }
    // Parser dependencies are loaded only for an explicit synchronization.
    const { scrapeMissingAttachments } = await import("@/lib/parser/attachment-scraper");
    await scrapeMissingAttachments(program.id, program.sources[0].sourceUrl);
    const updated = await prisma.supportProgram.findUnique({ where: { id }, include: detailInclude });
    if (!updated) {
      return NextResponse.json({ success: false, error: "Support program not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Program attachment synchronization failed:", error);
    return NextResponse.json({ success: false, error: "첨부 문서를 동기화하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
