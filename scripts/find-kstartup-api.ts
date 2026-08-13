import fs from "fs";

function findApi() {
  const html = fs.readFileSync("kstartup-sample.html", "utf-8");
  
  const scriptBlocks = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)];
  console.log("Found script blocks:", scriptBlocks.length);

  scriptBlocks.forEach((s, idx) => {
    const text = s[1];
    if (text.includes("ajax") || text.includes(".do") || text.includes("url") || text.includes("fetch")) {
      console.log(`\n--- Script Block ${idx + 1} Snippet ---`);
      const lines = text.split("\n").filter(l => l.includes(".do") || l.includes("url") || l.includes("ajax"));
      console.log(lines.slice(0, 10).join("\n"));
    }
  });
}

findApi();
