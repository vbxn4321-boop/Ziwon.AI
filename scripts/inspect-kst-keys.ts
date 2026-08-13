import { fetchKStartupNotices } from "../src/lib/crawler/kstartup";

async function checkKstKeys() {
  const notices = await fetchKStartupNotices(5);
  console.log("Fetched Notices Count:", notices.length);
  notices.forEach((n, i) => {
    console.log(`\nNotice ${i + 1}:`);
    console.log("Title:", n.title);
    console.log("Organizer:", n.organizer);
    console.log("Category:", n.category);
    console.log("Target:", n.targetDescription);
    console.log("URL:", n.sourceUrl);
    console.log("RawData:", n.rawData);
  });
}

checkKstKeys().catch(console.error);
