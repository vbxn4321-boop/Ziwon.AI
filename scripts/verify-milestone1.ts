import { prisma } from "../src/lib/db";

async function verifyMilestone1() {
  console.log("=========================================");
  console.log("Ziwon.AI Milestone 1 Verification Report");
  console.log("=========================================\n");

  const programCount = await prisma.supportProgram.count();
  const sourceCount = await prisma.supportSource.count();
  const companyCount = await prisma.company.count();
  const crawlLogs = await prisma.crawlLog.findMany({ take: 5, orderBy: { executedAt: "desc" } });

  console.log(`✅ SupportProgram Total Count: ${programCount} records`);
  console.log(`✅ SupportSource Total Count: ${sourceCount} records`);
  console.log(`✅ Registered Companies: ${companyCount} records`);
  console.log(`✅ CrawlLog Status: ${crawlLogs.length > 0 ? crawlLogs[0].status : "N/A"}\n`);

  console.log("--- Registered Support Programs (Top 10) ---");
  const programs = await prisma.supportProgram.findMany({
    include: { sources: true },
    take: 10,
    orderBy: { createdAt: "desc" },
  });

  programs.forEach((prog, idx) => {
    const srcTypes = prog.sources.map((s) => s.sourceType).join(", ");
    console.log(
      `${idx + 1}. [${prog.region} / ${prog.category}] ${prog.title}`
    );
    console.log(`   - 주관기관: ${prog.organizer}`);
    console.log(`   - 지원규모: ${prog.budget || "미정"}`);
    console.log(`   - 수집출처: ${srcTypes || "없음"}`);
    console.log(`   - 중복상태: ${prog.duplicateStatus}\n`);
  });

  console.log("=========================================");
  console.log("Milestone 1 Verification Complete!");
  console.log("=========================================");
}

verifyMilestone1()
  .catch((e) => {
    console.error("Verification failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
