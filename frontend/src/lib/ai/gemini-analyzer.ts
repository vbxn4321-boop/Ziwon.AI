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
 * Tiered Cascade Candidate Models (Ordered from Highest Quality to Lighter Fallbacks)
 */
const CASCADE_MODELS = [
  process.env.AI_GENERAL_MODEL || "gemini-3.7-flash",
  "gemini-3.7-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-flash-latest",
  "gemini-3.6-flash",
];

/**
 * Analyze Support Program Notice Document using Gemini AI with Adaptive Tiered Cascade Fallback
 */
export async function analyzeProgramWithGemini(
  programTitle: string,
  organizer: string,
  documentText: string
): Promise<ProgramAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    throw new Error("AI 분석 API 키(GEMINI_API_KEY)가 설정되지 않았습니다. 환경 변수를 확인해 주세요.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Deduplicated candidate cascade models
  const candidateModels = CASCADE_MODELS.filter((v, i, a) => a.indexOf(v) === i && !!v);

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

2. 출처 플랫폼별 맞춤 추출 지침:
   - [K-Startup 공고일 경우]:
     * 지원자격(targetEligibility): 본문의 '창업업력(예비창업자, 3년 이내, 7년 이내 등)', '대상연령(만 39세 이하 청년 등)', '신청대상'을 명확하게 결합하여 작성하세요.
     * 신청일정 및 방법(keySchedule): 신청 마감 일시(시간/분 단위 포함)와 온라인 접수처(K-Startup 접수 링크 등)를 구체적으로 명시하세요.
     * 선정절차(evaluationCriteria): 본문의 '선정절차 및 평가방법'(서류 ➔ 발표, 또는 접수순 등)을 순서대로 steps 및 items에 그대로 반영하세요.
     * 제외대상(excludedConditions): 본문의 '제외대상' 항목을 그대로 추출하세요.
   - [기업마당 공고일 경우]:
     * 지원자격(targetEligibility): 기업규모(소상공인, 중소기업, 중견기업), 업종, 지역, 설립연도 기준을 정확히 추출하세요.
     * 지원규모(budgetAndAmount): 총 예산, 기업당 지원 한도, 정부지원 비율 및 자부담 비율(%)을 명시하세요.
     * 평가기준(evaluationCriteria): 공고문 내 정량/정성 평가 항목 및 배점표를 반영하세요.

3. 필수제출서류(requiredDocuments): 
   - 공고문 본문 및 첨부파일 내 '제출서류', '구비서류', '신청서류' 항목에 번호(①, ②, ③, ④, ⑤ 또는 1, 2, 3...)로 기재된 원문 서류 명칭을 원문 그대로 정확하게 추출하세요.
   - 본문에 없는 서류를 임의로 추가하거나 지어내지 마세요.
   - 특정 조건별 서류가 명시되어 있다면 해당 조건(예: "(해당시) 가점 증빙서류, 사업자등록증")까지 포함하세요.

4. 가점 및 우선선정·우대 요건(extraPoints.items):
   - 본문에 명시된 1순위/2순위/3순위 우선순위 또는 가산점 항목을 구체적으로 추출하세요. 없으면 빈 배열 []로 두세요.

5. 핵심요약(summaryReport):
   - 신청 대상(업력/규모), 주요 지원 혜택(자금/공간/멘토링/바우처), 신청 마감 일정을 3문장으로 간결하고 정확하게 요약하세요.

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

  let lastError: any = null;

  for (let i = 0; i < candidateModels.length; i++) {
    const modelName = candidateModels[i];
    try {
      console.log(`🤖 [Gemini Cascade Tier ${i + 1}/${candidateModels.length}] Requesting model: ${modelName}`);
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
      });

      const responseText = response.text || "";
      const jsonStr = cleanJsonString(responseText);
      const parsed = JSON.parse(jsonStr) as ProgramAnalysisResult;

      console.log(`✅ [Gemini Cascade] Tier ${i + 1} (${modelName}) succeeded!`);
      return parsed;
    } catch (error: any) {
      console.warn(
        `⚠️ [Gemini Cascade Tier ${i + 1} Failed] ${modelName}: ${
          error.message?.slice(0, 120) || error
        }. Cascading to next tier...`
      );
      lastError = error;
      // Loop continues to next tier automatically
    }
  }

  // If all candidate models failed
  console.error("Gemini AI Analysis Error (all cascade models failed):", lastError?.message);
  if (lastError?.message?.includes("429") || lastError?.message?.includes("quota")) {
    throw new Error("AI API 일일/분당 호출 한도(Rate Limit)에 도달했습니다. 잠시 후 다시 시도해 주세요.");
  }
  throw new Error("AI 분석 서버와의 통신에 실패했습니다. 잠시 후 다시 시도해 주세요.");
}
