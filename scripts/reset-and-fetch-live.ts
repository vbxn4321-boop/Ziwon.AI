import { prisma } from "../src/lib/db";
import { runIngestionPipeline } from "../src/lib/crawler/collector";

async function resetAndFetchLive() {
  console.log("Cleaning up previous test database records...");
  await prisma.supportSource.deleteMany();
  await prisma.supportDocument.deleteMany();
  await prisma.supportAnalysis.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.supportProgram.deleteMany();
  await prisma.crawlLog.deleteMany();
  console.log("Database reset complete.\n");

  console.log("=========================================");
  console.log("Running Live Ingestion from Official K-Startup OpenAPI...");
  console.log("=========================================\n");

  const count = await runIngestionPipeline(10);
  console.log(`\n🎉 Ingested ${count} REAL LIVE K-Startup notices from data.go.kr!\n`);

  const programs = await prisma.supportProgram.findMany({
    include: { sources: true },
    orderBy: { createdAt: "desc" },
  });

  console.log("--- REAL LIVE K-STARTUP NOTICES IN DATABASE ---");
  programs.forEach((prog, i) => {
    console.log(`\n${i + 1}. [${prog.category} / ${prog.region}] ${prog.title}`);
    console.log(`   - 주관기관: ${prog.organizer}`);
    console.log(`   - 지원대상: ${prog.targetDescription?.slice(0, 80)}...`);
    console.log(`   - 모집기간: ${prog.startDate ? prog.startDate.toISOString().slice(0,10) : 'N/A'} ~ ${prog.endDate ? prog.endDate.toISOString().slice(0,10) : 'N/A'}`);
    console.log(`   - 원문 URL: ${prog.sources[0]?.sourceUrl}`);
  });
}

resetAndFetchLive()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
