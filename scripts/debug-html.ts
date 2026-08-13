import fs from "fs";

async function debugHtml() {
  const kstRes = await fetch("https://www.k-startup.go.kr/web/contents/bizpbanc-tab.do?schM=list", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  const kstHtml = await kstRes.text();
  fs.writeFileSync("kstartup-sample.html", kstHtml);
  console.log("Saved kstartup-sample.html (Length:", kstHtml.length, ")");

  // Also test data.go.kr / public Bizinfo RSS
  const bizApiUrl = "https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do?dataType=json";
  const bizRes = await fetch(bizApiUrl);
  const bizJsonText = await bizRes.text();
  console.log("Bizinfo JSON Status:", bizRes.status, "Snippet:", bizJsonText.slice(0, 300));
}

debugHtml().catch(console.error);
