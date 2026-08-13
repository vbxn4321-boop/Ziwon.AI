import { prisma } from "@/lib/db";
import { RawNoticeItem, fetchBizinfoNotices } from "./bizinfo";
import { fetchKStartupNotices } from "./kstartup";

/**
 * Multi-Factor Duplicate Score Calculator
 * Evaluates similarity between incoming raw notice and existing SupportProgram
 */
export function calculateDuplicateScore(
  incoming: RawNoticeItem,
  existing: { title: string; organizer: string; officialNoticeNo?: string | null }
): number {
  let score = 0;

  // 1. Title Similarity (0 ~ 50 pts)
  const normA = incoming.title.replace(/\s+/g, "").toLowerCase();
  const normB = existing.title.replace(/\s+/g, "").toLowerCase();
  if (normA === normB) {
    score += 50;
  } else if (normA.includes(normB) || normB.includes(normA)) {
    score += 35;
  } else {
    // Basic Jaccard word intersection
    const setA = new Set(incoming.title.split(" "));
    const setB = new Set(existing.title.split(" "));
    const intersection = new Set([...setA].filter((x) => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    const jaccard = union.size > 0 ? intersection.size / union.size : 0;
    score += Math.round(jaccard * 50);
  }

  // 2. Organizer Match (0 ~ 20 pts)
  if (incoming.organizer && existing.organizer) {
    if (incoming.organizer.trim() === existing.organizer.trim()) {
      score += 20;
    } else if (
      incoming.organizer.includes(existing.organizer) ||
      existing.organizer.includes(incoming.organizer)
    ) {
      score += 10;
    }
  }

  // 3. Official Notice Number Exact Match (0 ~ 30 pts)
  if (
    incoming.officialNoticeNo &&
    existing.officialNoticeNo &&
    incoming.officialNoticeNo === existing.officialNoticeNo
  ) {
    score += 30;
  }

  return Math.min(100, score);
}

export async function runIngestionPipeline(limitPerSource = 5) {
  console.log(`Starting Data Ingestion Pipeline (Limit: ${limitPerSource} per source)...`);

  const bizNotices = await fetchBizinfoNotices(limitPerSource);
  const kstNotices = await fetchKStartupNotices(limitPerSource);

  const allRawNotices = [...bizNotices, ...kstNotices];
  let ingestedCount = 0;

  for (const notice of allRawNotices) {
    try {
      // 1. Check existing sources first
      const existingSource = await prisma.supportSource.findFirst({
        where: { externalId: notice.externalId },
      });

      if (existingSource) {
        console.log(`Notice [${notice.externalId}] already exists. Skipping.`);
        continue;
      }

      // 2. Find potential duplicate candidates in SupportProgram
      const existingPrograms = await prisma.supportProgram.findMany({
        select: { id: true, title: true, organizer: true, officialNoticeNo: true },
      });

      let matchedProgramId: string | null = null;
      let highestScore = 0;

      for (const prog of existingPrograms) {
        const dupScore = calculateDuplicateScore(notice, prog);
        if (dupScore > highestScore) {
          highestScore = dupScore;
          if (dupScore >= 90) {
            matchedProgramId = prog.id;
          }
        }
      }

      let programId: string;

      if (matchedProgramId && highestScore >= 90) {
        console.log(
          `[DUPLICATE CANDIDATE (${highestScore}pts)] Linking source '${notice.title}' to existing Program [${matchedProgramId}]`
        );
        programId = matchedProgramId;

        // Flag program as MERGE_CANDIDATE for conservative verification
        await prisma.supportProgram.update({
          where: { id: programId },
          data: { duplicateStatus: "MERGE_CANDIDATE" },
        });
      } else {
        // Create new canonical SupportProgram
        const createdProgram = await prisma.supportProgram.create({
          data: {
            title: notice.title,
            organizer: notice.organizer,
            executingAgency: notice.executingAgency,
            category: notice.category,
            region: notice.region,
            targetDescription: notice.targetDescription,
            startDate: notice.startDate,
            endDate: notice.endDate,
            budget: notice.budget,
            officialNoticeNo: notice.officialNoticeNo,
            duplicateStatus: "UNIQUE",
          },
        });
        programId = createdProgram.id;
      }

      // 3. Attach SupportSource record
      await prisma.supportSource.create({
        data: {
          supportProgramId: programId,
          sourceType: notice.sourceType,
          externalId: notice.externalId,
          sourceUrl: notice.sourceUrl,
          rawTitle: notice.title,
          rawData: notice.rawData,
        },
      });

      // 4. Attach SupportDocument records if attachments present
      if (notice.attachments && notice.attachments.length > 0) {
        for (const att of notice.attachments) {
          await prisma.supportDocument.create({
            data: {
              supportProgramId: programId,
              fileName: att.fileName,
              fileUrl: att.fileUrl,
              fileType: att.fileType,
              status: "PENDING",
            },
          });
        }
      }

      ingestedCount++;
    } catch (err) {
      console.error(`Error ingesting notice '${notice.title}':`, err);
    }
  }

  // 5. Log Crawl Result
  await prisma.crawlLog.create({
    data: {
      sourceType: "ALL_COLLECTOR",
      status: "SUCCESS",
      itemCount: ingestedCount,
    },
  });

  console.log(`Ingestion Pipeline Completed. Ingested ${ingestedCount} new notices.`);
  return ingestedCount;
}
