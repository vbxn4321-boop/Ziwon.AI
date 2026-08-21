import { prisma } from "../src/lib/db";
import { runIngestionPipeline } from "../src/lib/crawler/collector";

async function main() {
  console.log("Seeding Ziwon.AI database...");

  // Seed sample company
  const company = await prisma.company.create({
    data: {
      name: "(주)지윈에이아이",
      bizRegNo: "123-45-67890",
      industryCode: "J62010", // AI SW 개발 및 공급업
      region: "광주광역시",
      foundedDate: new Date("2024-03-15"),
      revenue: 350000000, // 3.5억원
      employeeCount: 6,
      isExporting: false,
      hasPatents: true,
      hasCertifications: true,
    },
  });

  console.log(`Created sample company: ${company.name} (ID: ${company.id})`);

  // Run initial ingestion pipeline
  const ingested = await runIngestionPipeline(10);
  console.log(`Database seeded with ${ingested} support programs.`);
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
