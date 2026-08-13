import { XMLParser } from "fast-xml-parser";

async function testBizinfoRss() {
  const url = "https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do?dataType=rss";
  const res = await fetch(url);
  const xml = await res.text();
  console.log("Bizinfo XML Raw length:", xml.length);
  
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: false,
    trimValues: true,
  });

  const parsed = parser.parse(xml);
  console.log("Parsed Keys:", Object.keys(parsed));
  const channel = parsed?.rss?.channel;
  console.log("Channel Keys:", channel ? Object.keys(channel) : "No channel");
  
  if (channel && channel.item) {
    const items = Array.isArray(channel.item) ? channel.item : [channel.item];
    console.log(`\n🎉 Found ${items.length} REAL LIVE BIZINFO RSS ITEMS!`);
    items.slice(0, 5).forEach((item: any, i: number) => {
      console.log(`\n--- Live Bizinfo Item ${i + 1} ---`);
      console.log("Title:", item.title);
      console.log("Link:", item.link);
      console.log("Description:", item.description?.slice(0, 100));
      console.log("Category:", item.category);
    });
  } else {
    console.log("Full XML snippet:\n", xml.slice(0, 1000));
  }
}

testBizinfoRss().catch(console.error);
