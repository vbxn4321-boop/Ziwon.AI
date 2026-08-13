import fs from "fs";

async function testBoard() {
  const url = "https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/list.do";
  console.log("Fetching Bizinfo Board URL:", url);
  
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  
  console.log("Response Status:", res.status);
  const html = await res.text();
  fs.writeFileSync("bizinfo-board-sample.html", html);
  console.log("Saved bizinfo-board-sample.html (Length:", html.length, ")");

  // Extract titles and links
  const matches = [...html.matchAll(/href=["']([^"']*view\.do[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  console.log("Found view.do matches:", matches.length);
  matches.slice(0, 10).forEach((m, idx) => {
    const text = m[2].replace(/<[^>]+>/g, "").trim();
    console.log(`${idx + 1}. Title: "${text}" | Link: "${m[1]}"`);
  });
}

testBoard().catch(console.error);
