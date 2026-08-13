import fs from "fs";

function inspectMatches() {
  const html = fs.readFileSync("kstartup-tab-sample.html", "utf-8");

  // Print text inside all <p> or <span> or <a> tags with length > 15
  const tags = [...html.matchAll(/<(p|span|div|a)[^>]*>([\s\S]*?)<\/\1>/gi)];
  console.log("Total tag count:", tags.length);

  const cleanTexts = tags
    .map(t => t[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
    .filter(t => t.length > 20 && (t.includes("모집") || t.includes("지원") || t.includes("사업") || t.includes("공고") || t.includes("패키지") || t.includes("TIPS")));

  console.log(`\nFiltered K-Startup Notice Candidates (${cleanTexts.length}):`);
  const unique = Array.from(new Set(cleanTexts));
  unique.slice(0, 15).forEach((text, i) => {
    console.log(`${i + 1}. ${text}`);
  });
}

inspectMatches();
