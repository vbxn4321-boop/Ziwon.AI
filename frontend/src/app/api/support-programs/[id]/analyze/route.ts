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

    // Structure source details cleanly based on platform (K-Startup vs Bizinfo)
    let structuredSourceText = "";
    for (const s of program.sources) {
      if (s.sourceType === "K_STARTUP") {
        try {
          const raw = typeof s.rawData === "string" ? JSON.parse(s.rawData) : s.rawData;
          structuredSourceText += `
[출처: K-Startup(창업진흥원) 공고 원문 정보]
- 플랫폼: K-Startup (창업지원포털)
- 사업명/공고명: ${raw.biz_pbanc_nm || raw.intg_pbanc_biz_nm || raw.공고명 || program.title}
- 지원분야: ${raw.supt_biz_clsfc || raw.지원분야 || program.category}
- 창업업력(핵심 지원자격): ${raw.biz_enyy || raw.창업업력 || "전체 / 공고문 참조"}
- 대상연령: ${raw.aply_trgt_age || raw.대상연령 || "전체"}
- 소관기관: ${raw.pbanc_ntrp_nm || raw.소관기관 || program.organizer}
- 수행기관: ${raw.exct_istt_nm || raw.수행기관 || program.executingAgency || "창업진흥원"}
- 기관구분: ${raw.istt_clsfc_nm || "공공기관"}
- 신청기간: ${raw.pbanc_rcpt_bgng_dt || ""} ~ ${raw.pbanc_rcpt_end_dt || ""}
- 신청방법 및 온라인접수처: ${raw.aply_mthd_onli_rcpt_istc || raw.detl_pg_url || "온라인 접수"}
- 신청대상(상세): ${raw.aply_trgt_ctnt || raw.지원대상 || ""}
- 제외대상(결격요건): ${raw.excl_trgt_ctnt || raw.제외대상 || "공고문 참조"}
- 선정절차 및 평가방법: ${raw.slctn_mthd_ctnt || raw.선정절차 || "공고문 참조"}
- 문의처/담당자 연락처: ${raw.tel_no || raw.cntct_no || "공고문 참조"}
- 원문 상세URL: ${raw.detl_pg_url || s.sourceUrl}
`;
        } catch {
          structuredSourceText += `\n[출처: K-Startup]\n${s.rawData}\n`;
        }
      } else {
        // Bizinfo / 기업마당
        try {
          const raw = typeof s.rawData === "string" ? JSON.parse(s.rawData) : s.rawData;
          structuredSourceText += `
[출처: 기업마당(Bizinfo) 공고 원문 정보]
- 플랫폼: 기업마당 (중소벤처기업부)
- 사업명: ${raw.pblancNm || program.title}
- 지원분야: ${raw.pblancPldirNm || raw.pldirSportRealmMlsfcCodeNm || program.category}
- 지원대상(기업규모/업종): ${raw.trgetNm || raw.hashtags || program.targetDescription}
- 소관기관: ${raw.jnsmAgencyNm || raw.jrsdInsttNm || program.organizer}
- 수행기관: ${raw.excInsttNm || raw.refrncNm || program.executingAgency || ""}
- 신청기간: ${raw.reqstBeginEndDe || ""}
- 공고 상세내용(사업개요/지원내용/신청방법):
${raw.pblancCn || ""}
- 원문 상세URL: ${raw.pblancUrl || s.sourceUrl}
`;
        } catch {
          structuredSourceText += `\n[출처: 기업마당]\n${s.rawData}\n`;
        }
      }
    }

    const documentTexts = docs
      .map((d) => (d.extractedText && d.extractedText.length > 20 ? `[첨부파일명: ${d.fileName}]\n${d.extractedText}` : ""))
      .filter(Boolean)
      .join("\n\n");

    const textToAnalyze = `
[통합 지원사업 기본 정보]
- 사업명: ${program.title}
- 주관기관: ${program.organizer}
- 수행기관: ${program.executingAgency || "미정/공고문 참조"}
- 지원분야: ${program.category}
- 지원지역: ${program.region}
- 지원대상 요약: ${program.targetDescription || "공고문 참조"}
- 지원규모/금액: ${program.budget || "공고문 참조"}
- 신청 기간: ${program.startDate ? program.startDate.toISOString().split("T")[0] : "상시"} ~ ${program.endDate ? program.endDate.toISOString().split("T")[0] : "상시"}

${structuredSourceText}

[첨부파일 원문 텍스트 (공고문 전문/서식)]
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
