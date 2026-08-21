import { prisma } from "@/lib/db";
import { RawNoticeItem, fetchBizinfoNotices } from "./bizinfo";
import { fetchKStartupNotices } from "./kstartup";
import { randomUUID } from "crypto";

export async function runIngestionPipeline(limitPerSource = 0) {
  console.log(`Starting Ultra-Fast Batch Ingestion Pipeline (Limit: ${limitPerSource})...`);

  const bizNotices = await fetchBizinfoNotices(limitPerSource);
  const kstNotices = await fetchKStartupNotices(limitPerSource);
  const allRawNotices = [...bizNotices, ...kstNotices];

  if (allRawNotices.length === 0) {
    console.log("No notices fetched from APIs.");
    return 0;
  }

  // 1. Fetch existing external IDs to avoid duplicates
  const existingSourcesList = await prisma.supportSource.findMany({ select: { externalId: true } });
  const existingSourceIds = new Set(existingSourcesList.map((s) => s.externalId));

  const newNotices = allRawNotices.filter((n) => !existingSourceIds.has(n.externalId));
  console.log(`[Batch Ingestion] Processing ${newNotices.length} new unique notices into Supabase...`);

  if (newNotices.length === 0) {
    console.log("All notices are already up-to-date in Supabase.");
    return 0;
  }

  const programBatch: any[] = [];
  const sourceBatch: any[] = [];
  const documentBatch: any[] = [];

  for (const notice of newNotices) {
    const programId = randomUUID();

    programBatch.push({
      id: programId,
      title: notice.title,
      organizer: notice.organizer,
      executingAgency: notice.executingAgency || null,
      category: notice.category,
      region: notice.region,
      targetDescription: notice.targetDescription || null,
      startDate: notice.startDate || null,
      endDate: notice.endDate || null,
      budget: notice.budget || null,
      officialNoticeNo: notice.officialNoticeNo || null,
      duplicateStatus: "UNIQUE",
    });

    sourceBatch.push({
      id: randomUUID(),
      supportProgramId: programId,
      sourceType: notice.sourceType,
      externalId: notice.externalId,
      sourceUrl: notice.sourceUrl,
      rawTitle: notice.title,
      rawData: notice.rawData,
    });

    if (notice.attachments && notice.attachments.length > 0) {
      for (const att of notice.attachments) {
        documentBatch.push({
          id: randomUUID(),
          supportProgramId: programId,
          fileName: att.fileName,
          fileUrl: att.fileUrl,
          fileType: att.fileType,
          status: "PENDING",
        });
      }
    }
  }

  // Execute bulk createMany in chunks of 500 items for 2-second completion
  const chunkSize = 500;
  for (let i = 0; i < programBatch.length; i += chunkSize) {
    const progChunk = programBatch.slice(i, i + chunkSize);
    const srcChunk = sourceBatch.slice(i, i + chunkSize);
    const docChunk = documentBatch.filter((d) =>
      progChunk.some((p) => p.id === d.supportProgramId)
    );

    console.log(`[Supabase Batch] Inserting chunk ${Math.floor(i / chunkSize) + 1} (${progChunk.length} programs)...`);
    await prisma.supportProgram.createMany({ data: progChunk });
    await prisma.supportSource.createMany({ data: srcChunk });
    if (docChunk.length > 0) {
      await prisma.supportDocument.createMany({ data: docChunk });
    }
  }

  await prisma.crawlLog.create({
    data: {
      sourceType: "ALL_COLLECTOR",
      status: "SUCCESS",
      itemCount: newNotices.length,
    },
  });

  console.log(`🎉 Ultra-Fast Batch Ingestion Completed! Ingested ${newNotices.length} notices into Supabase.`);
  return newNotices.length;
}
