import fs from "fs";

function inspectKStartupRows() {
  const html = fs.readFileSync("kstartup-sample.html", "utf-8");

  // Search for tr tags
  const trMatches = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  console.log("Found <tr> tags count:", trMatches.length);

  trMatches.slice(0, 10).forEach((tr, i) => {
    const text = tr[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (text.length > 10) {
      console.log(`\nRow ${i + 1}: ${text}`);
    }
  });

  // Search for div class containing pbanc or notice
  const divMatches = [...html.matchAll(/<div[^>]*class=["'][^"']*(notice|pbanc|list|box|item)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi)];
  console.log("\nFound notice/pbanc/list div count:", divMatches.length);
  divMatches.slice(0, 5).forEach((d, i) => {
    const text = d[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (text.length > 10) {
      console.log(`\nDiv ${i + 1}: ${text.slice(0, 150)}...`);
    }
  });
}

inspectKStartupRows();
