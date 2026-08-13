import fs from "fs";

async function testKStartupTab() {
  const url = "https://www.k-startup.go.kr/web/contents/bizpbanc-tab.do?schM=list";
  console.log("Fetching K-Startup Tab URL:", url);
  
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });

  console.log("Response Status:", res.status);
  const html = await res.text();
  fs.writeFileSync("kstartup-tab-sample.html", html);
  console.log("Saved kstartup-tab-sample.html (Length:", html.length, ")");

  // Search for notice items
  const matches = [...html.matchAll(/<a[^>]*href=["']([^"']*bizpbanc[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  console.log("Matches count:", matches.length);
  matches.forEach((m, idx) => {
    const text = m[2].replace(/<[^>]+>/g, "").trim();
    if (text.length > 5) {
      console.log(`${idx + 1}. [K-Startup Notice] ${text} -> ${m[1]}`);
    }
  });

  // Search for any span or p with title or pbanc
  const spanMatches = [...html.matchAll(/<span[^>]*class=["'][^"']*title[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi)];
  console.log("Span title matches count:", spanMatches.length);
  spanMatches.forEach((s, idx) => {
    console.log(`Span Title ${idx + 1}:`, s[1].replace(/<[^>]+>/g, "").trim());
  });
}

testKStartupTab().catch(console.error);
