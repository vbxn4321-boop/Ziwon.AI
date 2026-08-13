async function inspectLiveHtml() {
  console.log("=== Fetching Live Bizinfo HTML Page ===");
  const bizRes = await fetch("https://www.bizinfo.go.kr/web/lay1/S1T122C128/asoc/pbanc/list.do", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  const bizHtml = await bizRes.text();
  console.log("Bizinfo HTML Length:", bizHtml.length);

  // Extract titles and links from Bizinfo list
  const bizMatches = [...bizHtml.matchAll(/<a[^>]*href=["']([^"']*)["'][^>]*class=["'][^"']*txt[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi)];
  console.log("Bizinfo Titles Match Count:", bizMatches.length);

  // Also check table rows
  const bizRowMatches = [...bizHtml.matchAll(/<td[^>]*class=["'][^"']*subject[^"']*["'][^>]*>([\s\S]*?)<\/td>/gi)];
  console.log("Bizinfo Row Matches Count:", bizRowMatches.length);

  if (bizHtml.includes("pbancView.do")) {
    console.log("Found pbancView.do occurrences!");
    const links = [...bizHtml.matchAll(/href=["']([^"']*pbancView\.do[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)];
    links.slice(0, 5).forEach((l, i) => {
      const cleanText = l[2].replace(/<[^>]+>/g, "").trim();
      console.log(`[Bizinfo Notice ${i + 1}] Title: ${cleanText} | Link: https://www.bizinfo.go.kr${l[1]}`);
    });
  }

  console.log("\n=== Fetching Live K-Startup Notices HTML Page ===");
  const kstRes = await fetch("https://www.k-startup.go.kr/web/contents/bizpbanc-tab.do?schM=list", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  const kstHtml = await kstRes.text();
  console.log("K-Startup HTML Length:", kstHtml.length);

  const kstLinks = [...kstHtml.matchAll(/href=["']([^"']*pbancId=([^"']*))["'][^>]*>([\s\S]*?)<\/a>/gi)];
  console.log("K-Startup pbancId Matches Count:", kstLinks.length);

  // General list extraction
  const liMatches = [...kstHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)];
  console.log("K-Startup LI tag count:", liMatches.length);
}

inspectLiveHtml().catch(console.error);
