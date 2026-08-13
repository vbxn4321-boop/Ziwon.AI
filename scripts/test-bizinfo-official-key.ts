import "dotenv/config";
import { XMLParser } from "fast-xml-parser";

async function testOfficialBizinfoKey() {
  const apiKey = process.env.BIZINFO_API_KEY;

  if (!apiKey) {
    console.error("BIZINFO_API_KEY is missing in environment variables (.env).");
    return;
  }

  console.log("=========================================");
  console.log("Testing Official Bizinfo (기업마당) OpenAPI");
  console.log("API Key configured: ***REDACTED***");
  console.log("=========================================\n");

  // Test 1: JSON endpoint
  const jsonUrl = `https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do?crtfcKey=${apiKey}&dataType=json`;
  console.log("1. Testing JSON Endpoint:", jsonUrl.replace(apiKey, "***REDACTED***"));
  try {
    const res = await fetch(jsonUrl);
    console.log("JSON Status:", res.status);
    const text = await res.text();
    console.log("JSON Response Snippet:\n", text.slice(0, 500));
    console.log("-------------------------------------------\n");
  } catch (e) {
    console.error("JSON Fetch Error:", e);
  }

  // Test 2: RSS/XML endpoint
  const xmlUrl = `https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do?crtfcKey=${apiKey}&dataType=rss`;
  console.log("2. Testing XML/RSS Endpoint:", xmlUrl.replace(apiKey, "***REDACTED***"));
  try {
    const res = await fetch(xmlUrl);
    console.log("XML Status:", res.status);
    const xmlText = await res.text();
    console.log("XML Response Snippet:\n", xmlText.slice(0, 500));

    if (res.ok && !xmlText.includes("reqErr")) {
      const parser = new XMLParser({ ignoreAttributes: false });
      const parsed = parser.parse(xmlText);
      const items = parsed?.rss?.channel?.item || [];
      const itemList = Array.isArray(items) ? items : [items];
      console.log(`\n🎉 SUCCESS! Parsed ${itemList.length} LIVE BIZINFO RSS ITEMS!`);
      if (itemList.length > 0) {
        itemList.slice(0, 3).forEach((item: any, i: number) => {
          console.log(`\nItem ${i + 1}: ${item.title}`);
          console.log(`  Link: ${item.link}`);
          console.log(`  Category: ${item.category}`);
        });
      }
    }
  } catch (e) {
    console.error("XML Fetch Error:", e);
  }
}

testOfficialBizinfoKey().catch(console.error);
