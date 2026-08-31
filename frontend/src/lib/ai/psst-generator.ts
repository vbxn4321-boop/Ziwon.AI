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
    summaryTable?: {
      itemCategory: string;
      targetUsers: string;
      coreFeature: string;
      monetization: string;
      targetBudget: string;
    };
  };
  problem: {
    title: string;
    marketPainPoint: string;
    targetCustomerProblem: string;
    developmentNecessity: string;
    tamSamSom?: {
      tam: string;
      sam: string;
      som: string;
    };
  };
  solution: {
    title: string;
    coreTechnologyAndFeatures: string;
    competitorDifferentiation: string;
    implementationPlan: string;
    competitorTable?: Array<{
      category: string;
      ourItem: string;
      competitorA: string;
      competitorB: string;
    }>;
    roadmapTable?: Array<{
      quarter: string;
      milestone: string;
      keyActivities: string;
      output: string;
    }>;
  };
  scaleUp: {
    title: string;
    businessModelAndRevenue: string;
    marketEntryAndMarketing: string;
    fundingAndBudgetPlan: string;
    budgetTable?: Array<{
      category: string;
      amount: string;
      ratio: number;
      description: string;
    }>;
  };
  team: {
    title: string;
    founderAndTeamCompetency: string;
    rolesAndResponsibilities: string;
    collaborationNetwork: string;
    memberList?: Array<{
      role: string;
      nameOrAlias: string;
      competency: string;
      mainTask: string;
    }>;
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

import { getCandidateModels } from "./models";

function cleanJsonString(str: string): string {
  return str
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();
}

export async function generatePsstBusinessPlan(
  input: PsstGeneratorInput
): Promise<PsstBusinessPlanResult> {
  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    throw new Error("AI 분석 API 키(GEMINI_API_KEY)가 설정되지 않았습니다. 환경 변수를 확인해 주세요.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const candidateModels = getCandidateModels("reasoning");

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
3. **심사위원 관점 합격 논리 & 표(Table) 완벽 생성**: 심사위원이 한눈에 파악할 수 있도록 개요 요약표, TAM-SAM-SOM 시장규모, 경쟁사 비교표(competitorTable), Q1~Q4 로드맵(roadmapTable), 소요 예산 집행표(budgetTable), 팀원 명단(memberList)을 도메인에 맞게 정밀하게 생성하세요.

[출력 요구사항 - 반드시 유효한 JSON 형식만 출력]
{
  "overview": {
    "title": "공식 사업계획서 프로젝트 명칭",
    "companyName": "${input.companyName || "예비창업자"}",
    "industry": "${input.industry}",
    "itemSummary": "아이템 핵심 요약 2~3문장",
    "summaryTable": {
      "itemCategory": "${input.industry} 분야 소프트웨어/하드웨어",
      "targetUsers": "${input.targetCustomer || "해당 도메인 타겟 고객"}",
      "coreFeature": "핵심 독자 기술 및 제공 가치 요약",
      "monetization": "주요 과금 방식(B2B 구독, 라이선스 등)",
      "targetBudget": "정부지원금 7,000만원 (총 사업비 1억원)"
    }
  },
  "problem": {
    "title": "1. 문제 인식 (Problem)",
    "marketPainPoint": "시장 및 고객의 주요 고통과 기존 해결책의 한계",
    "targetCustomerProblem": "타겟 고객이 겪는 구체적 불편사항 및 현장 사례",
    "developmentNecessity": "창업 아이템 개발 및 사업화의 필요성과 시급성",
    "tamSamSom": {
      "tam": "전체 시장 규모 (예: 국내외 스마트 농업 시장 5조 2천억원)",
      "sam": "유효 시장 규모 (예: 국내 시설원예 및 비닐하우스 모니터링 시장 4,800억원)",
      "som": "수익 시장 규모 (예: 초기 3개년 진입 타겟 딸기/버섯 고부가가치 농가 150억원)"
    }
  },
  "solution": {
    "title": "2. 실현 가능성 (Solution)",
    "coreTechnologyAndFeatures": "창업 아이템의 핵심 기술, 주요 기능 및 개발 방안",
    "competitorDifferentiation": "기존 제품/경쟁사 대비 기술적·비즈니스적 차별성",
    "implementationPlan": "제품 개발 단계별 실현 계획 및 사업화 로드맵",
    "competitorTable": [
      {
        "category": "핵심 기술 및 작동 방식",
        "ourItem": "자체 초저전력 IoT 센서 + AI 이상징후 사전 알림",
        "competitorA": "고가 대기업 일체형 외산 제어기",
        "competitorB": "단순 온습도 표시계 (알림 기능 부재)"
      },
      {
        "category": "도입 단가 및 비용",
        "ourItem": "기존 대비 80% 절감 (소규모 농가 맞춤형)",
        "competitorA": "수천만원대 고가 설치비",
        "competitorB": "수십만원 (단순 기능 대비 가성비 미흡)"
      },
      {
        "category": "사용성 및 UI/UX",
        "ourItem": "고령 농민 특화 3-클릭 직관적 모바일 UI",
        "competitorA": "복잡한 PC 전용 관제 프로그램",
        "competitorB": "앱 연동 불가 (현장 확인 필수)"
      },
      {
        "category": "비상 대응 및 안정성",
        "ourItem": "정전/고장 시 LTE망 다중 비상 전화 및 카카오 알림톡",
        "competitorA": "앱 푸시만 제공 (데이터 끊김 시 먹통)",
        "competitorB": "사후 경보 없음"
      }
    ],
    "roadmapTable": [
      {
        "quarter": "협약 1~2개월 (Q1)",
        "milestone": "핵심 아키텍처 설계 및 프로토타입(MVP) 제작",
        "keyActivities": "센서 통신 프로토콜 정의, 모바일 UI/UX 기획 및 알고리즘 1차 빌드",
        "output": "MVP 시제품 1차 및 특허 1건 출원"
      },
      {
        "quarter": "협약 3~4개월 (Q2)",
        "milestone": "현장 파일럿 테스트(PoC) 및 성능 고도화",
        "keyActivities": "타겟 고객 5개사 현장 실증 테스트 및 오류 디버깅, KC 인증 준비",
        "output": "실증 보고서 및 KC 인증 신청"
      },
      {
        "quarter": "협약 5~6개월 (Q3)",
        "milestone": "상용화 버전 출시 및 초기 고객 유치",
        "keyActivities": "B2B 파트너십 채널 구축, 1차 상용 제품 양산 및 온라인 홍보",
        "output": "초기 유료 고객 20개사 확보"
      },
      {
        "quarter": "협약 7~8개월 (Q4)",
        "milestone": "스케일업 및 후속 투자 연계",
        "keyActivities": "지자체/협회 연계 B2G 판로 확장 및 시드/Pre-A 투자 유치 추진",
        "output": "매출 1억원 달성 및 투자 유치 IR"
      }
    ]
  },
  "scaleUp": {
    "title": "3. 성장 전략 (Scale-up)",
    "businessModelAndRevenue": "수익 모델(BM), 가격 정책 및 매출 발생 구조",
    "marketEntryAndMarketing": "초기 타겟 시장 진입 전략 및 고객 유치 마케팅 방안",
    "fundingAndBudgetPlan": "정부지원금 집행 계획 및 향후 투자/자금 조달 전략",
    "budgetTable": [
      {
        "category": "인건비 (개발/기획 인력)",
        "amount": "35,000,000원",
        "ratio": 50,
        "description": "핵심 AI 알고리즘 개발자 및 풀스택 엔지니어 인건비 (협약기간 8개월)"
      },
      {
        "category": "시제품 제작 및 외주가공비",
        "amount": "18,000,000원",
        "ratio": 26,
        "description": "IoT 보드 금형 설계, 회로 SMT 제작 및 클라우드 서버 인프라 구축비"
      },
      {
        "category": "마케팅 및 홍보비",
        "amount": "12,000,000원",
        "ratio": 17,
        "description": "타겟 산업 박람회 부스 참가, 디지털 퍼포먼스 광고 및 체험단 운영비"
      },
      {
        "category": "지식재산권(특허) 출원비",
        "amount": "5,000,000원",
        "ratio": 7,
        "description": "독자 알고리즘 및 BM 국내 특허 2건 출원 및 선행기술조사비"
      }
    ]
  },
  "team": {
    "title": "4. 팀 구성 (Team)",
    "founderAndTeamCompetency": "대표자 및 주요 인력의 전문성, 관련 경력 및 기술 역량",
    "rolesAndResponsibilities": "조직 구성 및 담당 역할 분장",
    "collaborationNetwork": "외부 협력 파트너십 및 기술 자문 네트워크",
    "memberList": [
      {
        "role": "대표자 (CEO)",
        "nameOrAlias": "${input.companyName ? input.companyName + " 대표" : "대표자"}",
        "competency": "해당 도메인 기획 및 총괄, 사업 개발 경력",
        "mainTask": "경영 총괄, 비즈니스 파트너십, 투자 유치"
      },
      {
        "role": "기술 총괄 (CTO)",
        "nameOrAlias": "핵심 개발 리드",
        "competency": "풀스택 소프트웨어/하드웨어 개발 및 시스템 아키텍처 5년+",
        "mainTask": "핵심 기술 개발, 서버/클라이언트 구축, 특허 기술 구현"
      },
      {
        "role": "사업/마케팅 (CMO)",
        "nameOrAlias": "마케팅 전담 인력",
        "competency": "B2B 영업 및 디지털 퍼포먼스 마케팅 실무 경력",
        "mainTask": "초기 고객 획득, 채널 제휴, 정부지원사업 행정 관리"
      }
    ]
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
