import fs from "fs";

function parseBizinfoBoard() {
  const html = fs.readFileSync("bizinfo-board-sample.html", "utf-8");

  // In Bizinfo list HTML, notices are listed inside table rows <tr> or list items <div class="txt"> or <a> tags with titles
  const matches = [...html.matchAll(/<a[^>]*href=["']([^"']*AS\/74\/[0-9]+\/view\.do[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  console.log("Specific AS/74 View Matches:", matches.length);

  if (matches.length > 0) {
    matches.forEach((m, idx) => {
      const text = m[2].replace(/<[^>]+>/g, "").trim();
      if (text) {
        console.log(`${idx + 1}. Title: ${text} | Link: https://www.bizinfo.go.kr${m[1]}`);
      }
    });
  } else {
    // Search for all anchors in tbody
    const tbodyMatch = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
    if (tbodyMatch) {
      const tbodyHtml = tbodyMatch[1];
      const rowAnchors = [...tbodyHtml.matchAll(/<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)];
      console.log("Found row anchors in tbody:", rowAnchors.length);
      rowAnchors.forEach((a, i) => {
        const text = a[2].replace(/<[^>]+>/g, "").trim();
        if (text.length > 3) {
          console.log(`${i + 1}. [TBODY Link] Text: ${text} | Link: ${a[1]}`);
        }
      });
    } else {
      console.log("No tbody found, checking list items...");
      const listItems = [...html.matchAll(/<div[^>]*class=["'][^"']*subject[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi)];
      console.log("Subject div count:", listItems.length);
    }
  }
}

parseBizinfoBoard();
