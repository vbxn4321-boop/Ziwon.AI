import { generatePsstBusinessPlan } from "../src/lib/ai/psst-generator";

async function test() {
  console.log("Testing generatePsstBusinessPlan with Gemini...");
  try {
    const result = await generatePsstBusinessPlan({
      companyName: "(주)지윈에이아이",
      itemName: "정부지원사업 공고 실시간 파싱 및 PSST 사업계획서 자동 생성 AI 솔루션",
      industry: "ICT / 인공지능(AI)",
      targetCustomer: "정부지원사업을 준비하는 스타트업",
      itemDescription: "공공데이터와 첨부파일을 크롤링하여 3분 만에 정부 표준 PSST 사업계획서를 자동 작성해주는 서비스",
      coreStrengths: "HWP 바이너리 파서, 실시간 공고 DB 연동",
      targetProgramTitle: "2026년 초기창업패키지",
    });

    console.log("✅ Success! Overview:", result.overview);
    console.log("✅ Score:", result.evaluationReport.score, result.evaluationReport.grade);
    console.log("✅ Problem:", result.problem.title, result.problem.marketPainPoint.slice(0, 100));
  } catch (err: any) {
    console.error("❌ Failed:", err.message);
  }
}

test();
