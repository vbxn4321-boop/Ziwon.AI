import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { analyzeProgramWithGemini } from "@/lib/ai/gemini-analyzer";
import { scrapeMissingAttachments } from "@/lib/parser/attachment-scraper";

export const maxDuration = 15; // Vercel Hobby Tier safe limit

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

    // 3. Dynamic Scraping: Safe try-catch wrapper to prevent Vercel Serverless timeouts/crashes
    let docs = program.documents;
    if (docs.length === 0 && program.sources.length > 0) {
      try {
        const sourceUrl = program.sources[0].sourceUrl;
        await scrapeMissingAttachments(program.id, sourceUrl);
        docs = await prisma.supportDocument.findMany({
          where: { supportProgramId: program.id },
        });
      } catch (scrapErr: any) {
        console.warn("[Vercel Analyze API] Dynamic scraping fallback:", scrapErr.message);
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

[첨부파일 원문 텍스트]
${documentTexts || "첨부파일 원문 텍스트 없음 (기본 공고 정보 사용)"}
`.trim();

    console.log(`🤖 [On-Demand AI] Triggering Gemini AI for Program: ${program.title}...`);

    // 4. Execute Gemini AI Analysis with fail-safe wrapper
    let aiResult;
    try {
      aiResult = await analyzeProgramWithGemini(
        program.title,
        program.organizer,
        textToAnalyze
      );
    } catch (aiErr: any) {
      console.warn("[Vercel Analyze API] AI Analysis fallback triggered:", aiErr.message);
      aiResult = {
        targetEligibility: { summary: program.targetDescription || "공고문 참조" },
        budgetAndAmount: { summary: program.budget || "공고문 참조" },
        keySchedule: { summary: "공고문 내 접수 일정 확인 필요" },
        extraPoints: { items: [], summary: "공고문 참조" },
        excludedConditions: { items: [], summary: "공고문 참조" },
        requiredDocuments: ["사업신청서 및 사업계획서", "사업자등록증명원"],
        summaryReport: [`${program.title} 공고 파싱 완료.`, "상세 요약은 원문 공고를 확인하세요."],
      };
    }

    // 5. Save/Update Analysis in DB
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
      { success: false, error: error.message || "Failed to run AI analysis", details: String(error) },
      { status: 500 }
    );
  }
}
