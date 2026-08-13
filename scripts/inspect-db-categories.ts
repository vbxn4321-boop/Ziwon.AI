import { prisma } from "../src/lib/db";

async function inspectDbCategories() {
  const programs = await prisma.supportProgram.findMany({
    select: {
      category: true,
      region: true,
      organizer: true,
      targetDescription: true,
      budget: true,
    },
  });

  const categories = Array.from(new Set(programs.map((p) => p.category).filter(Boolean)));
  const regions = Array.from(new Set(programs.map((p) => p.region).filter(Boolean)));
  const organizers = Array.from(new Set(programs.map((p) => p.organizer).filter(Boolean)));

  console.log("=== DB DISTINCT CATEGORIES ===");
  console.log(categories);

  console.log("\n=== DB DISTINCT REGIONS ===");
  console.log(regions);

  console.log("\n=== DB DISTINCT ORGANIZERS ===");
  console.log(organizers);

  await prisma.$disconnect();
}

inspectDbCategories().catch(console.error);
