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
 * - 본문: 맑은 고딕(또는 한컴 돋움) 10pt, 줄간격 160%, 단락 간격 5pt
 * - 표(Table): table-layout: fixed, border="1", cellspacing="0", cellpadding="6", width="100%"
 * - 셀(th/td): border: 0.75pt solid #000000, bgcolor 명시, colgroup 너비 고정
 */
export function convertPsstToHwpPages(plan: PsstBusinessPlanResult, programTitle?: string): PsstPageData[] {
  // 한글(HWP) 클립보드 파서 전용 정밀 스타일 정의 (따옴표 충돌 방지: 작은따옴표 사용)
  const tableStyle =
    "border-collapse: collapse; width: 100%; border: 1.5pt solid #000000; margin: 8pt 0 12pt 0; font-family: '맑은 고딕', 'Malgun Gothic', sans-serif; font-size: 10pt; background-color: #ffffff; table-layout: fixed; box-sizing: border-box;";
  const thStyle =
    "border: 0.75pt solid #000000; background-color: #f1f5f9; padding: 6pt 8pt; font-weight: bold; text-align: center; font-family: '맑은 고딕', 'Malgun Gothic', sans-serif; font-size: 10pt; color: #000000; word-break: break-all;";
  const tdStyle =
    "border: 0.75pt solid #000000; padding: 6pt 8pt; font-family: '맑은 고딕', 'Malgun Gothic', sans-serif; font-size: 10pt; line-height: 160%; vertical-align: middle; background-color: #ffffff; color: #0f172a; word-break: break-all;";
  const h1Style =
    "font-family: '맑은 고딕', 'Malgun Gothic', sans-serif; font-size: 14pt; font-weight: bold; margin: 14pt 0 6pt 0; padding: 0 0 3pt 0; color: #000000; border-bottom: 2pt solid #000000;";
  const h2Style =
    "font-family: '맑은 고딕', 'Malgun Gothic', sans-serif; font-size: 11.5pt; font-weight: bold; margin: 10pt 0 4pt 0; padding: 0; color: #1e3a8a;";
  const h3Style =
    "font-family: '맑은 고딕', 'Malgun Gothic', sans-serif; font-size: 10pt; font-weight: bold; margin: 8pt 0 3pt 0; padding: 0; color: #0f172a;";
  const pStyle =
    "font-family: '맑은 고딕', 'Malgun Gothic', sans-serif; font-size: 10pt; line-height: 160%; margin: 0 0 5pt 0; padding: 0; color: #1e293b; text-align: justify; word-break: keep-all;";

  // [보호 로직] 저장된 플랜 또는 생성된 플랜의 섹션 누락 시 런타임 오류 방지
  const safePlan = plan || ({} as any);
  const overview = safePlan.overview || {};
  const problem = safePlan.problem || {};
  const solution = safePlan.solution || {};
  const scaleUp = safePlan.scaleUp || {};
  const team = safePlan.team || {};

  // ────────────────────────────────────────────
  // Page 1: 표제부 & 창업아이템 개요(요약)
  // ────────────────────────────────────────────
  const page1Html = `
<div style="font-family: '맑은 고딕', 'Malgun Gothic', sans-serif; font-size: 10pt; line-height: 160%; color: #000000; width: 100%; box-sizing: border-box;">
  <!-- 공문서 공식 표제부 박스 -->
  <div style="text-align: center; border: 2pt solid #000000; padding: 14pt; margin-bottom: 16pt; background-color: #f8fafc; box-sizing: border-box;" bgcolor="#f8fafc">
    <div style="font-size: 11pt; font-weight: bold; color: #475569; margin-bottom: 4pt;">
      [${programTitle || "중소벤처기업부 표준 서식"}] 사업계획서
    </div>
    <div style="font-size: 16pt; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; margin: 4pt 0;">
      ${overview.title || "혁신 성장 사업계획서"}
    </div>
    <div style="font-size: 10pt; color: #64748b; margin-top: 6pt;">
      기업명: <b>${overview.companyName || "미기재"}</b> | 산업 분야: <b>${overview.industry || "정보통신(ICT/SaaS)"}</b>
    </div>
  </div>

  <!-- 창업아이템 개요(요약) -->
  <h1 style="${h1Style}">창업아이템 개요 (요약)</h1>
  <p style="${pStyle}">${(overview.itemSummary || "아이템 개요가 작성 중입니다.").replace(/\n/g, "<br/>")}</p>

  ${
    overview.summaryTable
      ? `
  <h3 style="${h3Style}">■ 아이템 핵심 요약표</h3>
  <table border="1" cellspacing="0" cellpadding="6" width="100%" style="${tableStyle}">
    <colgroup>
      <col width="25%" />
      <col width="75%" />
    </colgroup>
    <thead>
      <tr>
        <th width="25%" bgcolor="#f1f5f9" align="center" style="${thStyle}">항목 구분</th>
        <th width="75%" bgcolor="#f1f5f9" align="center" style="${thStyle}">등록 및 계획 내용</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td width="25%" bgcolor="#f8fafc" align="center" style="${tdStyle}; font-weight: bold; background-color: #f8fafc; text-align: center;">아이템 범주</td>
        <td width="75%" style="${tdStyle}">${overview.summaryTable.itemCategory || "-"}</td>
      </tr>
      <tr>
        <td width="25%" bgcolor="#f8fafc" align="center" style="${tdStyle}; font-weight: bold; background-color: #f8fafc; text-align: center;">주요 타겟</td>
        <td width="75%" style="${tdStyle}">${overview.summaryTable.targetUsers || "-"}</td>
      </tr>
      <tr>
        <td width="25%" bgcolor="#f8fafc" align="center" style="${tdStyle}; font-weight: bold; background-color: #f8fafc; text-align: center;">핵심 기능</td>
        <td width="75%" style="${tdStyle}">${overview.summaryTable.coreFeature || "-"}</td>
      </tr>
      <tr>
        <td width="25%" bgcolor="#f8fafc" align="center" style="${tdStyle}; font-weight: bold; background-color: #f8fafc; text-align: center;">수익 모델 (BM)</td>
        <td width="75%" style="${tdStyle}">${overview.summaryTable.monetization || "-"}</td>
      </tr>
      <tr>
        <td width="25%" bgcolor="#f8fafc" align="center" style="${tdStyle}; font-weight: bold; background-color: #f8fafc; text-align: center;">신청/소요 예산</td>
        <td width="75%" style="${tdStyle}; font-weight: bold; color: #047857;">${overview.summaryTable.targetBudget || "-"}</td>
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
<div style="font-family: '맑은 고딕', 'Malgun Gothic', sans-serif; font-size: 10pt; line-height: 160%; color: #000000; width: 100%; box-sizing: border-box;">
  <h1 style="${h1Style}">1. 문제인식 (Problem)</h1>
  
  <h2 style="${h2Style}">1-1. 개발 및 사업화의 배경과 필요성</h2>
  <p style="${pStyle}">${(problem.developmentNecessity || "개발 및 사업화 배경 내용이 작성 중입니다.").replace(/\n/g, "<br/>")}</p>

  <h2 style="${h2Style}">1-2. 시장 및 고객의 핵심 문제점 (Pain Points)</h2>
  <p style="${pStyle}">${(problem.marketPainPoint || "시장 및 고객 문제점 내용이 작성 중입니다.").replace(/\n/g, "<br/>")}</p>

  <h2 style="${h2Style}">1-3. 타겟 고객의 불편 사항 및 기존 한계</h2>
  <p style="${pStyle}">${(problem.targetCustomerProblem || "타겟 고객의 불편 사항 및 한계점이 작성 중입니다.").replace(/\n/g, "<br/>")}</p>

  ${
    problem.tamSamSom
      ? `
  <h3 style="${h3Style}">■ 타겟 시장 규모 분석 (TAM-SAM-SOM)</h3>
  <table border="1" cellspacing="0" cellpadding="6" width="100%" style="${tableStyle}">
    <colgroup>
      <col width="33%" />
      <col width="33%" />
      <col width="34%" />
    </colgroup>
    <thead>
      <tr>
        <th width="33%" bgcolor="#f1f5f9" align="center" style="${thStyle}">TAM (전체 시장)</th>
        <th width="33%" bgcolor="#f1f5f9" align="center" style="${thStyle}">SAM (유효 시장)</th>
        <th width="34%" bgcolor="#f1f5f9" align="center" style="${thStyle}">SOM (수익 시장)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td width="33%" align="center" style="${tdStyle}; text-align: center;">${problem.tamSamSom.tam || "-"}</td>
        <td width="33%" align="center" style="${tdStyle}; text-align: center;">${problem.tamSamSom.sam || "-"}</td>
        <td width="34%" align="center" style="${tdStyle}; text-align: center; font-weight: bold; color: #0369a1;">${problem.tamSamSom.som || "-"}</td>
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
  const competitorRows = Array.isArray(solution.competitorTable) ? solution.competitorTable : [];
  const roadmapRows = Array.isArray(solution.roadmapTable) ? solution.roadmapTable : [];

  const page3Html = `
<div style="font-family: '맑은 고딕', 'Malgun Gothic', sans-serif; font-size: 10pt; line-height: 160%; color: #000000; width: 100%; box-sizing: border-box;">
  <h1 style="${h1Style}">2. 실현가능성 (Solution)</h1>

  <h2 style="${h2Style}">2-1. 핵심 기술 및 구현 방안</h2>
  <p style="${pStyle}">${(solution.coreTechnologyAndFeatures || "핵심 기술 및 구현 방안이 작성 중입니다.").replace(/\n/g, "<br/>")}</p>

  <h2 style="${h2Style}">2-2. 경쟁사 대비 차별성 및 기술적 해자</h2>
  <p style="${pStyle}">${(solution.competitorDifferentiation || "경쟁사 차별성 내용이 작성 중입니다.").replace(/\n/g, "<br/>")}</p>

  ${
    competitorRows.length > 0
      ? `
  <h3 style="${h3Style}">■ 경쟁 제품 및 대체재 비교 분석표</h3>
  <table border="1" cellspacing="0" cellpadding="6" width="100%" style="${tableStyle}">
    <colgroup>
      <col width="22%" />
      <col width="30%" />
      <col width="24%" />
      <col width="24%" />
    </colgroup>
    <thead>
      <tr>
        <th width="22%" bgcolor="#f1f5f9" align="center" style="${thStyle}">비교 항목</th>
        <th width="30%" bgcolor="#e0f2fe" align="center" style="${thStyle}; background-color: #e0f2fe; color: #0369a1;">당사 솔루션 (Ziwon)</th>
        <th width="24%" bgcolor="#f1f5f9" align="center" style="${thStyle}">경쟁사 A (기존 외산)</th>
        <th width="24%" bgcolor="#f1f5f9" align="center" style="${thStyle}">대체재 B</th>
      </tr>
    </thead>
    <tbody>
      ${competitorRows
        .map(
          (c: any) => `
      <tr>
        <td width="22%" bgcolor="#f8fafc" align="center" style="${tdStyle}; font-weight: bold; background-color: #f8fafc; text-align: center;">${c.category || "-"}</td>
        <td width="30%" style="${tdStyle}; font-weight: bold; color: #0369a1;">${c.ourItem || "-"}</td>
        <td width="24%" style="${tdStyle}">${c.competitorA || "-"}</td>
        <td width="24%" style="${tdStyle}">${c.competitorB || "-"}</td>
      </tr>`
        )
        .join("")}
    </tbody>
  </table>`
      : ""
  }

  <h2 style="${h2Style}">2-3. 개발 및 사업화 로드맵</h2>
  <p style="${pStyle}">${(solution.implementationPlan || "개발 및 사업화 로드맵이 작성 중입니다.").replace(/\n/g, "<br/>")}</p>

  ${
    roadmapRows.length > 0
      ? `
  <h3 style="${h3Style}">■ 협약 기간 내 세부 마일스톤 및 산출물</h3>
  <table border="1" cellspacing="0" cellpadding="6" width="100%" style="${tableStyle}">
    <colgroup>
      <col width="18%" />
      <col width="26%" />
      <col width="36%" />
      <col width="20%" />
    </colgroup>
    <thead>
      <tr>
        <th width="18%" bgcolor="#f1f5f9" align="center" style="${thStyle}">추진 분기</th>
        <th width="26%" bgcolor="#f1f5f9" align="center" style="${thStyle}">목표 마일스톤</th>
        <th width="36%" bgcolor="#f1f5f9" align="center" style="${thStyle}">주요 활동 내역</th>
        <th width="20%" bgcolor="#f1f5f9" align="center" style="${thStyle}">최종 산출물</th>
      </tr>
    </thead>
    <tbody>
      ${roadmapRows
        .map(
          (r: any) => `
      <tr>
        <td width="18%" bgcolor="#f8fafc" align="center" style="${tdStyle}; font-weight: bold; text-align: center; background-color: #f8fafc;">${r.quarter || "-"}</td>
        <td width="26%" style="${tdStyle}; font-weight: bold;">${r.milestone || "-"}</td>
        <td width="36%" style="${tdStyle}">${r.keyActivities || "-"}</td>
        <td width="20%" style="${tdStyle}; color: #047857;">${r.output || "-"}</td>
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
  const budgetRows = Array.isArray(scaleUp.budgetTable) ? scaleUp.budgetTable : [];
  const memberRows = Array.isArray(team.memberList) ? team.memberList : [];

  const page4Html = `
<div style="font-family: '맑은 고딕', 'Malgun Gothic', sans-serif; font-size: 10pt; line-height: 160%; color: #000000; width: 100%; box-sizing: border-box;">
  <!-- 3. 성장전략 (Scale-up) -->
  <h1 style="${h1Style}">3. 성장전략 (Scale-up)</h1>

  <h2 style="${h2Style}">3-1. 비즈니스 모델(BM) 및 수익 구조</h2>
  <p style="${pStyle}">${(scaleUp.businessModelAndRevenue || "비즈니스 모델 및 수익 구조가 작성 중입니다.").replace(/\n/g, "<br/>")}</p>

  <h2 style="${h2Style}">3-2. 초기 시장 진입 및 마케팅 전략</h2>
  <p style="${pStyle}">${(scaleUp.marketEntryAndMarketing || "시장 진입 및 마케팅 전략이 작성 중입니다.").replace(/\n/g, "<br/>")}</p>

  <h2 style="${h2Style}">3-3. 자금 조달 및 예산 집행 계획</h2>
  <p style="${pStyle}">${(scaleUp.fundingAndBudgetPlan || "자금 조달 및 예산 계획이 작성 중입니다.").replace(/\n/g, "<br/>")}</p>

  ${
    budgetRows.length > 0
      ? `
  <h3 style="${h3Style}">■ 사업비 소요 예산 집행 계획표</h3>
  <table border="1" cellspacing="0" cellpadding="6" width="100%" style="${tableStyle}">
    <colgroup>
      <col width="22%" />
      <col width="24%" />
      <col width="16%" />
      <col width="38%" />
    </colgroup>
    <thead>
      <tr>
        <th width="22%" bgcolor="#f1f5f9" align="center" style="${thStyle}">비목 구분</th>
        <th width="24%" bgcolor="#f1f5f9" align="right" style="${thStyle}; text-align: right;">집행 금액(원)</th>
        <th width="16%" bgcolor="#f1f5f9" align="center" style="${thStyle}">비중(%)</th>
        <th width="38%" bgcolor="#f1f5f9" align="center" style="${thStyle}">세부 산출 근거 및 내역</th>
      </tr>
    </thead>
    <thead>
    <tbody>
      ${budgetRows
        .map(
          (b: any) => `
      <tr>
        <td width="22%" bgcolor="#f8fafc" align="center" style="${tdStyle}; font-weight: bold; background-color: #f8fafc; text-align: center;">${b.category || "-"}</td>
        <td width="24%" align="right" style="${tdStyle}; text-align: right; font-weight: bold; color: #047857;">${b.amount || "-"}</td>
        <td width="16%" align="center" style="${tdStyle}; text-align: center;">${b.ratio != null ? b.ratio + "%" : "-"}</td>
        <td width="38%" style="${tdStyle}">${b.description || "-"}</td>
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
  <p style="${pStyle}">${(team.founderAndTeamCompetency || (team as any).founderCompetence || "대표자 및 팀원 역량이 작성 중입니다.").replace(/\n/g, "<br/>")}</p>

  ${
    memberRows.length > 0
      ? `
  <h3 style="${h3Style}">■ 핵심 인력 구성 및 업무 분장 (R&R)</h3>
  <table border="1" cellspacing="0" cellpadding="6" width="100%" style="${tableStyle}">
    <colgroup>
      <col width="20%" />
      <col width="20%" />
      <col width="35%" />
      <col width="25%" />
    </colgroup>
    <thead>
      <tr>
        <th width="20%" bgcolor="#f1f5f9" align="center" style="${thStyle}">직책 / 역할</th>
        <th width="20%" bgcolor="#f1f5f9" align="center" style="${thStyle}">성명 / 구분</th>
        <th width="35%" bgcolor="#f1f5f9" align="center" style="${thStyle}">주요 역량 및 실무 경력</th>
        <th width="25%" bgcolor="#f1f5f9" align="center" style="${thStyle}">담당 주요 업무</th>
      </tr>
    </thead>
    <tbody>
      ${memberRows
        .map(
          (m: any) => `
      <tr>
        <td width="20%" bgcolor="#f8fafc" align="center" style="${tdStyle}; font-weight: bold; background-color: #f8fafc; text-align: center;">${m.role || "-"}</td>
        <td width="20%" align="center" style="${tdStyle}; text-align: center;">${m.nameOrAlias || "-"}</td>
        <td width="35%" style="${tdStyle}">${m.competency || "-"}</td>
        <td width="25%" style="${tdStyle}">${m.mainTask || "-"}</td>
      </tr>`
        )
        .join("")}
    </tbody>
  </table>`
      : ""
  }

  <h2 style="${h2Style}">4-2. 역할 분장 및 조직 구성 계획</h2>
  <p style="${pStyle}">${(team.rolesAndResponsibilities || "역할 분장 및 조직 구성 계획이 작성 중입니다.").replace(/\n/g, "<br/>")}</p>

  <h2 style="${h2Style}">4-3. 외부 협력 네트워크 및 파트너십</h2>
  <p style="${pStyle}">${(team.collaborationNetwork || "외부 협력 네트워크 내용이 작성 중입니다.").replace(/\n/g, "<br/>")}</p>
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
 * 한컴 한글 인식 전용 페이지 나눔: mso-break-type 및 page-break-before
 */
export function convertPsstToHwpHtml(plan: PsstBusinessPlanResult, programTitle?: string): string {
  const pages = convertPsstToHwpPages(plan, programTitle);
  return pages
    .map((p) => p.html)
    .join(
      '\n<br style="page-break-before: always; clear: both;" />\n<div style="page-break-after: always; mso-break-type: section-break; height: 1px; clear: both; margin: 16pt 0;"></div>\n'
    );
}

/**
 * 한글(HWP) 및 MS Word 클립보드에 멀티 MIME (text/html + text/plain) 쓰기
 * Windows CF_HTML / Hancom HWP 최적화 StartFragment / EndFragment 래핑
 */
export async function copyToHwpClipboard(htmlContent: string, plainFallback?: string): Promise<boolean> {
  if (typeof window === "undefined" || !navigator?.clipboard) {
    return false;
  }

  // 한컴오피스 한글 및 MS Word 클립보드 파서가 가장 완벽하게 인식하는 구조로 래핑
  const fullWrappedHtml = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <title>사업계획서</title>
  <style>
    @page {
      size: 210mm 297mm;
      margin: 20mm;
    }
    body, p, div, span, table, th, td {
      font-family: '맑은 고딕', 'Malgun Gothic', '한컴 돋움', sans-serif;
      font-size: 10pt;
      line-height: 160%;
      color: #000000;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      border: 1.5pt solid #000000;
      margin: 8pt 0 12pt 0;
    }
    th {
      border: 0.75pt solid #000000;
      background-color: #f1f5f9;
      padding: 6pt 8pt;
      font-weight: bold;
      text-align: center;
    }
    td {
      border: 0.75pt solid #000000;
      padding: 6pt 8pt;
    }
  </style>
</head>
<body style="font-family: '맑은 고딕', 'Malgun Gothic', sans-serif; font-size: 10pt; line-height: 160%; color: #000000; margin: 0; padding: 0;">
${htmlContent}
</body>
</html>`;

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
      const htmlBlob = new Blob([fullWrappedHtml], { type: "text/html" });
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
