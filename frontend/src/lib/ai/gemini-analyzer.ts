import { GoogleGenAI } from "@google/genai";

export interface EvaluationItem {
  category: string;
  scoreWeight: string;
  evaluationFocus: string;
  writingStrategy: string;
}

export interface ProgramAnalysisResult {
  organizerStrategy?: {
    organizerName: string;
    agencyName: string;
    programNature: string;
    coreObjective: string;
    strategyTip: string;
  };
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
    items: EvaluationItem[] | string[];
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

import { getCandidateModels } from "./models";

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
  const candidateModels = getCandidateModels("fast");

  const prompt = `
[역할]
당신은 대한민국 중소벤처기업부 및 창업진흥원 심사위원장이자 정부지원사업 선정 컨설팅 최고 권위자입니다.
제공된 지원사업 공고명, 주관/수행기관, 원문 데이터 및 첨부파일 텍스트를 정밀 분석하여, 지원자가 100% 합격할 수 있도록 실전적인 [AI 정밀 합격 전략 리포트]를 JSON 형식으로 작성하십시오.

[작성 지침: Fact 검증 vs 기관 전략 분리 (Dual-Domain Architecture)]

1. [Fact 영역 - 공고문 원문 Strict 적용 (Hallucination 절대 금지)]
   - targetEligibility, budgetAndAmount, keySchedule, requiredDocuments, excludedConditions, extraPoints 항목은 오직 [제공된 공고문 및 첨부파일 전문 텍스트]만을 근거로 작성하십시오.
   - 텍스트에 명확히 기재되지 않은 항목(숫자, 날짜, 배점, 금액 등)은 절대로 추측하여 지어내지 마십시오.
     * 나이/지역/업력 제한이 명시되지 않은 경우: null 또는 "제한 없음 (공고문 미기재)"로 표기
     * 지원 금액이 확정되지 않은 경우: null 또는 "공고문 참조 / 사업비 확정 전"으로 표기
     * 세부 배점 수치가 공고문에 없는 경우: 배점 숫자를 임의로 만들어내지 말고, scoreWeight에 "배점 미기재 (표준 PSST 평가항목 기준 가이드)"라고 명시하십시오.
   - 지원 자격, 제출 서류, 결격 사유는 공고문 원문의 단어와 문맥을 정확하게 반영하여 사실만을 전달하십시오.

2. [Strategy 영역 - 부처/기관 특성 및 실전 작성 가이드 (Insight/Guide)]
   - organizerStrategy, summaryReport (3-Step 공략), evaluationCriteria.items (작성 팁) 항목은 소관/주관기관(${organizer})의 일반적인 설립 목적과 정책 성향을 바탕으로 '전문가 컨설팅 가이드(Guide/Insight)' 형태로 작성하십시오.
   - 대한민국 주요 부처/기관별 평가 성향 가이드라인:
     * 중소벤처기업부 / 창업진흥원: 매출 성장성, 일자리(고용) 창출, 글로벌 확장성, PSST 논리 구조 강조
     * 지자체 / 지역창조경제혁신센터 / 테크노파크(TP): 해당 지역 내 사업장 소재, 지역 일자리 창출 및 정주 여건 개선, 지역 경제 기여도 강조
     * 기술보증기금 / 신용보증기금 / 특허청(RIPC): 특허(IP) 보유, 기술의 독창성 및 수입대체/기술 자립도, 연구개발(R&D) 역량 강조
     * 농림축산식품부 / 해양수산부 / 문화체육관광부: 해당 산업군 특화 비즈니스 모델, 전통/로컬 자원 융합 및 판로 개척 강조
   - 단, 공고문 본문의 핵심 주제와 모순되지 않도록 맞춤형 팁(strategyTip, writingStrategy)으로 제시하십시오.

[분석 대상 사업 정보]
- 사업명: ${programTitle}
- 소관/주관기관: ${organizer}

[분석할 공고문 및 첨부파일 전문 텍스트]
${documentText.slice(0, 60000)}

[핵심 작성 세부 지침]
1. [주관/수행기관 성격 분석 (organizerStrategy)]:
   - 소관기관(${organizer}) 및 수행기관의 핵심 설립 목적과 본 지원사업의 정책적 의도를 분석하세요.
   - programNature: 지원사업의 본질 (예: "사업화 자금 지원", "기술 R&D 고도화", "IP 권리화 및 기술보호", "지역특화 정주형 창업", "글로벌 판로개척" 등)
   - coreObjective: 주관기관이 최종적으로 요구하는 핵심 성과지표 (KPI, 예: 고용창출, 매출증대, 지식재산권 확보, 수출계약 등)
   - strategyTip: 이 기관 심사위원을 단번에 설득하기 위한 맞춤형 사업계획서 서술 방향

2. [심사 및 평가 기준 배점표 정밀 공략 (evaluationCriteria)]:
   - 공고문 내 배점표(서류평가/발표평가 기준)를 추출하고, 수치 배점이 명시되지 않은 경우 배점 숫자를 지어내지 말고 scoreWeight에 "배점 미기재 (표준 PSST 가이드)"로 명시한 후 표준 평가항목(문제인식, 실현가능성, 성장전략, 팀역량 등)별 심사 착안점과 고득점 작성 팁을 작성하세요.
   - 각 item 구성:
     * category: 평가 분야 (예: "문제인식 (Problem)", "실현가능성 (Solution)", "성장전략 (Scale-up)", "팀역량 (Team)", "기술성/사업성" 등)
     * scoreWeight: 공고문 원문 배점(예: "30점", "40%") 또는 "배점 미기재 (표준 PSST 가이드)"
     * evaluationFocus: 심사위원이 집중적으로 확인하는 감점/합격 착안점
     * writingStrategy: 고득점을 얻기 위한 실전 작성 팁 및 어필 문구 방향
   - steps: 선정 절차 (예: ["1단계: 서류평가(적격심사)", "2단계: 발표평가(서면/PT)", "3단계: 최종선정 및 협약체결"])
   - summary: 전체 심사 프로세스 요약

3. [가점 및 우대 요건 (extraPoints)]:
   - 원문에 기재된 가산점 항목(특허/IP 보유, 청년/여성/장애인, 벤처기업/이노비즈, 지역소재, 고용창출 우수 등)을 정확히 추출하세요. 원문에 가점 내용이 없으면 "공고문 내 별도 가점 항목 미기재"로 요약하세요.

4. [행정 탈락 방지 제외조건 (excludedConditions)]:
   - 신청 시 즉시 탈락(부적격)되는 결격 사유(국세/지방세 체납, 채무불이행, 타 지원사업 중복 수혜 제한 등)를 공고문 팩트 기반으로 명시하세요.

5. [필수 제출 서류 체크리스트 (requiredDocuments)]:
   - 지원자가 반드시 구비해야 할 서류 목록 (신청서, 사업계획서, 사업자등록증, 가점 증빙서류, 4대보험 가입자명부 등)을 원문에서 정확히 나열하세요.

6. [AI 맞춤형 합격 공략 3-Step 브리핑 (summaryReport)]:
   - STEP 01: [신청 자격 및 필수 우대 가점 확보 전략]
   - STEP 02: [사업계획서 본문(기술성/사업성/시장성) 핵심 차별화 서술법]
   - STEP 03: [최종 제출 전 필수 서류 점검 및 마감 대응 전략]

[출력 요구사항 - 반드시 유효한 JSON만 출력]
{
  "organizerStrategy": {
    "organizerName": "${organizer || "주관기관"}",
    "agencyName": "수행기관명 또는 주관기관",
    "programNature": "지원사업 핵심 성격",
    "coreObjective": "기관 핵심 요구 성과지표(KPI)",
    "strategyTip": "심사위원 맞춤 공략 제안 방향"
  },
  "targetEligibility": {
    "minFounderAgeYears": null,
    "maxFounderAgeYears": null,
    "allowedRegions": ["전국 또는 해당지역"],
    "allowedIndustries": ["해당분야"],
    "requiredCertifications": [],
    "summary": "지원 자격 상세 요약"
  },
  "budgetAndAmount": {
    "maxAmountWon": null,
    "selfPaymentRatioPercent": null,
    "summary": "지원 규모 및 혜택 요약"
  },
  "keySchedule": {
    "applicationStartDate": "YYYY-MM-DD 또는 null",
    "applicationEndDate": "YYYY-MM-DD 또는 null",
    "summary": "신청 일정 및 접수 방법"
  },
  "evaluationCriteria": {
    "steps": ["1단계: 서류평가", "2단계: 발표평가", "3단계: 최종선정"],
    "items": [
      {
        "category": "문제인식 (배경 및 필요성)",
        "scoreWeight": "25점",
        "evaluationFocus": "기존 시장 문제점의 명확성 및 개발 필요성",
        "writingStrategy": "실제 시장 데이터와 고객 불편 사항을 수치로 명확히 제시"
      },
      {
        "category": "실현가능성 (기술 및 아이템)",
        "scoreWeight": "35점",
        "evaluationFocus": "보유 기술/IP의 독창성 및 상용화 가능 여부",
        "writingStrategy": "특허, 프로토타입, 구체적인 개발 로드맵을 시각화하여 어필"
      },
      {
        "category": "성장전략 (사업화 및 판로)",
        "scoreWeight": "20점",
        "evaluationFocus": "수익 모델 및 타겟 고객 확보 방안",
        "writingStrategy": "초기 고객 유치 전략과 연도별 매출/고용 목표를 현실적으로 제시"
      },
      {
        "category": "팀역량 (대표자 및 인력)",
        "scoreWeight": "20점",
        "evaluationFocus": "대표자 및 핵심 팀원의 유관 분야 전문성",
        "writingStrategy": "과거 성공 경험, 유관 프로젝트 수행 실적, 산학연 네트워크 강조"
      }
    ],
    "summary": "서류 및 발표 평가 심사 착안점 요약"
  },
  "extraPoints": {
    "items": ["특허권 보유 기업 가점", "청년 창업기업 우대", "지역 내 소재 기업 우대"],
    "summary": "가점 확보 전략 요약"
  },
  "excludedConditions": {
    "items": ["금융기관 등으로부터 채무불이행으로 규제중인 자", "국세 또는 지방세 체납으로 규제중인 자"],
    "summary": "신청 제외 결격 요건"
  },
  "requiredDocuments": [
    "참가신청서 및 사업계획서",
    "사업자등록증명원 (기창업자)",
    "특허/지식재산권 등록원부 또는 출원서 (해당시)",
    "가점 증빙서류"
  ],
  "summaryReport": [
    "STEP 01 핵심 자격 및 가점 증빙 준비 공략",
    "STEP 02 차별화된 비즈니스 모델 및 기술성 서술 전략",
    "STEP 03 제출 기한 준수 및 최종 서류 정합성 검증"
  ]
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
