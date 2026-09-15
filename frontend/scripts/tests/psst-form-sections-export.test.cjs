const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function loadTsModule(relativePath) {
  const fullPath = path.join(__dirname, relativePath);
  const source = fs.readFileSync(fullPath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;

  const mod = { exports: {} };
  const fn = new Function("exports", "module", "require", compiled);
  fn(mod.exports, mod, require);
  return mod.exports;
}

const { convertPsstToHwpPages } = loadTsModule("../../src/lib/export/hwp-clipboard-exporter.ts");
const { buildHwpxSectionXml } = loadTsModule("../../src/lib/export/hwpx-generator.ts");

const mockPlanStandard = {
  overview: {
    title: "AI 기반 차세대 SaaS 솔루션",
    companyName: "테스트 주식회사",
    industry: "ICT/SaaS",
    itemSummary: "기업용 문서 자동화 플랫폼",
  },
  problem: {
    marketPainPoint: "수작업 문서 작성의 비효율",
    targetCustomerProblem: "시간 부족 및 규격 불일치",
    developmentNecessity: "AI 기반 자동 생성 솔루션 시급",
  },
  solution: {
    coreTechnologyAndFeatures: "독자 NLP 및 템플릿 변환 엔진",
    implementationPlan: "1단계 MVP 출시 및 2단계 고도화",
    competitorDifferentiation: "10배 빠른 생성 속도",
  },
  scaleUp: {
    businessModelAndRevenue: "월간 구독 모델",
    marketEntryAndMarketing: "온라인 퍼널 마케팅",
    fundingAndBudgetPlan: "인건비 및 마케팅비 집행",
  },
  team: {
    founderAndTeamCompetency: "대표자 10년 개발 경력",
    rolesAndResponsibilities: "기획 1명, 개발 2명",
    collaborationNetwork: "산학 협력 MOU 체결",
  },
};

const mockPlanWithFormSections = {
  ...mockPlanStandard,
  formSections: [
    {
      id: "custom_sec_1",
      label: "현대차그룹 현업 적용 및 실증 제안",
      sectionTitle: "대기업 오픈이노베이션 과제",
      guidance: "현대자동차 남양연구소 실증 인프라 연계 방안을 명시할 것",
      type: "NARRATIVE",
      content: "남양연구소 프로빙 트랙 데이터와 실시간 연동하여 테스트를 수행합니다.",
    },
    {
      id: "custom_sec_2",
      label: "소부장 핵심 소재 국산화 자립 계획",
      sectionTitle: "공급망 안정화",
      guidance: "국내 공급선 100% 확보 로드맵 기술",
      type: "NARRATIVE",
      content: "국내 1차 협력사 3곳과 공급 계약을 체결하여 국산화율 100%를 달성합니다.",
    },
  ],
};

test("convertPsstToHwpPages returns 4 pages for standard plan without formSections", () => {
  const pages = convertPsstToHwpPages(mockPlanStandard, "2026년 표준 공고");
  assert.equal(pages.length, 4);
  assert.equal(pages[0].pageNum, 1);
  assert.equal(pages[3].pageNum, 4);
});

test("convertPsstToHwpPages appends Page 5 when formSections exist", () => {
  const pages = convertPsstToHwpPages(mockPlanWithFormSections, "2026 현대차 오픈이노베이션");
  assert.equal(pages.length, 5);
  const page5 = pages[4];
  assert.equal(page5.pageNum, 5);
  assert.ok(page5.title.includes("공식 서식"));
  assert.ok(page5.html.includes("현대차그룹 현업 적용"));
  assert.ok(page5.html.includes("남양연구소 실증 인프라"));
  assert.ok(page5.html.includes("소부장 핵심 소재 국산화"));
});

test("buildHwpxSectionXml includes formSections when present", () => {
  const xmlWithout = buildHwpxSectionXml(mockPlanStandard, "표준 공고");
  assert.ok(!xmlWithout.includes("공고 공식 서식 항목별 작성문"));

  const xmlWith = buildHwpxSectionXml(mockPlanWithFormSections, "현대차 오픈이노베이션");
  assert.ok(xmlWith.includes("5. 공고 공식 서식 항목별 작성문"));
  assert.ok(xmlWith.includes("현대차그룹 현업 적용 및 실증 제안"));
  assert.ok(xmlWith.includes("남양연구소 실증 인프라 연계 방안을 명시할 것"));
  assert.ok(xmlWith.includes("남양연구소 프로빙 트랙 데이터"));
  assert.ok(xmlWith.includes("소부장 핵심 소재 국산화 자립 계획"));
});
