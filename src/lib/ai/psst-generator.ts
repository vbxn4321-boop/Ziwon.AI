import { GoogleGenAI } from "@google/genai";

export interface PsstGeneratorInput {
  companyName: string;
  itemName: string;
  industry: string;
  targetCustomer?: string;
  itemDescription: string;
  coreStrengths?: string;
  targetProgramTitle?: string;
}

export interface PsstBusinessPlanResult {
  overview: {
    title: string;
    companyName: string;
    industry: string;
    itemSummary: string;
  };
  problem: {
    title: string;
    marketPainPoint: string;
    targetCustomerProblem: string;
    developmentNecessity: string;
  };
  solution: {
    title: string;
    coreTechnologyAndFeatures: string;
    competitorDifferentiation: string;
    implementationPlan: string;
  };
  scaleUp: {
    title: string;
    businessModelAndRevenue: string;
    marketEntryAndMarketing: string;
    fundingAndBudgetPlan: string;
  };
  team: {
    title: string;
    founderAndTeamCompetency: string;
    rolesAndResponsibilities: string;
    collaborationNetwork: string;
  };
  evaluationReport: {
    score: number;
    grade: string;
    gradeDescription: string;
    breakdown?: {
      problemScore: number;
      problemFeedback: string;
      solutionScore: number;
      solutionFeedback: string;
      scaleUpScore: number;
      scaleUpFeedback: string;
      teamScore: number;
      teamFeedback: string;
    };
    strengths: string[];
    weaknesses: string[];
    improvementRecommendations: string[];
    expectedQuestions: Array<{
      question: string;
      evaluationIntent: string;
      recommendedDefense: string;
    }>;
  };
}

function cleanJsonString(str: string): string {
  return str
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();
}

const CASCADE_MODELS = [
  process.env.AI_GENERAL_MODEL || "gemini-3.7-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-flash-latest",
];

export async function generatePsstBusinessPlan(
  input: PsstGeneratorInput
): Promise<PsstBusinessPlanResult> {
  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    throw new Error("AI 분석 API 키(GEMINI_API_KEY)가 설정되지 않았습니다. 환경 변수를 확인해 주세요.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const candidateModels = CASCADE_MODELS.filter((v, i, a) => a.indexOf(v) === i && !!v);

  const prompt = `
[역할]
당신은 대한민국 중소벤처기업부, 창업진흥원, 기술보증기금의 공인 스타트업 심사위원이자 최고 전문 창업 컨설턴트입니다.
사용자가 제공한 창업 아이템 및 기업 정보를 바탕으로, 대한민국 정부 표준 **PSST (Problem, Solution, Scale-up, Team)** 구조에 맞춘 최고 수준의 전문 사업계획서 초안과 **[심사역 관점의 정밀 평가 리포트]**를 생성하여 JSON으로 출력하세요.

[사용자 입력 정보]
- 회사명 / 대표자: ${input.companyName || "예비창업자"}
- 창업 아이템명: ${input.itemName}
- 사업 분야 / 산업: ${input.industry}
- 주요 타겟 고객: ${input.targetCustomer || "해당 산업군 수요 고객"}
- 아이템 핵심 설명: ${input.itemDescription}
- 주요 강점 및 차별화 요소: ${input.coreStrengths || "자체 기술력 및 맞춤형 서비스"}
- (연계 목표 지원사업): ${input.targetProgramTitle || "중소벤처기업부 예비/초기 창업지원사업"}

[엄격한 작성 원칙 - 상투적 목업/더미 텍스트 절대 금지]:
1. **사용자 입력/대화 100% 반영**: 사용자가 인터뷰나 입력폼에서 언급한 실제 아이템, 고객군, 기술, BM을 최우선으로 반영하세요.
2. **도메인 특화 실전 팩트 기반 작성**: 뻔한 일반론("혁신적인 솔루션", "우수한 기술력") 대신, 해당 산업군(스마트농업, 물류, 헬스케어 등)의 실제 현장 고통, 실제 기술 스택(센서 사양, 통신 프로토콜, 모델 아키텍처), 실제 과금 단가 및 유통 구조를 구체적 수치와 명칭으로 서술하세요.
3. **심사위원 관점 합격 논리**: 심사위원이 "이 팀은 사업과 기술을 진짜 안다"고 느낄 수 있도록 전문 용어와 단계별 실현 로드맵을 정밀하게 보완하세요.

[작성 가이드라인 - PSST 구조 원칙]
1. **P (Problem - 문제 인식)**:
   - 기존 시장의 구조적 문제점, 기술적 한계, 타겟 고객이 겪는 페인포인트를 데이터와 실제 현장 사례 관점에서 논리적으로 서술.
   - 왜 지금 이 아이템의 개발과 사업화가 시급한지 필요성과 시장 규모를 명확히 제시.
2. **S (Solution - 실현 가능성)**:
   - 문제를 해결하는 구체적인 제품/서비스 구조, 핵심 기술 사양, 시스템 구성도를 구체화.
   - 기존 경쟁사/대체재 대비 모방하기 힘든 기술적·비즈니스적 차별성(해자)과 개발 로드맵 서술.
3. **S (Scale-up - 성장 전략)**:
   - 명확한 비즈니스 모델(BM), 과금 단위, 초기 시장 진입 및 고객 획득 마케팅 채널.
   - 정부지원금 집행 계획 및 향후 자금 조달/스케일업 계획.
5. **Evaluation Report (심사역 정밀 평가 - 정부 표준 100점 배점표 기반 채점)**:
   - **Problem (문제인식 25점 만점)**: 타겟 고객 페인포인트 및 개발 시급성 점수(0~25) 및 평가 피드백
   - **Solution (실현가능성 30점 만점)**: 기술 사양 구체성 및 경쟁사 차별화 해자 점수(0~30) 및 평가 피드백
   - **Scale-up (성장전략 30점 만점)**: 비즈니스 모델 타당성 및 시장 진입/예산 계획 점수(0~30) 및 평가 피드백
   - **Team (팀 구성 15점 만점)**: 대표자/팀원 전문성 및 협력 네트워크 점수(0~15) 및 평가 피드백
   - **합산 총점(0~100점)** 및 등급 산출 (90점 이상: A+, 80~89점: A, 70~79점: B+, 60~69점: B, 60점 미만: C)
   - 실제 정부지원사업 서면/대면 심사위원이 높게 평가할 핵심 강점 3가지.
   - 심사위원 지적 대비 보완점 2~3가지 및 구체적 개선 조언.
   - 대면 평가(PT 면접) 시 심사위원이 질문할 핵심 예상 질문 3가지와 모범 방어 논리.

[출력 요구사항 - 반드시 유효한 JSON 형식만 출력]
{
  "overview": {
    "title": "공식 사업계획서 프로젝트 명칭",
    "companyName": "${input.companyName || "예비창업자"}",
    "industry": "${input.industry}",
    "itemSummary": "아이템 핵심 요약 2~3문장"
  },
  "problem": {
    "title": "1. 문제 인식 (Problem)",
    "marketPainPoint": "시장 및 고객의 주요 고통과 기존 해결책의 한계",
    "targetCustomerProblem": "타겟 고객이 겪는 구체적 불편사항",
    "developmentNecessity": "창업 아이템 개발 및 사업화의 필요성과 시급성"
  },
  "solution": {
    "title": "2. 실현 가능성 (Solution)",
    "coreTechnologyAndFeatures": "창업 아이템의 핵심 기술, 주요 기능 및 개발 방안",
    "competitorDifferentiation": "기존 제품/경쟁사 대비 기술적·비즈니스적 차별성",
    "implementationPlan": "제품 개발 단계별 실현 계획 및 사업화 로드맵"
  },
  "scaleUp": {
    "title": "3. 성장 전략 (Scale-up)",
    "businessModelAndRevenue": "수익 모델(BM), 가격 정책 및 매출 발생 구조",
    "marketEntryAndMarketing": "초기 타겟 시장 진입 전략 및 고객 유치 마케팅 방안",
    "fundingAndBudgetPlan": "정부지원금 집행 계획 및 향후 투자/자금 조달 전략"
  },
  "team": {
    "title": "4. 팀 구성 (Team)",
    "founderAndTeamCompetency": "대표자 및 주요 인력의 전문성, 관련 경력 및 기술 역량",
    "rolesAndResponsibilities": "조직 구성 및 담당 역할 분장",
    "collaborationNetwork": "외부 협력 파트너십 및 기술 자문 네트워크"
  },
  "evaluationReport": {
    "score": 88,
    "grade": "A (선정 유력)",
    "gradeDescription": "시장성과 기술적 차별성이 우수하며 구체적인 개발 계획이 돋보입니다.",
    "breakdown": {
      "problemScore": 22,
      "problemFeedback": "타겟 고객의 페인포인트 정의가 명확하나 거시적 시장 통계 데이터가 약간 보강되면 만점 가능",
      "solutionScore": 27,
      "solutionFeedback": "경량 딥러닝 및 통신 기술 사양이 매우 구체적이며 차별화 해자가 뚜렷함",
      "scaleUpScore": 26,
      "scaleUpFeedback": "B2B 과금 모델이 타당하나 초기 100개사 확보를 위한 필드 영업 채널 구체화 필요",
      "teamScore": 13,
      "teamFeedback": "대표자의 기술 개발 역량은 우수하나 향후 마케팅/영업 전담 인력 보강 권장"
    },
    "strengths": [
      "명확한 타겟 고객 페인포인트 정의 및 직접적인 해결책 제시",
      "경쟁사 대비 뚜렷한 기술적 차별화 요소 확보",
      "현실적이고 단계적인 초기 시장 진입 로드맵"
    ],
    "weaknesses": [
      "초기 고객 유치를 위한 마케팅 예산 대비 전환율 검증 데이터 보강 필요",
      "기술 개발 일정 중 잠재적 리스크에 대한 비상 대응 계획(Contingency Plan) 구체화 권장"
    ],
    "improvementRecommendations": [
      "핵심 성과 지표(KPI)를 정량적 수치(전환율, 재방문율, 목표 매출 등)로 보강하세요.",
      "경쟁사 벤치마킹 비교표를 추가하여 가격 및 기술 비교를 시각화하세요."
    ],
    "expectedQuestions": [
      {
        "question": "기존 대기업이나 선발 주자가 유사 기능을 출시할 경우 어떻게 방어하시겠습니까?",
        "evaluationIntent": "진입 장벽 및 특허/기술적 해자(Moat) 검증",
        "recommendedDefense": "특정 버티컬 타겟에 맞춘 초개인화 데이터 확보 및 빠른 실행력과 독자 알고리즘 특허 출원을 통해 락인(Lock-in) 효과를 구축하겠다고 답변하세요."
      },
      {
        "question": "초기 고객 획득 비용(CAC)을 어떻게 낮출 계획입니까?",
        "evaluationIntent": "마케팅 비용 효율성 및 유기적 바이럴 가능성 평가",
        "recommendedDefense": "타겟 커뮤니티 및 초기 B2B 파트너십을 통한 무비용 제휴 유입과 파일럿 무료 테스트베드 전략을 제시하세요."
      },
      {
        "question": "지원금 소진 이후 자립 가능한 손익분기점(BEP) 달성 시점은 언제입니까?",
        "evaluationIntent": "지속 가능성 및 재무적 현실성 검증",
        "recommendedDefense": "출시 후 12개월 내 월 고정비 회수 가능한 유료 전환율 달성 시나리오를 구체적 수치와 함께 답변하세요."
      }
    ]
  }
}
`.trim();

  let lastError: Error | null = null;

  for (const modelName of candidateModels) {
    try {
      console.log(`🤖 [PSST Business Plan] Calling Gemini model: ${modelName}...`);
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          temperature: 0.3,
          responseMimeType: "application/json",
        },
      });

      const rawText = response.text || "";
      const cleaned = cleanJsonString(rawText);
      const parsed: PsstBusinessPlanResult = JSON.parse(cleaned);

      if (!parsed.problem || !parsed.solution || !parsed.scaleUp || !parsed.team) {
        throw new Error("Invalid PSST structure in AI response");
      }

      return parsed;
    } catch (err: any) {
      console.warn(`[PSST Business Plan] Failed with model ${modelName}:`, err.message);
      lastError = err;
    }
  }

  throw new Error(`AI 사업계획서 생성 실패: ${lastError?.message || "모든 모델 호출 실패"}`);
}
