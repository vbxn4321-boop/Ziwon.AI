import "dotenv/config";
import { prisma } from "../src/lib/db";
import { runIngestionPipeline } from "../src/lib/crawler/collector";

async function resetAndFetchFullBulk() {
  console.log("Cleaning up previous database records...");
  await prisma.supportSource.deleteMany();
  await prisma.supportDocument.deleteMany();
  await prisma.supportAnalysis.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.supportProgram.deleteMany();
  await prisma.crawlLog.deleteMany();
  console.log("Database reset complete.\n");

  console.log("=========================================");
  console.log("Running FULL BULK Ingestion from Official OpenAPIs");
  console.log("Fetching ALL currently ongoing notices (1,500+ items)...");
  console.log("=========================================\n");

  const count = await runIngestionPipeline(0); // 0 means fetch ALL available items
  console.log(`\n🎉 Ingested ${count} REAL LIVE notices from K-Startup & Bizinfo data.go.kr!\n`);

  const totalPrograms = await prisma.supportProgram.count();
  const totalSources = await prisma.supportSource.count();

  console.log("=== FULL BULK INGESTION SUMMARY ===");
  console.log(`✅ Total SupportProgram Records: ${totalPrograms}`);
  console.log(`✅ Total SupportSource Records: ${totalSources}`);

  const samplePrograms = await prisma.supportProgram.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
  });

  console.log("\n--- Sample Ingested Notices ---");
  samplePrograms.forEach((prog, i) => {
    console.log(`${i + 1}. [${prog.category} / ${prog.region}] ${prog.title}`);
    console.log(`   - 주관기관: ${prog.organizer}`);
  });
}

resetAndFetchFullBulk()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
