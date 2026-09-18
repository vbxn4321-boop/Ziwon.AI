import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const docs = await prisma.supportDocument.findMany({
    where: {
      OR: [
        { fileType: { contains: "hwp", mode: "insensitive" } },
        { fileUrl: { contains: ".hwp", mode: "insensitive" } },
        { fileName: { contains: ".hwp", mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      status: true,
      extractedText: true,
      fileName: true,
      fileUrl: true,
      entryPath: true,
      fileType: true,
    },
  });

  const hwpDocs = docs.filter((d) => {
    const fn = (d.fileName || "").toLowerCase();
    const url = (d.fileUrl || "").toLowerCase();
    const ep = (d.entryPath || "").toLowerCase();
    const ft = (d.fileType || "").toLowerCase();
    return (
      (fn.endsWith(".hwp") || url.includes(".hwp") || ep.endsWith(".hwp") || ft === "hwp") &&
      !fn.endsWith(".hwpx") &&
      !url.includes(".hwpx") &&
      !ep.endsWith(".hwpx") &&
      ft !== "hwpx"
    );
  });

  console.log("Total HWP Documents:", hwpDocs.length);

  const sample = hwpDocs.slice(0, 5);
  console.log("Sample 5 records:", sample.map(s => ({ id: s.id, status: s.status, hasText: !!(s.extractedText && s.extractedText.length > 0) })));

  const crossTab: Record<string, { hasText: number; empty: number; total: number }> = {};

  for (const doc of hwpDocs) {
    const st = String(doc.status || "NULL").toUpperCase();
    if (!crossTab[st]) crossTab[st] = { hasText: 0, empty: 0, total: 0 };
    const hasText = !!(doc.extractedText && doc.extractedText.trim().length > 0);
    if (hasText) crossTab[st].hasText++;
    else crossTab[st].empty++;
    crossTab[st].total++;
  }

  console.table(crossTab);

  const total = hwpDocs.length;
  const attempted = (crossTab["PARSED"]?.total || 0) + (crossTab["FAILED"]?.total || 0);
  const textCount = Object.values(crossTab).reduce((sum, v) => sum + v.hasText, 0);

  console.log(`\n--- HWP 지표 ---`);
  console.log(`파싱 시도율: ${((attempted / total) * 100).toFixed(2)}% (${attempted}/${total})`);
  console.log(`추출 성공률 (시도 대비): ${attempted > 0 ? (((crossTab["PARSED"]?.hasText || 0) / attempted) * 100).toFixed(2) : 0}% (${crossTab["PARSED"]?.hasText || 0}/${attempted})`);
  console.log(`전체 확보율: ${((textCount / total) * 100).toFixed(2)}% (${textCount}/${total})`);

  const parsedEmpty = hwpDocs.filter(
    (d) => String(d.status).toUpperCase() === "PARSED" && (!d.extractedText || d.extractedText.trim().length === 0)
  );
  console.log(`\n실제 실패 표본 (PARSED & Empty): ${parsedEmpty.length}건`);
  console.log(
    parsedEmpty.slice(0, 10).map((d) => ({ id: d.id, name: d.fileName, url: d.fileUrl }))
  );

  const pendingDocs = hwpDocs.filter((d) => String(d.status).toUpperCase() === "PENDING");
  console.log(`\n미처리 표본 (PENDING): ${pendingDocs.length}건`);
  console.log(
    pendingDocs.slice(0, 10).map((d) => ({ id: d.id, name: d.fileName, url: d.fileUrl }))
  );

  const parsedWithText = hwpDocs.filter(
    (d) => String(d.status).toUpperCase() === "PARSED" && d.extractedText && d.extractedText.trim().length > 0
  );
  console.log(`\n정상 회귀 표본 (PARSED & HasText): ${parsedWithText.length}건`);
  console.log(
    parsedWithText.slice(0, 10).map((d) => ({ id: d.id, name: d.fileName, url: d.fileUrl }))
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
