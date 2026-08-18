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
아래에 제공된 지원사업 통합 공고 정보, 공공 API 원문 데이터, 첨부파일 원문 텍스트(공고문 전문, 운영지침, 평가기준표, 서식)를 정밀 분석하여 중소기업/스타트업 대표가 한눈에 파악할 수 있도록 정확하고 구체적인 정보를 JSON 스키마로 추출하세요.

[사업 정보 및 공고 원문]
- 사업명: ${programTitle}
- 주관기관: ${organizer}

[분석할 전체 원문 텍스트]
${documentText.slice(0, 60000)}

[작성 지침 - 매우 중요]
1. 추상적이거나 일반적인 추측성 문구를 쓰지 말고, 본문 텍스트에 포함된 실제 지원조건(업력 몇 년 이내, 대상 지역, 업종, 지원 금액 숫자 등)을 구체적으로 적으세요.
2. 지원자격요건(targetEligibility.summary): 업력 조건, 지역 조건, 기업 형태(예: 창업 7년 이내 중소기업, 제주 소재 기업 등)를 명확히 포함하세요.
3. 지원규모(budgetAndAmount.summary): 총 예산 또는 기업당 최대 지원금액, 국비/지방비 자부담 비율 등을 구체적으로 명시하세요.
4. 심사 및 검토 기준(evaluationCriteria - 평가절차 및 배점 기준):
   - steps: 1차 서류 적격심사 ➔ 2차 서면/발표평가 ➔ 현장실사 ➔ 최종선정 등 단계별 심사 절차를 순서대로 작성하세요.
   - items: 공고문에 명시된 구체적인 검토/평가 항목(예: 사업성 40점, 기술성 30점, 고용창출 20점 등 배점, 정량/정성 평가지표, 과락 기준 60점 미만 등)을 꼼꼼하게 리스트업하세요. 만약 별도 점수 배점표가 없으면 선착순, 적격여부 확인 등 선정 방식을 명시하세요.
   - summary: 평가 및 심사 선정 방식의 핵심을 1~2문장으로 요약하세요.
5. 가점 및 우대사항(extraPoints.items - 반드시 꼼꼼히 탐색): 
   - 점수형 가점(1~5점 가산점)뿐만 아니라 **우선선정 대상(예: 1순위/2순위/3순위 우선순위 요건), 우선지원 요건, 서면평가 면제, 심사 우대사항, 동점자 선발 기준, 우대 대상 기업(청년, 여성, 장애인, 지역 정착, 벤처/이노비즈, 특허 보유 등)**을 공고문 본문 및 운영지침에서 꼼꼼하게 찾아서 빠짐없이 구체적인 항목별로 리스트업하세요.
   - summary: 우선선정 및 가점 부여 기준 요약.
6. 지원제외조건(excludedConditions.items): 
   - 지원 제외 업종(유흥·사치·사행성 등), 체납(국세/지방세/4대보험), 부도/휴·폐업, 인건비/사업비 중복 수혜, 사업주 가족 채용 제한, 제재 기간 등 모든 결격 사유를 구체적으로 명시하세요.
7. 필수제출서류(requiredDocuments): 신청서, 사업계획서, 사업자등록증, 납세증명서, 통장사본, 우선순위 증빙서류 등 공고문에 적힌 모든 필수 서류 이름을 명시하세요.
8. 핵심요약(summaryReport): 신청 대상과 혜택, 선정기준 및 유의사항을 3문장으로 간결하고 명확하게 요약하세요.

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
    "steps": ["1단계: 서류 적격심사", "2단계: 발표평가", "3단계: 최종선정"],
    "items": ["평가항목1 (배점/기준)", "평가항목2 (배점/기준)", "과락기준: 총점 60점 미만 제외"],
    "summary": "심사 및 검토 선정 방식 요약"
  },
  "extraPoints": {
    "items": ["우선선정/우대/가점 항목 1", "우선선정/우대/가점 항목 2"],
    "summary": "우선선정 및 가점/우대사항 요약"
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
    throw new Error("AI 분석 서버와의 통신에 실패했습니다. 잠시 후 다시 시도해 주세요.");
  }
}
