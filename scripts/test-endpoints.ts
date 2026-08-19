async function testStepByStepInterview() {
  console.log("Testing PSST Step-by-Step Interview...");
  const res = await fetch("http://localhost:3000/api/ai/psst-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "assistant", content: "안녕하세요! 구상 중이신 창업 아이템을 말씀해 주세요." },
        { role: "user", content: "스마트팜 원격 온습도 모니터링 앱입니다." },
      ],
      targetProgramTitle: "2026년 중소벤처기업부 초기창업패키지",
    }),
  });
  const json = await res.json();
  console.log("Status:", res.status);
  console.log("Consultant Response:\n", json.reply);
}

testStepByStepInterview();
