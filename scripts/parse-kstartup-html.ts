import fs from "fs";

function parseKStartup() {
  const html = fs.readFileSync("kstartup-sample.html", "utf-8");
  
  // Search for notice blocks
  // In K-Startup HTML, notices are listed inside <li> or <tr> elements with classes like 'notice', 'pbanc', 'title' or 'box'
  const titles: string[] = [];
  const links: string[] = [];

  // Match class or href or title patterns
  const titleMatches = [...html.matchAll(/<div[^>]*class=["'][^"']*title[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi)];
  console.log("Title matches count:", titleMatches.length);
  titleMatches.slice(0, 10).forEach((m, idx) => {
    console.log(`Title ${idx + 1}:`, m[1].replace(/<[^>]+>/g, "").trim());
  });

  const anchorMatches = [...html.matchAll(/<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  console.log("Total anchor matches count:", anchorMatches.length);
  const relevantAnchors = anchorMatches
    .map((m) => ({ href: m[1], text: m[2].replace(/<[^>]+>/g, "").trim() }))
    .filter((a) => a.text.length > 5 && !a.text.includes("로그인") && !a.text.includes("메뉴"));

  console.log("\nTop Relevant Notice Anchors in K-Startup:");
  relevantAnchors.slice(0, 15).forEach((a, i) => {
    console.log(`${i + 1}. Text: "${a.text}" | Href: "${a.href}"`);
  });
}

parseKStartup();
