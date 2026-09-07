import { PsstBusinessPlanResult } from "@/lib/ai/psst-generator";

function escapeXml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Creates standard Hancom HWPX (Open XML) files from PSST business plan structures
 */
export function buildHwpxSectionXml(plan: PsstBusinessPlanResult, programTitle?: string): string {
  const safePlan = plan || ({} as any);
  const overview = safePlan.overview || {};
  const problem = safePlan.problem || {};
  const solution = safePlan.solution || {};
  const scaleUp = safePlan.scaleUp || {};
  const team = safePlan.team || {};

  let pId = 1;
  const nextId = () => `p_${pId++}`;

  const makePara = (text: string, bold: boolean = false, size: number = 1000, align: string = "LEFT", mb: number = 200) => {
    return `
    <hp:p id="${nextId()}" paraPrIDRef="0">
      <hp:run charPrIDRef="${bold ? '1' : '0'}">
        <hp:t>${escapeXml(text)}</hp:t>
      </hp:run>
    </hp:p>`;
  };

  const makeHeading = (text: string, level: number = 1) => {
    const symbol = level === 1 ? "■" : level === 2 ? "□" : "○";
    return `
    <hp:p id="${nextId()}" paraPrIDRef="0">
      <hp:run charPrIDRef="2">
        <hp:t>${symbol} ${escapeXml(text)}</hp:t>
      </hp:run>
    </hp:p>`;
  };

  const makeTableCell = (content: string, isHeader: boolean = false, colSpan: number = 1) => {
    return `
      <hp:tc colSpan="${colSpan}" hasMargin="1">
        <hp:cellAddr colAddr="0" rowAddr="0"/>
        <hp:cellSpan colSpan="${colSpan}" rowSpan="1"/>
        <hp:cellMargin left="283" right="283" top="141" bottom="141"/>
        <hp:subList>
          <hp:p id="${nextId()}" paraPrIDRef="0">
            <hp:run charPrIDRef="${isHeader ? '1' : '0'}">
              <hp:t>${escapeXml(content)}</hp:t>
            </hp:run>
          </hp:p>
        </hp:subList>
      </hp:tc>`;
  };

  const makeTable2Col = (rows: Array<[string, string]>) => {
    let trs = "";
    rows.forEach(([label, value]) => {
      trs += `
      <hp:tr>
        ${makeTableCell(label, true, 1)}
        ${makeTableCell(value, false, 2)}
      </hp:tr>`;
    });

    return `
    <hp:p id="${nextId()}">
      <hp:run>
        <hp:tbl rowCnt="${rows.length}" colCnt="3" cellSpacing="0" borderFillIDRef="1">
          <hp:sz width="42520" height="0"/>
          ${trs}
        </hp:tbl>
      </hp:run>
    </hp:p>`;
  };

  let body = "";

  // Title Box Table
  body += makeTable2Col([
    ["지원사업명", programTitle || "중소벤처기업부 정부지원사업"],
    ["사업계획서 제목", overview.title || "혁신 성장 창업 아이템 사업계획서"],
    ["기업명 / 산업분야", `${overview.companyName || "미기재"} / ${overview.industry || "IT, SaaS"}`],
    ["총 사업비 / 목표일정", `${overview.summaryTable?.targetBudget || "100,000,000원"} / 10개월`],
  ]);

  body += makePara("", false, 500);

  // 1. Problem
  body += makeHeading("1. 문제 인식 (Problem)", 1);
  body += makeHeading("1-1. 개발 동기 및 시장의 고통(Pain Point)", 2);
  body += makePara(problem.marketPainPoint || "창업 아이템의 배경 및 핵심 해결 과제");
  body += makeHeading("1-2. 목표 고객 정의 및 고객 요구사항", 2);
  body += makePara(problem.targetCustomerProblem || "타깃 고객층 분석 및 당면 문제");
  body += makeHeading("1-3. 개발 필요성 및 진입 기회", 2);
  body += makePara(problem.developmentNecessity || "기존 솔루션의 한계점과 진입 기회");

  body += makePara("", false, 500);

  // 2. Solution
  body += makeHeading("2. 실현 가능성 및 개발 방안 (Solution)", 1);
  body += makeHeading("2-1. 창업 아이템의 핵심 기능 및 기술", 2);
  body += makePara(solution.coreTechnologyAndFeatures || "핵심 기술 및 솔루션 개요");
  body += makeHeading("2-2. 개발 로드맵 및 단계별 마일스톤", 2);
  body += makePara(solution.implementationPlan || "단계별 개발 계획");
  body += makeHeading("2-3. 경쟁사 대비 독보적 우위 요소", 2);
  body += makePara(solution.competitorDifferentiation || "독창적 경쟁 우위");

  body += makePara("", false, 500);

  // 3. Scale-up
  body += makeHeading("3. 성장 전략 및 사업화 방안 (Scale-up)", 1);
  body += makeHeading("3-1. 비즈니스 모델 및 수익 구조", 2);
  body += makePara(scaleUp.businessModelAndRevenue || "BM 및 과금 체계");
  body += makeHeading("3-2. 국내외 판로 개척 및 마케팅 전략", 2);
  body += makePara(scaleUp.marketEntryAndMarketing || "마케팅 로드맵");
  body += makeHeading("3-3. 사업비 소요 명세 및 예산 집행 계획", 2);
  body += makePara(scaleUp.fundingAndBudgetPlan || "예산 집행 상세 내역");

  body += makePara("", false, 500);

  // 4. Team
  body += makeHeading("4. 팀 구성 및 보유 역량 (Team)", 1);
  body += makeHeading("4-1. 대표자 및 핵심 팀원 보유 역량", 2);
  body += makePara(team.founderAndTeamCompetency || "대표자 이력 및 전문성");
  body += makeHeading("4-2. 전담 인력 구성 및 추가 채용 계획", 2);
  body += makePara(team.rolesAndResponsibilities || "팀원 역할 분담");
  body += makeHeading("4-3. 협력 네트워크 및 외부 자문단", 2);
  body += makePara(team.collaborationNetwork || "산학연 협력 네트워크");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<hp:sec xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head" xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core">
  ${body}
</hp:sec>`;
}

export function buildHwpxManifestXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<ocf:manifest xmlns:ocf="urn:oasis:names:tc:opendocument:xmlns:container">
  <ocf:rootfiles>
    <ocf:rootfile full-path="Contents/content.hpf" media-type="application/hwp+zip"/>
  </ocf:rootfiles>
</ocf:manifest>`;
}

export function buildHwpxContentHpfXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="uid" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>PSST 사업계획서</dc:title>
    <dc:creator>Ziwon.AI</dc:creator>
  </metadata>
  <manifest>
    <item id="header" href="header.xml" media-type="application/xml"/>
    <item id="section0" href="section0.xml" media-type="application/xml"/>
    <item id="settings" href="settings.xml" media-type="application/xml"/>
  </manifest>
  <spine>
    <itemref idref="header"/>
    <itemref idref="section0"/>
  </spine>
</package>`;
}

export function buildHwpxHeaderXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<hh:head xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head" xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core" version="1.0">
  <hh:beginNum page="1" footnote="1" endnote="1" pic="1" tbl="1" equation="1"/>
  <hh:refList>
    <hh:fontfaces itemCnt="1">
      <hh:fontface lang="HANGUL" fontCnt="1">
        <hh:font id="0" face="맑은 고딕" type="TTF" isEmbedded="0"/>
      </hh:fontface>
    </hh:fontfaces>
    <hh:charProperties itemCnt="3">
      <hh:charPr id="0" height="1000" textColor="000000" fontFaceIDRef="0"/>
      <hh:charPr id="1" height="1000" textColor="000000" fontFaceIDRef="0" bold="1"/>
      <hh:charPr id="2" height="1200" textColor="003366" fontFaceIDRef="0" bold="1"/>
    </hh:charProperties>
    <hh:paraProperties itemCnt="1">
      <hh:paraPr id="0" align="LEFT" lineSpacing="160" lineSpacingType="PERCENT"/>
    </hh:paraProperties>
    <hh:borderFills itemCnt="2">
      <hh:borderFill id="1" backColor="FFFFFF">
        <hh:leftBorder type="SOLID" width="0.75pt" color="000000"/>
        <hh:rightBorder type="SOLID" width="0.75pt" color="000000"/>
        <hh:topBorder type="SOLID" width="0.75pt" color="000000"/>
        <hh:bottomBorder type="SOLID" width="0.75pt" color="000000"/>
      </hh:borderFill>
    </hh:borderFills>
  </hh:refList>
</hh:head>`;
}

export function buildHwpxSettingsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<ha:HWPApplicationSetting xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app">
  <ha:CaretPosition list="0" para="0" pos="0"/>
</ha:HWPApplicationSetting>`;
}

export function buildHwpxVersionXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<hh:version xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head" versionMajor="1" versionMinor="0"/>`;
}

/**
 * Trigger client-side HWPX file download
 */
export async function downloadHwpxDocument(plan: PsstBusinessPlanResult, programTitle?: string, fileName?: string) {
  try {
    const res = await fetch("/api/export/hwpx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, programTitle, fileName }),
    });

    if (!res.ok) {
      throw new Error(`Export failed with HTTP ${res.status}`);
    }

    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    const cleanName = (fileName || `${plan?.overview?.title || "PSST_사업계획서"}`).replace(/[/\\?%*:|"<>]/g, "_");
    a.download = `${cleanName}.hwpx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(downloadUrl);
    return true;
  } catch (err: any) {
    console.error("[HWPX Export Failed]:", err);
    return false;
  }
}
