import fs from "fs";

function findTitles() {
  const html = fs.readFileSync("bizinfo-board-sample.html", "utf-8");

  // Search for links or table headers or span tags
  const anchors = [...html.matchAll(/<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  console.log("Total Anchors:", anchors.length);

  const filtered = anchors
    .map(a => ({ link: a[1], text: a[2].replace(/<[^>]+>/g, "").trim() }))
    .filter(a => a.text.length > 8 && !a.link.startsWith("javascript:void"));

  console.log("\nFiltered Bizinfo Titles:");
  filtered.slice(0, 15).forEach((item, idx) => {
    console.log(`${idx + 1}. [${item.text}] -> ${item.link}`);
  });
}

findTitles();
