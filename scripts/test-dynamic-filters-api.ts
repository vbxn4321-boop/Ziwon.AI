import { prisma } from "../src/lib/db";

async function testDynamicFilters() {
  const programs = await prisma.supportProgram.findMany({
    select: { category: true, region: true, organizer: true },
  });

  const categories = ["전체", ...Array.from(new Set(programs.map((p) => p.category).filter(Boolean))).sort()];
  const regions = ["전체", ...Array.from(new Set(programs.map((p) => p.region).filter(Boolean))).sort()];
  const organizers = ["전체", ...Array.from(new Set(programs.map((p) => p.organizer).filter(Boolean))).sort()];

  console.log("=========================================");
  console.log("DB Dynamic Filter Extraction Test");
  console.log("=========================================");
  console.log(`Categories Extracted (${categories.length - 1} items):`, categories);
  console.log(`Regions Extracted (${regions.length - 1} items):`, regions);
  console.log(`Organizers Extracted (${organizers.length - 1} items):`, organizers);
  console.log("=========================================");

  await prisma.$disconnect();
}

testDynamicFilters().catch(console.error);
