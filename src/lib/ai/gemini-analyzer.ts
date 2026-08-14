import { GoogleGenAI } from "@google/genai";

export interface ProgramAnalysisResult {
  targetEligibility: {
    minFounderAgeYears?: number;
    maxFounderAgeYears?: number;
    allowedRegions?: string[];
    allowedIndustries?: string[];
    requiredCertifications?: string[];
    summary: string;
  };
  budgetAndAmount: {
    maxAmountWon?: number;
    selfPaymentRatioPercent?: number;
    summary: string;
  };
  keySchedule: {
    applicationStartDate?: string;
    applicationEndDate?: string;
    summary: string;
  };
  extraPoints: {
    items: string[];
    summary: string;
  };
  excludedConditions: {
    items: string[];
    summary: string;
  };
  requiredDocuments: string[];
  summaryReport: string[];
}

// Initialize Gemini GenAI client
const apiKey = process.env.GEMINI_API_KEY || "";
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

/**
 * Clean JSON output from LLM markdown code blocks
 */
function cleanJsonString(str: string): string {
  return str
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();
}

/**
 * Fallback Analysis Mock when GEMINI_API_KEY is missing or API errors
 */
function generateFallbackAnalysis(programTitle: string, documentText: string): ProgramAnalysisResult {
  return {
    targetEligibility: {
      summary: "중소기업, 창업 7년 이내 소상공인 및 벤처기업",
    },
    budgetAndAmount: {
      summary: "공고문 참조 (사업별 상이)",
    },
    keySchedule: {
      summary: "공고문 내 접수 일정 확인 필요",
    },
    extraPoints: {
      items: ["벤처기업 인증", "여성기업", "특허/지식재산권 보유 기업"],
      summary: "우대 자격 보유 시 2~5점 가점 부여",
    },
    excludedConditions: {
      items: ["국세/지방세 체납 기업", "휴·폐업 중인 기업", "동일 사업 중복 수혜 기업"],
      summary: "체납 및 휴폐업 기업 지원 불가",
    },
    requiredDocuments: ["사업신청서 및 사업계획서", "사업자등록증명원", "국세/지방세 납세증명서"],
    summaryReport: [
      `${programTitle} 공고 파싱 완료.`,
      "제출 서류 및 자격요건을 사전 점검 후 신청해 주세요.",
      "자세한 사항은 첨부파일 공고문을 확인 바랍니다.",
    ],
  };
}

/**
 * Analyze Support Program Notice Document using Gemini 2.5/3.6 Flash AI
 */
export async function analyzeProgramWithGemini(
  programTitle: string,
  organizer: string,
  documentText: string
): Promise<ProgramAnalysisResult> {
  if (!ai || !apiKey) {
    console.warn("⚠️ GEMINI_API_KEY is not configured. Returning structured fallback analysis.");
    return generateFallbackAnalysis(programTitle, documentText);
  }

  const modelName = process.env.AI_GENERAL_MODEL || "gemini-2.5-flash";

  const prompt = `
[역할]
당신은 대한민국 정부 지원사업 분석 최고 전문가입니다.
아래에 제공된 지원사업 통합 공고 정보, 공공 API 원문 데이터, 첨부파일 원문 텍스트를 정밀 분석하여 중소기업/스타트업 대표가 한눈에 파악할 수 있도록 정확하고 구체적인 정보를 JSON 스키마로 추출하세요.

[사업 정보 및 공고 원문]
- 사업명: ${programTitle}
- 주관기관: ${organizer}

[분석할 전체 원문 텍스트]
${documentText.slice(0, 12000)}

[작성 지침]
1. 추상적이거나 일반적인 추측성 문구를 쓰지 말고, 본문 텍스트에 포함된 실제 지원조건(업력 몇 년 이내, 대상 지역, 업종, 지원 금액 숫자 등)을 구체적으로 적으세요.
2. 지원자격요건(targetEligibility.summary): 업력 조건, 지역 조건, 기업 형태(예: 창업 7년 이내 중소기업, 광주 소재 기업 등)를 명확히 포함하세요.
3. 지원규모(budgetAndAmount.summary): 총 예산 또는 기업당 최대 지원금액, 국비/지방비 자부담 비율 등을 구체적으로 명시하세요.
4. 가점/우대사항(extraPoints.items): 벤처기업, 여성기업, 특허, 이노비즈, 지역 기업 등 가점이나 우대되는 구체적 조건을 리스트업하세요.
5. 지원제외조건(excludedConditions.items): 체납, 휴폐업, 부도, 동 사업 중복 수혜 등 지원 불가 조건을 구체적으로 명시하세요.
6. 필수제출서류(requiredDocuments): 사업계획서, 사업자등록증, 납세증명서 등 필수 서류 이름을 명시하세요.
7. 핵심요약(summaryReport): 신청 대상과 혜택, 유의사항을 3문장으로 간결하고 명확하게 요약하세요.

[출력 요구사항 - 반드시 엄격한 JSON만 출력]
{
  "targetEligibility": {
    "minFounderAgeYears": 숫자 또는 null,
    "maxFounderAgeYears": 숫자 또는 null,
    "allowedRegions": ["지역명..."],
    "allowedIndustries": ["산업/업종..."],
    "requiredCertifications": ["필수 인증..."],
    "summary": "지원자격 및 대상 구체적 설명"
  },
  "budgetAndAmount": {
    "maxAmountWon": 최대지원금액(숫자-원단위) 또는 null,
    "selfPaymentRatioPercent": 자부담비율(숫자-퍼센트) 또는 null,
    "summary": "지원 금액 및 자부담 비율 구체적 설명"
  },
  "keySchedule": {
    "applicationStartDate": "YYYY-MM-DD" 또는 null,
    "applicationEndDate": "YYYY-MM-DD" 또는 null,
    "summary": "신청 접수 일정 및 방법 설명"
  },
  "extraPoints": {
    "items": ["우대항목1", "우대항목2"],
    "summary": "가점 및 우대사항 요약"
  },
  "excludedConditions": {
    "items": ["제외조건1", "제외조건2"],
    "summary": "지원 제외 및 불이익 조건 요약"
  },
  "requiredDocuments": ["제출서류명1", "제출서류명2", "제출서류명3"],
  "summaryReport": ["핵심 요약 1문장", "핵심 요약 2문장", "핵심 요약 3문장"]
}
`;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
    });

    const responseText = response.text || "";
    const jsonStr = cleanJsonString(responseText);
    const parsed = JSON.parse(jsonStr) as ProgramAnalysisResult;

    return parsed;
  } catch (error: any) {
    console.error("Gemini AI Analysis Error:", error.message);
    return generateFallbackAnalysis(programTitle, documentText);
  }
}
