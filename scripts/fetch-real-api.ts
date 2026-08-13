import { runIngestionPipeline } from "../src/lib/crawler/collector";
import { prisma } from "../src/lib/db";

async function runLiveFetch() {
  console.log("=========================================");
  console.log("Testing Real Live Ingestion Pipeline...");
  console.log("BIZINFO_API_KEY Configured:", process.env.BIZINFO_API_KEY ? "YES" : "NO (Register key at bizinfo.go.kr)");
  console.log("KSTARTUP_API_KEY Configured:", process.env.KSTARTUP_API_KEY ? "YES" : "NO (Register key at data.go.kr)");
  console.log("=========================================\n");

  const ingestedCount = await runIngestionPipeline(5);
  console.log(`\nIngestion Finished! Total New Live Notices Added: ${ingestedCount}`);

  const totalPrograms = await prisma.supportProgram.count();
  console.log(`Total Database SupportProgram Count: ${totalPrograms}`);
}

runLiveFetch()
  .catch((e) => {
    console.error("Live fetch failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
