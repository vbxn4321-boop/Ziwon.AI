import { prisma } from "../src/lib/db";

async function reAnalyze() {
  const prog = await prisma.supportProgram.findFirst({
    where: {
      sources: {
        some: {
          sourceUrl: { contains: "PBLN_000000000125495" },
        },
      },
    },
  });

  if (!prog) {
    console.log("Program not found");
    return;
  }

  console.log(`Triggering analyze POST /api/support-programs/${prog.id}/analyze ...`);
  const res = await fetch(`http://localhost:3000/api/support-programs/${prog.id}/analyze`, {
    method: "POST",
  });

  const json = await res.json();
  console.log("API Response Status:", res.status);
  console.log("Success:", json.success);
  console.log("\n=== 🎯 Extra Points / Priority Selection Output ===");
  console.log("Items:", json.result?.extraPoints?.items);
  console.log("Summary:", json.result?.extraPoints?.summary);

  console.log("\n=== ⚠️ Excluded Conditions ===");
  console.log("Items:", json.result?.excludedConditions?.items);

  console.log("\n=== 📑 Required Documents ===");
  console.log("Docs Count:", json.result?.requiredDocuments?.length);
  console.log("Docs:", json.result?.requiredDocuments);
}

reAnalyze().catch(console.error);
