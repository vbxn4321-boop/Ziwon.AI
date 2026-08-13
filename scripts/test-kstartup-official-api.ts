async function testExactKStartupOperations() {
  const serviceKey = process.env.KSTARTUP_API_KEY;

  if (!serviceKey) {
    console.error("KSTARTUP_API_KEY is not set in environment variables.");
    return;
  }

  const baseUrl = "https://apis.data.go.kr/B552735/kisedKstartupService01";
  const operations = [
    "/getAnnouncementInformation01",
    "/getBusinessInformation01",
    "/getContentInformation01",
  ];

  for (const op of operations) {
    console.log(`\n===========================================`);
    console.log(`Testing Operation: ${op}`);
    console.log(`===========================================`);

    const url = `${baseUrl}${op}?serviceKey=${serviceKey}&pageNo=1&numOfRows=5&resultType=json`;
    try {
      const res = await fetch(url);
      console.log(`Status: ${res.status}`);
      const text = await res.text();
      console.log(`Response Snippet:\n${text.slice(0, 400)}\n`);
      if (res.status === 200 && text.includes('"item"')) {
        console.log(`🎉 SUCCESS ON OPERATION: ${op}!`);
        return;
      }
    } catch (e) {
      console.error(e);
    }
  }
}

testExactKStartupOperations().catch(console.error);
