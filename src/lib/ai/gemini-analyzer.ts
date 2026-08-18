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
  evaluationCriteria: {
    steps: string[];
    items: string[];
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
 * Analyze Support Program Notice Document using Gemini 3.6 Flash AI
 */
export async function analyzeProgramWithGemini(
  programTitle: string,
  organizer: string,
  documentText: string
): Promise<ProgramAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    throw new Error("AI 분석 API 키가 설정되지 않았습니다. 잠시 후 다시 시도해 주세요.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const modelName = process.env.AI_GENERAL_MODEL || "gemini-3.6-flash";

  const prompt = `
[역할]
당신은 대한민국 정부 및 지자체 지원사업 분석 최고 전문가입니다.
아래에 제공된 지원사업 통합 공고 정보, 공공 API 원문 데이터, 첨부파일 원문 텍스트(공고문 전문, 운영지침, 평가기준표, 서식)를 정밀 분석하여 팩트만을 엄격하게 추출하여 JSON 스키마로 출력하세요.

[사업 정보 및 공고 원문]
- 사업명: ${programTitle}
- 주관기관: ${organizer}

[분석할 전체 원문 텍스트]
${documentText.slice(0, 60000)}

[작성 지침 - 팩트 기반 엄격 추출 (Hallucination 절대 금지)]
1. 절대로 본문에 없는 내용을 일반적인 상식으로 지어내거나 추측하지 마세요. 반드시 제공된 본문 및 첨부파일 텍스트 내에 실제로 적혀있는 내용만을 100% 팩트 기반으로 추출하세요.
2. 필수제출서류(requiredDocuments): 
   - 공고문 본문 및 첨부파일 내 '제출서류', '구비서류', '신청서류' 항목에 번호(①, ②, ③, ④, ⑤ 또는 1, 2, 3...)로 기재된 원문 서류 명칭을 원문 그대로 정확하게 추출하세요.
   - 본문에 없는 서류(예: 통장사본이 적혀있는데 사업계획서나 보험증권을 지어내는 등)를 임의로 추가하거나 지어내지 마세요.
   - 원문에 특정 지역/조건별 서류가 명시되어 있다면 해당 조건(예: "(인천 소재 기업) 매출액증빙 또는 수출실적증명")까지 원문 그대로 포함하세요.
3. 지원자격요건(targetEligibility.summary): 
   - 본문에 적힌 실제 대상 기업 요건(소재지, 업력, 가입 시기, 업종 등)을 구체적인 조건과 함께 명시하세요.
4. 지원규모(budgetAndAmount.summary): 
   - 총 예산 또는 기업당 지원 금액, 지원 비율(%), 최대 한도 금액을 본문 숫자 그대로 명시하세요.
5. 심사 및 검토 기준(evaluationCriteria):
   - steps: 1차 ➔ 2차 ➔ 최종 등 본문에 기재된 실제 선정/심사 절차를 순서대로 작성하세요.
   - items: 본문에 명시된 평가 항목 및 배점, 또는 선착순/적격심사 등 실제 선정 방식을 작성하세요.
   - summary: 심사/선정 방식 1문장 요약.
6. 가점 및 우선선정·우대 요건(extraPoints.items):
   - 본문에 명시된 1순위/2순위/3순위 우선순위 또는 가산점 항목을 구체적으로 추출하세요. 없으면 빈 배열 []로 두세요.
7. 지원제외조건(excludedConditions.items):
   - 본문에 기재된 중복지원 불가, 체납, 제외 대상 조건을 구체적으로 명시하세요.
8. 핵심요약(summaryReport):
   - 신청 대상, 지원 혜택, 신청 마감 일정을 3문장으로 간결하고 정확하게 요약하세요.

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
  "evaluationCriteria": {
    "steps": ["1단계: ...", "2단계: ..."],
    "items": ["평가항목 및 선정기준..."],
    "summary": "심사 및 선정 방식 요약"
  },
  "extraPoints": {
    "items": ["우선선정/가점 항목..."],
    "summary": "우선선정 및 가점 요약"
  },
  "excludedConditions": {
    "items": ["제외조건..."],
    "summary": "지원 제외 요건 요약"
  },
  "requiredDocuments": ["원문 서류명 1", "원문 서류명 2", "원문 서류명 3"],
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
    throw new Error("AI 분석 서버와의 통신에 실패했습니다. 잠시 후 다시 시도해 주세요.");
  }
}
