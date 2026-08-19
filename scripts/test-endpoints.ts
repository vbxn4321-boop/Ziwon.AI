async function testFullPsstEnhancements() {
  console.log("Testing Full PSST Chat & Table Enhancements...");

  // Step 1: Send initial message to verify suggestion chips & progress
  const chatRes = await fetch("http://localhost:3000/api/ai/psst-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "assistant", content: "안녕하세요! 구상 중이신 창업 아이템을 말씀해 주세요." },
        { role: "user", content: "버섯 균사체 기반 100% 생분해성 친환경 완충 포장재입니다." },
      ],
      targetProgramTitle: "2026년 중소벤처기업부 초기창업패키지",
    }),
  });

  const chatData = await chatRes.json();
  console.log("Chat Status:", chatRes.status);
  console.log("Suggestions returned:", chatData.suggestions);
  console.log("Progress returned:", chatData.progress);

  // Step 2: Test full plan generation with tables
  console.log("\nTesting Full PSST Generation with Government Tables...");
  const genRes = await fetch("http://localhost:3000/api/ai/psst-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      companyName: "(주)에코마이셀",
      itemName: "버섯 균사체 기반 100% 생분해성 친환경 완충 포장재",
      industry: "친환경 ESG 바이오 신소재",
      targetCustomer: "ESG 공시 의무화 대상 대기업 및 고가 전자기기/화장품 브랜드",
      itemDescription: "스티로폼을 100% 대체하며 45일 내 토양에서 자연 분해되는 버섯 균사체 기반 완충재",
      coreStrengths: "특허 균주 배양 기술, 기존 생분해 플라스틱 대비 단가 40% 절감, 압축 강도 1.8배 우수",
      targetProgramTitle: "2026년 중소벤처기업부 초기창업패키지",
    }),
  });

  const genData = await genRes.json();
  console.log("Plan Generation Status:", genRes.status);
  if (genData.success && genData.plan) {
    console.log("Plan Title:", genData.plan.overview.title);
    console.log("Summary Table:", genData.plan.overview.summaryTable);
    console.log("Competitor Table Rows:", genData.plan.solution.competitorTable?.length);
    console.log("Roadmap Rows:", genData.plan.solution.roadmapTable?.length);
    console.log("Budget Table Rows:", genData.plan.scaleUp.budgetTable?.length);
    console.log("Member List Rows:", genData.plan.team.memberList?.length);
    console.log("Rubric Total Score:", genData.plan.evaluationReport.score);
  } else {
    console.error("Plan Generation Failed:", genData.error);
  }
}

testFullPsstEnhancements();
