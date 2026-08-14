import { prisma } from "@/lib/db";
import { extractTextFromUrl } from "@/lib/parser/document-parser";
import { chunkDocumentText } from "@/lib/parser/chunker";
import { analyzeProgramWithGemini } from "@/lib/ai/gemini-analyzer";

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

  const pendingDocs = await prisma.supportDocument.findMany({
    where: { status: "PENDING" },
    include: {
      supportProgram: true,
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
      // 1. Extract plain text from file URL or fallback to raw title/target text if download is not accessible
      let extractedText = await extractTextFromUrl(doc.fileUrl, doc.fileType);

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

      // 2. Save extracted text & update status to PARSED
      await prisma.supportDocument.update({
        where: { id: doc.id },
        data: {
          extractedText,
          status: "PARSED",
        },
      });

      // 3. Perform RAG Chunking
      const chunks = chunkDocumentText(extractedText, 1000, 150);
      if (chunks.length > 0) {
        // Clear old chunks if re-processing
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

      // 4. Perform Gemini AI Structured Analysis
      const aiAnalysisResult = await analyzeProgramWithGemini(
        doc.supportProgram.title,
        doc.supportProgram.organizer,
        extractedText
      );

      // Save Analysis to DB
      await prisma.supportAnalysis.create({
        data: {
          supportProgramId: doc.supportProgramId,
          model: process.env.AI_GENERAL_MODEL || "gemini-3.6-flash",
          promptVersion: "v1.0",
          status: "COMPLETED",
          resultJson: JSON.stringify(aiAnalysisResult),
        },
      });

      report.successCount++;
      report.details.push({
        documentId: doc.id,
        fileName: doc.fileName,
        status: "PARSED",
        textLength: extractedText.length,
        chunkCount: chunks.length,
        aiAnalyzed: true,
      });

      console.log(`✅ Successfully processed ${doc.fileName} (${chunks.length} chunks, AI Analysis Completed)`);
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
