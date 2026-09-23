import { PrismaClient } from "@prisma/client";
import { parseHwpWithDetails, sanitizeUtf8 } from "../src/lib/parser/document-parser";

const prisma = new PrismaClient();

interface ReprocessOptions {
  sampleSize?: number;
  dryRun?: boolean;
}

export async function reprocessHwpBatch(options: ReprocessOptions = {}) {
  const { sampleSize = 50, dryRun = true } = options;

  console.log(`=== HWP 재처리 배치 (${dryRun ? "시험 실행 / DRY RUN" : "실제 반영 / DB UPDATE"}) ===`);

  const pendingDocs = await prisma.supportDocument.findMany({
    where: {
      status: "PENDING",
      OR: [
        { fileType: { contains: "hwp", mode: "insensitive" } },
        { fileUrl: { contains: ".hwp", mode: "insensitive" } },
        { fileName: { contains: ".hwp", mode: "insensitive" } },
      ],
    },
    take: sampleSize,
    select: {
      id: true,
      fileName: true,
      fileUrl: true,
      entryPath: true,
      fileType: true,
    },
  });

  console.log(`대상 PENDING HWP 문서: ${pendingDocs.length}건`);

  let successCount = 0;
  let failCount = 0;
  let htmlSkipCount = 0;
  let encryptedCount = 0;
  let distributionCount = 0;

  for (let idx = 0; idx < pendingDocs.length; idx++) {
    const doc = pendingDocs[idx];
    const prefix = `[${idx + 1}/${pendingDocs.length}] ${doc.fileName}`;

    try {
      const res = await fetch(doc.fileUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Referer: "https://www.bizinfo.go.kr",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        console.log(`${prefix} -> HTTP ${res.status}`);
        failCount++;
        continue;
      }

      const buf = Buffer.from(await res.arrayBuffer());
      const headerSample = buf.subarray(0, 100).toString("utf-8").toLowerCase();
      if (headerSample.includes("<html") || headerSample.includes("<!doctype")) {
        // Not a direct file, it's a detail page URL
        htmlSkipCount++;
        continue;
      }

      const parseRes = parseHwpWithDetails(buf);
      if (parseRes.status === "ENCRYPTED") encryptedCount++;
      if (parseRes.status === "DISTRIBUTION") distributionCount++;

      if (parseRes.text && parseRes.text.length > 20) {
        successCount++;
        console.log(`${prefix} -> ✅ 파싱 성공 (${parseRes.text.length}자, status: ${parseRes.status})`);

        if (!dryRun) {
          await prisma.supportDocument.update({
            where: { id: doc.id },
            data: {
              status: "PARSED",
              extractedText: sanitizeUtf8(parseRes.text),
            },
          });
        }
      } else {
        failCount++;
        console.log(`${prefix} -> ⚠️ 텍스트 없음 (status: ${parseRes.status})`);
      }
    } catch (err: any) {
      failCount++;
      console.log(`${prefix} -> ❌ 에러: ${err.message}`);
    }
  }

  console.log(`\n--- 재처리 결과 요약 ---`);
  console.log(`시도 건수: ${pendingDocs.length}`);
  console.log(`다운로드 가능한 바이너리 성공: ${successCount}건`);
  console.log(`상세페이지(HTML) URL로 다운로드 불가: ${htmlSkipCount}건`);
  console.log(`암호화 문서: ${encryptedCount}건`);
  console.log(`배포용 DRM 문서: ${distributionCount}건`);
  console.log(`기타 실패: ${failCount}건`);
}

async function main() {
  // 기본은 50건 시험 실행(dry-run). 실제 반영하려면 --live, 건수는 --size=200.
  const args = process.argv.slice(2);
  const dryRun = !args.includes("--live");
  const sizeArg = args.find((a) => a.startsWith("--size="));
  const sampleSize = sizeArg ? Number(sizeArg.split("=")[1]) || 50 : 50;

  await reprocessHwpBatch({ sampleSize, dryRun });

  if (dryRun) {
    console.log("\n(시험 실행이라 DB는 그대로입니다. 실제 반영: --live, 건수 조절: --size=200)");
  }
}

if (require.main === module) {
  main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
