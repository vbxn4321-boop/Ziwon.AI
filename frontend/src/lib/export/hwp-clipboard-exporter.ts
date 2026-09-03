import { PsstBusinessPlanResult } from "@/lib/ai/psst-generator";

export interface PsstPageData {
  pageNum: number;
  title: string;
  subtitle: string;
  html: string;
}

/**
 * [한컴오피스 한글(HWP) 및 정부 공문서 규격 인라인 스타일 엔진]
 * 표준 규격:
 * - A4 규격 (210mm × 297mm), 표준 여백 20mm
 * - 본문 맑은 고딕 10pt, 줄간격 160%
 * - 표(Table): table-layout: fixed, width: 100%, 테두리 1.5px/1px 검정, 셀 여백 7px
 */
export function convertPsstToHwpPages(plan: PsstBusinessPlanResult, programTitle?: string): PsstPageData[] {
  const tableStyle =
    'border-collapse: collapse; width: 100%; border: 1.5px solid #000000; margin: 12px 0; font-family: "맑은 고딕", "Malgun Gothic", sans-serif; font-size: 10pt; background-color: #ffffff; table-layout: fixed; box-sizing: border-box;';
  const thStyle =
    'border: 1px solid #000000; background-color: #f1f5f9; padding: 7px 8px; font-weight: bold; text-align: center; font-family: "맑은 고딕", sans-serif; font-size: 10pt; color: #000000; word-break: break-all; overflow-wrap: break-word;';
  const tdStyle =
    'border: 1px solid #000000; padding: 7px 8px; font-family: "맑은 고딕", sans-serif; font-size: 10pt; line-height: 160%; vertical-align: middle; background-color: #ffffff; color: #0f172a; word-break: break-all; overflow-wrap: break-word;';
  const h1Style =
    'font-family: "맑은 고딕", sans-serif; font-size: 15pt; font-weight: bold; margin-top: 20px; margin-bottom: 8px; color: #000000; border-bottom: 2px solid #000000; padding-bottom: 4px;';
  const h2Style =
    'font-family: "맑은 고딕", sans-serif; font-size: 12pt; font-weight: bold; margin-top: 16px; margin-bottom: 6px; color: #1e3a8a;';
  const h3Style =
    'font-family: "맑은 고딕", sans-serif; font-size: 10.5pt; font-weight: bold; margin-top: 10px; margin-bottom: 4px; color: #000000;';
  const pStyle =
    'font-family: "맑은 고딕", sans-serif; font-size: 10pt; line-height: 160%; margin: 4px 0 8px 0; color: #1e293b; text-align: justify; word-break: keep-all;';

  // ────────────────────────────────────────────
  // Page 1: 표제부 & 창업아이템 개요(요약)
  // ────────────────────────────────────────────
  const page1Html = `
<div style="font-family: '맑은 고딕', sans-serif; font-size: 10pt; line-height: 160%; color: #000000; width: 100%; box-sizing: border-box;">
  <!-- 공문서 공식 표제부 박스 -->
  <div style="text-align: center; border: 2px solid #000000; padding: 16px; margin-bottom: 20px; background-color: #f8fafc; box-sizing: border-box;">
    <div style="font-size: 11pt; font-weight: bold; color: #475569; margin-bottom: 4px;">
      [${programTitle || "중소벤처기업부 표준 서식"}] 사업계획서
    </div>
    <div style="font-size: 17pt; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; margin: 4px 0;">
      ${plan.overview.title}
    </div>
    <div style="font-size: 10pt; color: #64748b; margin-top: 6px;">
      기업명: <b>${plan.overview.companyName || "미기재"}</b> | 산업 분야: <b>${plan.overview.industry || "정보통신(ICT/SaaS)"}</b>
    </div>
  </div>

  <!-- 창업아이템 개요(요약) -->
  <h1 style="${h1Style}">창업아이템 개요 (요약)</h1>
  <p style="${pStyle}">${(plan.overview.itemSummary || "").replace(/\n/g, "<br/>")}</p>

  ${
    plan.overview.summaryTable
      ? `
  <h3 style="${h3Style}">■ 아이템 핵심 요약표</h3>
  <table border="1" cellspacing="0" cellpadding="7" style="${tableStyle}">
    <thead>
      <tr>
        <th style="${thStyle}; width: 25%;">항목 구분</th>
        <th style="${thStyle}; width: 75%;">등록 및 계획 내용</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="${tdStyle}; font-weight: bold; background-color: #f8fafc; text-align: center;">아이템 범주</td>
        <td style="${tdStyle}">${plan.overview.summaryTable.itemCategory}</td>
      </tr>
      <tr>
        <td style="${tdStyle}; font-weight: bold; background-color: #f8fafc; text-align: center;">주요 타겟</td>
        <td style="${tdStyle}">${plan.overview.summaryTable.targetUsers}</td>
      </tr>
      <tr>
        <td style="${tdStyle}; font-weight: bold; background-color: #f8fafc; text-align: center;">핵심 기능</td>
        <td style="${tdStyle}">${plan.overview.summaryTable.coreFeature}</td>
      </tr>
      <tr>
        <td style="${tdStyle}; font-weight: bold; background-color: #f8fafc; text-align: center;">수익 모델 (BM)</td>
        <td style="${tdStyle}">${plan.overview.summaryTable.monetization}</td>
      </tr>
      <tr>
        <td style="${tdStyle}; font-weight: bold; background-color: #f8fafc; text-align: center;">신청/소요 예산</td>
        <td style="${tdStyle}; font-weight: bold; color: #047857;">${plan.overview.summaryTable.targetBudget}</td>
      </tr>
    </tbody>
  </table>`
      : ""
  }
</div>
  `.trim();

  // ────────────────────────────────────────────
  // Page 2: 1. 문제인식 (Problem)
  // ────────────────────────────────────────────
  const page2Html = `
<div style="font-family: '맑은 고딕', sans-serif; font-size: 10pt; line-height: 160%; color: #000000; width: 100%; box-sizing: border-box;">
  <h1 style="${h1Style}">1. 문제인식 (Problem)</h1>
  
  <h2 style="${h2Style}">1-1. 개발 및 사업화의 배경과 필요성</h2>
  <p style="${pStyle}">${(plan.problem.developmentNecessity || "").replace(/\n/g, "<br/>")}</p>

  <h2 style="${h2Style}">1-2. 시장 및 고객의 핵심 문제점 (Pain Points)</h2>
  <p style="${pStyle}">${(plan.problem.marketPainPoint || "").replace(/\n/g, "<br/>")}</p>

  <h2 style="${h2Style}">1-3. 타겟 고객의 불편 사항 및 기존 한계</h2>
  <p style="${pStyle}">${(plan.problem.targetCustomerProblem || "").replace(/\n/g, "<br/>")}</p>

  ${
    plan.problem.tamSamSom
      ? `
  <h3 style="${h3Style}">■ 타겟 시장 규모 분석 (TAM-SAM-SOM)</h3>
  <table border="1" cellspacing="0" cellpadding="7" style="${tableStyle}">
    <thead>
      <tr>
        <th style="${thStyle}; width: 33%;">TAM (전체 시장)</th>
        <th style="${thStyle}; width: 33%;">SAM (유효 시장)</th>
        <th style="${thStyle}; width: 34%;">SOM (수익 시장)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="${tdStyle}; text-align: center;">${plan.problem.tamSamSom.tam}</td>
        <td style="${tdStyle}; text-align: center;">${plan.problem.tamSamSom.sam}</td>
        <td style="${tdStyle}; text-align: center; font-weight: bold; color: #0369a1;">${plan.problem.tamSamSom.som}</td>
      </tr>
    </tbody>
  </table>`
      : ""
  }
</div>
  `.trim();

  // ────────────────────────────────────────────
  // Page 3: 2. 실현가능성 (Solution)
  // ────────────────────────────────────────────
  const page3Html = `
<div style="font-family: '맑은 고딕', sans-serif; font-size: 10pt; line-height: 160%; color: #000000; width: 100%; box-sizing: border-box;">
  <h1 style="${h1Style}">2. 실현가능성 (Solution)</h1>

  <h2 style="${h2Style}">2-1. 핵심 기술 및 구현 방안</h2>
  <p style="${pStyle}">${(plan.solution.coreTechnologyAndFeatures || "").replace(/\n/g, "<br/>")}</p>

  <h2 style="${h2Style}">2-2. 경쟁사 대비 차별성 및 기술적 해자</h2>
  <p style="${pStyle}">${(plan.solution.competitorDifferentiation || "").replace(/\n/g, "<br/>")}</p>

  ${
    plan.solution.competitorTable && plan.solution.competitorTable.length > 0
      ? `
  <h3 style="${h3Style}">■ 경쟁 제품 및 대체재 비교 분석표</h3>
  <table border="1" cellspacing="0" cellpadding="7" style="${tableStyle}">
    <thead>
      <tr>
        <th style="${thStyle}; width: 22%;">비교 항목</th>
        <th style="${thStyle}; width: 30%; background-color: #e0f2fe; color: #0369a1;">당사 솔루션 (Ziwon)</th>
        <th style="${thStyle}; width: 24%;">경쟁사 A (기존 외산)</th>
        <th style="${thStyle}; width: 24%;">대체재 B</th>
      </tr>
    </thead>
    <tbody>
      ${plan.solution.competitorTable
        .map(
          (c) => `
      <tr>
        <td style="${tdStyle}; font-weight: bold; background-color: #f8fafc; text-align: center;">${c.category}</td>
        <td style="${tdStyle}; font-weight: bold; color: #0369a1;">${c.ourItem}</td>
        <td style="${tdStyle}">${c.competitorA}</td>
        <td style="${tdStyle}">${c.competitorB}</td>
      </tr>`
        )
        .join("")}
    </tbody>
  </table>`
      : ""
  }

  <h2 style="${h2Style}">2-3. 개발 및 사업화 로드맵</h2>
  <p style="${pStyle}">${(plan.solution.implementationPlan || "").replace(/\n/g, "<br/>")}</p>

  ${
    plan.solution.roadmapTable && plan.solution.roadmapTable.length > 0
      ? `
  <h3 style="${h3Style}">■ 협약 기간 내 세부 마일스톤 및 산출물</h3>
  <table border="1" cellspacing="0" cellpadding="7" style="${tableStyle}">
    <thead>
      <tr>
        <th style="${thStyle}; width: 18%;">추진 분기</th>
        <th style="${thStyle}; width: 26%;">목표 마일스톤</th>
        <th style="${thStyle}; width: 36%;">주요 활동 내역</th>
        <th style="${thStyle}; width: 20%;">최종 산출물</th>
      </tr>
    </thead>
    <tbody>
      ${plan.solution.roadmapTable
        .map(
          (r) => `
      <tr>
        <td style="${tdStyle}; font-weight: bold; text-align: center; background-color: #f8fafc;">${r.quarter}</td>
        <td style="${tdStyle}; font-weight: bold;">${r.milestone}</td>
        <td style="${tdStyle}">${r.keyActivities}</td>
        <td style="${tdStyle}; color: #047857;">${r.output}</td>
      </tr>`
        )
        .join("")}
    </tbody>
  </table>`
      : ""
  }
</div>
  `.trim();

  // ────────────────────────────────────────────
  // Page 4: 3. 성장전략 (Scale-up) & 4. 팀 구성 (Team)
  // ────────────────────────────────────────────
  const page4Html = `
<div style="font-family: '맑은 고딕', sans-serif; font-size: 10pt; line-height: 160%; color: #000000; width: 100%; box-sizing: border-box;">
  <!-- 3. 성장전략 (Scale-up) -->
  <h1 style="${h1Style}">3. 성장전략 (Scale-up)</h1>

  <h2 style="${h2Style}">3-1. 비즈니스 모델(BM) 및 수익 구조</h2>
  <p style="${pStyle}">${(plan.scaleUp.businessModelAndRevenue || "").replace(/\n/g, "<br/>")}</p>

  <h2 style="${h2Style}">3-2. 초기 시장 진입 및 마케팅 전략</h2>
  <p style="${pStyle}">${(plan.scaleUp.marketEntryAndMarketing || "").replace(/\n/g, "<br/>")}</p>

  <h2 style="${h2Style}">3-3. 자금 조달 및 예산 집행 계획</h2>
  <p style="${pStyle}">${(plan.scaleUp.fundingAndBudgetPlan || "").replace(/\n/g, "<br/>")}</p>

  ${
    plan.scaleUp.budgetTable && plan.scaleUp.budgetTable.length > 0
      ? `
  <h3 style="${h3Style}">■ 사업비 소요 예산 집행 계획표</h3>
  <table border="1" cellspacing="0" cellpadding="7" style="${tableStyle}">
    <thead>
      <tr>
        <th style="${thStyle}; width: 22%;">비목 구분</th>
        <th style="${thStyle}; width: 25%; text-align: right;">집행 금액(원)</th>
        <th style="${thStyle}; width: 15%;">비중(%)</th>
        <th style="${thStyle}; width: 38%;">세부 산출 근거 및 내역</th>
      </tr>
    </thead>
    <tbody>
      ${plan.scaleUp.budgetTable
        .map(
          (b) => `
      <tr>
        <td style="${tdStyle}; font-weight: bold; background-color: #f8fafc; text-align: center;">${b.category}</td>
        <td style="${tdStyle}; text-align: right; font-weight: bold; color: #047857;">${b.amount}</td>
        <td style="${tdStyle}; text-align: center;">${b.ratio}%</td>
        <td style="${tdStyle}">${b.description}</td>
      </tr>`
        )
        .join("")}
    </tbody>
  </table>`
      : ""
  }

  <!-- 4. 팀 구성 (Team) -->
  <h1 style="${h1Style}">4. 팀 구성 (Team)</h1>

  <h2 style="${h2Style}">4-1. 대표자 및 핵심 팀원 보유 역량</h2>
  <p style="${pStyle}">${(plan.team.founderAndTeamCompetency || (plan.team as any).founderCompetence || "").replace(/\n/g, "<br/>")}</p>

  ${
    plan.team.memberList && plan.team.memberList.length > 0
      ? `
  <h3 style="${h3Style}">■ 핵심 인력 구성 및 업무 분장 (R&R)</h3>
  <table border="1" cellspacing="0" cellpadding="7" style="${tableStyle}">
    <thead>
      <tr>
        <th style="${thStyle}; width: 22%;">직책 / 역할</th>
        <th style="${thStyle}; width: 20%;">성명 / 구분</th>
        <th style="${thStyle}; width: 33%;">주요 역량 및 실무 경력</th>
        <th style="${thStyle}; width: 25%;">담당 주요 업무</th>
      </tr>
    </thead>
    <tbody>
      ${plan.team.memberList
        .map(
          (m) => `
      <tr>
        <td style="${tdStyle}; font-weight: bold; background-color: #f8fafc; text-align: center;">${m.role}</td>
        <td style="${tdStyle}; text-align: center;">${m.nameOrAlias}</td>
        <td style="${tdStyle}">${m.competency}</td>
        <td style="${tdStyle}">${m.mainTask}</td>
      </tr>`
        )
        .join("")}
    </tbody>
  </table>`
      : ""
  }

  <h2 style="${h2Style}">4-2. 역할 분장 및 조직 구성 계획</h2>
  <p style="${pStyle}">${(plan.team.rolesAndResponsibilities || "").replace(/\n/g, "<br/>")}</p>

  <h2 style="${h2Style}">4-3. 외부 협력 네트워크 및 파트너십</h2>
  <p style="${pStyle}">${(plan.team.collaborationNetwork || "").replace(/\n/g, "<br/>")}</p>
</div>
  `.trim();

  return [
    { pageNum: 1, title: "표제부 & 창업아이템 개요(요약)", subtitle: "개요 및 요약표", html: page1Html },
    { pageNum: 2, title: "1. 문제인식 (Problem)", subtitle: "배경, 페인포인트, TAM-SAM-SOM", html: page2Html },
    { pageNum: 3, title: "2. 실현가능성 (Solution)", subtitle: "기술, 비교분석표, 로드맵", html: page3Html },
    { pageNum: 4, title: "3. 성장전략 & 4. 팀 구성", subtitle: "수익모델, 예산표, R&R 팀역량", html: page4Html },
  ];
}

/**
 * 전체 문서를 HWP 및 MS Word 호환 클립보드 HTML(단일 문자열)로 결합
 */
export function convertPsstToHwpHtml(plan: PsstBusinessPlanResult, programTitle?: string): string {
  const pages = convertPsstToHwpPages(plan, programTitle);
  return pages
    .map((p) => p.html)
    .join(
      '\n<div style="page-break-after: always; mso-break-type: section-break; height: 1px; clear: both; margin: 20px 0;"></div>\n'
    );
}

/**
 * 한글(HWP) 및 MS Word 클립보드에 멀티 MIME (text/html + text/plain) 쓰기
 */
export async function copyToHwpClipboard(htmlContent: string, plainFallback?: string): Promise<boolean> {
  if (typeof window === "undefined" || !navigator?.clipboard) {
    return false;
  }

  // Generate plain text if not provided
  const plainText =
    plainFallback ||
    htmlContent
      .replace(/<br\s*[\/]?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/tr>/gi, "\n")
      .replace(/<\/t[dh]>/gi, "\t")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .trim();

  try {
    if (typeof ClipboardItem !== "undefined") {
      const htmlBlob = new Blob([htmlContent], { type: "text/html" });
      const textBlob = new Blob([plainText], { type: "text/plain" });

      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": htmlBlob,
          "text/plain": textBlob,
        }),
      ]);
      return true;
    } else {
      await navigator.clipboard.writeText(plainText);
      return true;
    }
  } catch (err) {
    console.warn("[copyToHwpClipboard] ClipboardItem write failed, falling back to text:", err);
    try {
      await navigator.clipboard.writeText(plainText);
      return true;
    } catch {
      return false;
    }
  }
}
