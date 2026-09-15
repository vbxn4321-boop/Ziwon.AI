import { prisma } from "@/lib/db";
import { extractTextFromUrl } from "@/lib/parser/document-parser";
import { chunkDocumentText } from "@/lib/parser/chunker";
import { analyzeProgramWithGemini } from "@/lib/ai/gemini-analyzer";
import { scrapeMissingAttachments } from "@/lib/parser/attachment-scraper";

export interface ProcessingReport {
  totalProcessed: number;
  successCount: number;
  failedCount: number;
  details: Array<{
    documentId: string;
    fileName: string;
    status: string;
    textLength: number;
    chunkCount: number;
    aiAnalyzed: boolean;
  }>;
}

/**
 * Run Pipeline for Pending Documents: Text Parsing ➔ RAG Chunking ➔ Gemini AI Analysis
 */
export async function processPendingDocumentsPipeline(limit = 10): Promise<ProcessingReport> {
  console.log(`🚀 Starting Document Processing Pipeline (Max: ${limit} items)...`);

  // 문서 파싱은 끝났지만 공고 단위 AI 분석이 아직 없는 경우도 대상에 포함한다.
  // 기존에는 PENDING만 조회해 PARSED 상태에서 멈춘 공고가 분석 배치에서 누락됐다.
  const pendingDocs = await prisma.supportDocument.findMany({
    where: {
      status: { in: ["PENDING", "PARSED"] },
      supportProgram: {
        analyses: {
          none: { status: "COMPLETED" },
        },
      },
    },
    include: {
      supportProgram: {
        include: {
          sources: true,
        },
      },
    },
    take: limit,
  });

  const report: ProcessingReport = {
    totalProcessed: pendingDocs.length,
    successCount: 0,
    failedCount: 0,
    details: [],
  };

  if (pendingDocs.length === 0) {
    console.log("ℹ️ No PENDING documents found to process.");
    return report;
  }

  for (const doc of pendingDocs) {
    console.log(`\n📄 Processing document: ${doc.fileName} (${doc.fileType}) [ID: ${doc.id}]`);

    try {
      // 1. If fileUrl is pointing to the notice webpage, attempt dynamic scraping for direct binary files
      let extractedText = "";

      if (doc.fileUrl.includes("selectSIIA200Detail") || doc.fileUrl.includes("k-startup.go.kr")) {
        const scraped = await scrapeMissingAttachments(doc.supportProgramId, doc.fileUrl);
        const parsedOne = scraped.find((s) => s.extractedText && s.extractedText.length > 50);
        if (parsedOne && parsedOne.extractedText) {
          extractedText = parsedOne.extractedText;
        }
      }

      // 2. Direct binary download & extraction if not yet extracted
      if (!extractedText || extractedText.length < 50) {
        extractedText = await extractTextFromUrl(doc.fileUrl, doc.fileType, doc.entryPath);
      }

      // 3. Fallback to program summary only if text extraction completely failed
      if (!extractedText || extractedText.length < 30) {
        console.log(`⚠️ Document text extraction empty for ${doc.fileName}. Utilizing program summary text fallback.`);
        extractedText = `
[사업명] ${doc.supportProgram.title}
[주관기관] ${doc.supportProgram.organizer}
[지원분야] ${doc.supportProgram.category}
[지역] ${doc.supportProgram.region}
[지원대상] ${doc.supportProgram.targetDescription || "상세 공고문 참조"}
[지원규모] ${doc.supportProgram.budget || "미정"}
`.trim();
      }

      // 4. Save extracted text & update status to PARSED
      await prisma.supportDocument.update({
        where: { id: doc.id },
        data: {
          extractedText,
          status: "PARSED",
        },
      });

      // 5. Perform RAG Chunking
      const chunks = chunkDocumentText(extractedText, 1000, 150);
      if (chunks.length > 0) {
        await prisma.documentChunk.deleteMany({ where: { documentId: doc.id } });

        await prisma.documentChunk.createMany({
          data: chunks.map((c) => ({
            documentId: doc.id,
            chunkIndex: c.chunkIndex,
            sectionTitle: c.sectionTitle || null,
            content: c.content,
            startOffset: c.startOffset,
            endOffset: c.endOffset,
          })),
        });
      }

      // 6. Perform Gemini AI Structured Analysis
      // 이 루프는 문서 단위로 돈다. 한 공고에 첨부가 여러 개면 같은 공고를 몇 번이고
      // 다시 분석하게 되는데, 분석 결과는 공고 단위라 내용이 같다. 실측으로 공고 48건에
      // 분석 56건(8건 낭비)이 쌓여 있었다. 이미 분석이 있으면 건너뛴다.
      const existingAnalysis = await prisma.supportAnalysis.findFirst({
        where: { supportProgramId: doc.supportProgramId, status: "COMPLETED" },
        select: { id: true },
      });

      if (existingAnalysis) {
        console.log(`⏭️ [AI 분석] '${doc.supportProgram.title}' 은 이미 분석이 있어 건너뜁니다.`);
      } else {
        // 이 공고에 딸린 첨부문서를 모두 넘겨, 공고문 본문만 골라 발췌하게 한다.
        // (문서 하나의 텍스트만 넘기면 그게 빈 양식이나 포스터일 때 분석이 망가진다)
        const siblingDocs = await prisma.supportDocument.findMany({
          where: { supportProgramId: doc.supportProgramId },
          select: { fileName: true, extractedText: true },
        });

        const aiAnalysisResult = await analyzeProgramWithGemini(
          doc.supportProgram.title,
          doc.supportProgram.organizer,
          extractedText,
          siblingDocs
        );

        await prisma.supportAnalysis.create({
          data: {
            supportProgramId: doc.supportProgramId,
            model: process.env.AI_GENERAL_MODEL || "gemini-2.5-flash",
            promptVersion: "v2.0-selective",
            status: "COMPLETED",
            resultJson: JSON.stringify(aiAnalysisResult),
          },
        });
      }

      report.successCount++;
      report.details.push({
        documentId: doc.id,
        fileName: doc.fileName,
        status: "PARSED",
        textLength: extractedText.length,
        chunkCount: chunks.length,
        aiAnalyzed: true,
      });

      console.log(`✅ Successfully processed ${doc.fileName} (${chunks.length} chunks, textLength: ${extractedText.length}, AI Analysis Completed)`);
    } catch (err: any) {
      console.error(`❌ Failed to process document ${doc.id}:`, err.message);
      await prisma.supportDocument.update({
        where: { id: doc.id },
        data: { status: "FAILED" },
      });

      report.failedCount++;
      report.details.push({
        documentId: doc.id,
        fileName: doc.fileName,
        status: "FAILED",
        textLength: 0,
        chunkCount: 0,
        aiAnalyzed: false,
      });
    }
  }

  console.log(`\n🎉 Pipeline Execution Completed! Success: ${report.successCount}, Failed: ${report.failedCount}`);
  return report;
}
