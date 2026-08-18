import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { analyzeProgramWithGemini } from "@/lib/ai/gemini-analyzer";
import { scrapeMissingAttachments } from "@/lib/parser/attachment-scraper";
import { extractTextFromUrl } from "@/lib/parser/document-parser";

export const maxDuration = 60; // Vercel Serverless Function timeout limit

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Safe params resolution for Next.js 15 & Vercel Serverless
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing program ID" }, { status: 400 });
    }

    // 2. Fetch support program, sources, and documents
    const program = await prisma.supportProgram.findUnique({
      where: { id },
      include: {
        sources: true,
        documents: true,
        analyses: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!program) {
      return NextResponse.json({ success: false, error: "Program not found" }, { status: 404 });
    }

    // 3. Dynamic Scraping & Binary Extraction:
    // If documents are missing OR documents have no extracted text / contain webpage URLs, dynamically scrape real binary download links
    let docs = program.documents;
    const needsScraping =
      docs.length === 0 ||
      docs.every((d) => !d.extractedText || d.extractedText.length < 50 || d.fileUrl.includes("selectSIIA200Detail"));

    if (needsScraping && program.sources.length > 0) {
      try {
        const sourceUrl = program.sources[0].sourceUrl;
        console.log(`[Analyze API] Resolving real binary attachments from source: ${sourceUrl}`);
        await scrapeMissingAttachments(program.id, sourceUrl);
        docs = await prisma.supportDocument.findMany({
          where: { supportProgramId: program.id },
        });
      } catch (scrapErr: any) {
        console.warn("[Analyze API] Dynamic scraping fallback:", scrapErr.message);
      }
    }

    // For any remaining pending documents with direct URLs, attempt text extraction
    for (const doc of docs) {
      if (!doc.extractedText || doc.extractedText.length < 50) {
        try {
          const txt = await extractTextFromUrl(doc.fileUrl, doc.fileType);
          if (txt && txt.length > 50) {
            doc.extractedText = txt;
            await prisma.supportDocument.update({
              where: { id: doc.id },
              data: { extractedText: txt, status: "PARSED" },
            });
          }
        } catch (e: any) {
          console.warn(`[Analyze API] Failed to extract text for doc ${doc.id}:`, e.message);
        }
      }
    }

    const sourceDetails = program.sources.map((s) => s.rawData || "").join("\n");
    const documentTexts = docs
      .map((d) => (d.extractedText && d.extractedText.length > 20 ? `[첨부파일명: ${d.fileName}]\n${d.extractedText}` : ""))
      .filter(Boolean)
      .join("\n\n");

    const textToAnalyze = `
[통합 지원사업 공고 정보]
- 사업명: ${program.title}
- 주관기관: ${program.organizer}
- 수행기관: ${program.executingAgency || "미정/공고문 참조"}
- 지원분야: ${program.category}
- 지원지역: ${program.region}
- 지원대상 요약: ${program.targetDescription || "공고문 참조"}
- 지원규모/금액: ${program.budget || "공고문 참조"}
- 신청 기간: ${program.startDate ? program.startDate.toISOString().split("T")[0] : "상시"} ~ ${program.endDate ? program.endDate.toISOString().split("T")[0] : "상시"}

[공공 API 상세 원문]
${sourceDetails}

[첨부파일 원문 텍스트 (공고문 전문)]
${documentTexts || "첨부파일 원문 텍스트 없음 (기본 공고 정보 사용)"}
`.trim();

    console.log(`🤖 [On-Demand AI] Triggering Gemini AI for Program: ${program.title} (Text Length: ${textToAnalyze.length})...`);

    // 4. Execute Gemini AI Analysis
    const aiResult = await analyzeProgramWithGemini(
      program.title,
      program.organizer,
      textToAnalyze
    );

    // 5. Save/Update Analysis in DB (replace older records so the latest is always clean)
    await prisma.supportAnalysis.deleteMany({
      where: { supportProgramId: program.id },
    });

    const newAnalysis = await prisma.supportAnalysis.create({
      data: {
        supportProgramId: program.id,
        model: process.env.AI_GENERAL_MODEL || "gemini-3.6-flash",
        promptVersion: "v1.0",
        status: "COMPLETED",
        resultJson: JSON.stringify(aiResult),
      },
    });

    return NextResponse.json({
      success: true,
      analysis: newAnalysis,
      result: aiResult,
    });
  } catch (error: any) {
    console.error("API /api/support-programs/[id]/analyze Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "AI 분석 서버와의 통신에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      },
      { status: 500 }
    );
  }
}
