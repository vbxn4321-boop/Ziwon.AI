import fs from "fs";

async function testPbancList() {
  const url = "https://www.bizinfo.go.kr/web/lay1/S1T122C128/asoc/pbanc/list.do";
  console.log("Fetching Bizinfo Pbanc List URL:", url);
  
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "rows=15&pageIndex=1",
  });

  console.log("Response Status:", res.status);
  const html = await res.text();
  fs.writeFileSync("bizinfo-pbanc-list.html", html);
  console.log("Saved bizinfo-pbanc-list.html (Length:", html.length, ")");

  const links = [...html.matchAll(/href=["']([^"']*pbancView\.do[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  console.log("pbancView.do link count:", links.length);

  links.slice(0, 10).forEach((l, idx) => {
    const text = l[2].replace(/<[^>]+>/g, "").trim();
    console.log(`${idx + 1}. Title: "${text}" | Link: "${l[1]}"`);
  });
}

testPbancList().catch(console.error);
