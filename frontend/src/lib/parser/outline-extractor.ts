/**
 * Ziwon.AI Custom Outline & Grant Nature Classifier Engine
 * 
 * Extracts custom outlines/headings from HWP/PDF application forms and classifies
 * whether a grant is a cash grant vs non-cash incubation/voucher/contest to prevent
 * budget hallucinations.
 */

export type GrantType =
  | "CASH_GRANT"             // Direct cash funding (e.g. 50M ~ 100M KRW commercialization fund)
  | "NON_CASH_INCUBATION"    // Office/space incubation (e.g. Incubating rooms, Startup Park)
  | "VOUCHER_SERVICE"        // Vouchers, consulting, IP patent filing, marketing services
  | "CONTEST";               // Ideas contest, hackathon, competition awards

export interface ExtractedOutlineResult {
  grantType: GrantType;
  grantDescription: string;
  maxBudgetWon?: number;
  outlines: string[];
  hasCustomOutline: boolean;
}

/**
 * Classify grant nature (Cash grant vs Non-cash incubation vs Voucher vs Contest)
 */
export function classifyGrantType(
  title: string = "",
  supportContent: string = "",
  rawContent: string = ""
): { grantType: GrantType; grantDescription: string; maxBudgetWon?: number } {
  const combined = `${title} ${supportContent} ${rawContent}`.toLowerCase();

  // 1. Check for Incubation / Office Space (Non-cash)
  const isIncubation =
    combined.includes("입주") ||
    combined.includes("보육센터") ||
    combined.includes("인큐베이팅") ||
    combined.includes("인큐베이터") ||
    combined.includes("창업보육") ||
    combined.includes("사무공간") ||
    combined.includes("스타트업파크") ||
    combined.includes("코워킹") ||
    combined.includes("오피스") ||
    combined.includes("공간지원");

  // 2. Check for Contest / Award
  const isContest =
    combined.includes("공모전") ||
    combined.includes("경진대회") ||
    combined.includes("챌린지") ||
    combined.includes("해커톤") ||
    combined.includes("시상금") ||
    combined.includes("상금");

  // 3. Check for Voucher / Service
  const isVoucher =
    combined.includes("바우처") ||
    combined.includes("컨설팅") ||
    combined.includes("멘토링") ||
    combined.includes("지재권 출원 지원") ||
    combined.includes("인증 지원") ||
    combined.includes("교육 지원");

  // 4. Check for Cash commercialization grant (사업화자금, 정부지원금, 최대 ~억원, ~천만원)
  const isCashGrant =
    combined.includes("사업화 자금") ||
    combined.includes("사업화자금") ||
    combined.includes("정부지원금") ||
    combined.includes("개발비 지원") ||
    combined.includes("시제품 제작비") ||
    combined.includes("예비창업패키지") ||
    combined.includes("초기창업패키지") ||
    combined.includes("창업도약패키지") ||
    combined.includes("디딤돌") ||
    combined.includes("r&d");

  // Extract explicit max budget if available
  let maxBudgetWon: number | undefined = undefined;
  const budgetMatch = combined.match(/최대\s*([0-9,.]+)\s*(억|천만|백만)\s*원/i);
  if (budgetMatch) {
    const num = parseFloat(budgetMatch[1].replace(/,/g, ""));
    const unit = budgetMatch[2];
    if (unit === "억") maxBudgetWon = num * 100_000_000;
    else if (unit === "천만") maxBudgetWon = num * 10_000_000;
    else if (unit === "백만") maxBudgetWon = num * 1_000_000;
  }

  // Priority Decision
  if (isIncubation && !isCashGrant) {
    return {
      grantType: "NON_CASH_INCUBATION",
      grantDescription: "창업 입주 공간 및 맞춤형 보육 지원 (비현금성 지원사업 — 직접 사업비 예산 미편성)",
      maxBudgetWon: undefined,
    };
  }

  if (isContest && !isCashGrant) {
    return {
      grantType: "CONTEST",
      grantDescription: "아이디어 창업 공모전 / 경진대회 (상장 및 상금 포상)",
      maxBudgetWon,
    };
  }

  if (isVoucher && !isCashGrant) {
    return {
      grantType: "VOUCHER_SERVICE",
      grantDescription: "바우처 및 전문 컨설팅 / 멘토링 연계 지원",
      maxBudgetWon,
    };
  }

  return {
    grantType: "CASH_GRANT",
    grantDescription: maxBudgetWon
      ? `직접 사업화 자금 지원사업 (최대 ${(maxBudgetWon / 10_000_000).toLocaleString()}천만원 한도)`
      : "정부 지원금 사업화 자금 지원사업",
    maxBudgetWon,
  };
}

/**
 * Extract clean custom outline headings from HWP/PDF form text
 */
export function extractCustomOutlines(docTexts: string[] = [], noticeText: string = ""): string[] {
  const combinedText = [...docTexts, noticeText].join("\n");
  if (!combinedText || combinedText.trim().length < 30) {
    return [];
  }

  const lines = combinedText.split("\n");
  const extractedHeadings: string[] = [];

  // Regex patterns for outline section titles in Korean forms
  // e.g., "1. 문제인식", "2. 실현가능성", "I. 기업 개요", "1-1. 개발 동기", "가. 사업화 방안"
  const outlineRegex = /^(?:\[?(?:서식|양식|붙임)?[^\]]*\]?\s*)?(?:(?:[1-9]|1[0-9])[\.\)]\s+|[I|V|X]+[\.\)]\s+|[가-힣][\.\)]\s+|[1-9]-[1-9][\.\)]\s+)([^\n\r]{2,40})/i;

  const ignoreKeywords = [
    "안내사항",
    "유의사항",
    "개인정보",
    "동의서",
    "서명",
    "제출처",
    "문의처",
    "별첨",
    "참고",
    "작성요령",
    "작성방법",
    "주의사항",
    "붙임문서",
    "서약서",
  ];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length < 3 || trimmed.length > 50) continue;

    const match = trimmed.match(outlineRegex);
    if (match) {
      const heading = trimmed.replace(/[\[\]]/g, "").trim();

      // Check if it's noise/boilerplate
      const isNoise = ignoreKeywords.some((kw) => heading.includes(kw));
      if (!isNoise && !extractedHeadings.includes(heading)) {
        extractedHeadings.push(heading);
      }
    }
  }

  // Filter and limit to top realistic outline items (typically 3 ~ 8 sections)
  if (extractedHeadings.length >= 2 && extractedHeadings.length <= 12) {
    return extractedHeadings;
  }

  return [];
}

/**
 * Master parser combining grant classification and outline extraction
 */
export function analyzeProgramForPsst(
  title: string,
  supportContent: string,
  docTexts: string[] = [],
  rawContent: string = ""
): ExtractedOutlineResult {
  const { grantType, grantDescription, maxBudgetWon } = classifyGrantType(
    title,
    supportContent,
    rawContent
  );

  const outlines = extractCustomOutlines(docTexts, supportContent + " " + rawContent);

  return {
    grantType,
    grantDescription,
    maxBudgetWon,
    outlines,
    hasCustomOutline: outlines.length >= 2,
  };
}
