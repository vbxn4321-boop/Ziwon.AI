import { TargetProgramFormat, PsstSectionKey, FormSchema } from "./types";

export const TARGET_PROGRAM_FORMATS: TargetProgramFormat[] = [
  {
    id: "pre-startup",
    name: "2026년 중소벤처기업부 예비창업패키지",
    badge: "중기부 표준",
    description: "예비창업자 특화 (MVP 검증, 비즈니스 모델, 시제품 제작 계획 중심)",
  },
  {
    id: "early-startup",
    name: "2026년 중소벤처기업부 초기창업패키지",
    badge: "중기부 표준",
    description: "3년 이내 기업 특화 (시장 진입, 매출 성장 전략, 투자 유치 중심)",
  },
  {
    id: "youth-academy",
    name: "2026년 청년창업사관학교 (청창사)",
    badge: "중진공 표준",
    description: "혁신 기술 창업 (양산 체계, 시제품 고도화, 사업화 로드맵 중심)",
  },
  {
    id: "r-and-d",
    name: "2026년 디딤돌 R&D 창업성장기술개발사업",
    badge: "중기부 R&D",
    description: "정부 R&D 연구개발계획서 (핵심 기술 사양, 정량적 목표, 특허 전략)",
  },
  {
    id: "scaleup-leap",
    name: "2026년 창업도약패키지 (스케일업)",
    badge: "창진원 표준",
    description: "3~7년차 도약 기업 (해외 수출, 글로벌 진출, 후속 투자 중심)",
  },
  {
    id: "local-business",
    name: "2026년 신사업창업사관학교 (소상공인)",
    badge: "소진공 표준",
    description: "로컬 크리에이터 / 소상공인 혁신 BM 중심",
  },
  {
    id: "kibo-shinbo",
    name: "2026년 기술보증기금/신용보증기금 정책자금",
    badge: "정책금융",
    description: "기술 사업성 평가, 재무 추정 및 자금 상환 계획 중심",
  },
];

export const SECTION_LABELS: Record<PsstSectionKey, string> = {
  overview: "창업아이템 개요(요약)",
  problem: "1. 문제인식 (Problem)",
  solution: "2. 실현가능성 (Solution)",
  scaleUp: "3. 성장전략 (Scale-up)",
  team: "4. 팀구성 (Team)",
  evaluation: "5. 심사역 평가 리포트",
};

/**
 * 정부지원사업별 표준 서식 스키마 정의 (공식 서식 파싱 전/기본 템플릿용)
 */
export const STANDARD_FORM_SCHEMAS: Record<string, FormSchema> = {
  "pre-startup": {
    title: "2026년 중소벤처기업부 예비창업패키지 사업계획서",
    fields: [
      {
        id: "f1",
        label: "기본 정보",
        guidance: "기업명, 대표자명, 창업 아이템명 등 기본 사실 정보",
        type: "FACT",
        sectionTitle: "신청 기본현황",
      },
      {
        id: "f2",
        label: "1-1. 창업아이템 개발 배경 및 필요성",
        guidance: "창업아이템을 개발하게 된 배경, 기존 시장의 문제점 및 고객 페인포인트를 구체적으로 기재",
        type: "NARRATIVE",
        sectionTitle: "1. 문제인식 (Problem)",
      },
      {
        id: "f3",
        label: "1-2. 목표시장 및 타겟 고객 분석",
        guidance: "타겟 고객군과 시장 규모(TAM-SAM-SOM), 고객이 겪는 핵심 결핍을 명시",
        type: "NARRATIVE",
        sectionTitle: "1. 문제인식 (Problem)",
      },
      {
        id: "f4",
        label: "2-1. 창업아이템의 핵심 기능 및 구현 방안",
        guidance: "MVP/시제품의 핵심 기능 및 작동 원리, 단계별 개발 로드맵을 기재",
        type: "NARRATIVE",
        sectionTitle: "2. 실현가능성 (Solution)",
      },
      {
        id: "f5",
        label: "2-2. 기술·서비스 차별성 및 경쟁력",
        guidance: "기존 경쟁사/대체재 대비 가격, 성능, 기술적 우위 요소와 진입장벽을 비교 기재",
        type: "NARRATIVE",
        sectionTitle: "2. 실현가능성 (Solution)",
      },
      {
        id: "f6",
        label: "3-1. 비즈니스 모델 및 수익화 방안",
        guidance: "가격 정책, 과금 방식(구독/건당), 주요 수익 파이프라인을 구체적 수치로 명시",
        type: "NARRATIVE",
        sectionTitle: "3. 성장전략 (Scale-up)",
      },
      {
        id: "f7",
        label: "3-2. 시장 진입 및 고객 확보(마케팅) 전략",
        guidance: "초기 고객 획득 채널, 판로 개척 방안 및 협력 네트워크 구축 계획 기재",
        type: "NARRATIVE",
        sectionTitle: "3. 성장전략 (Scale-up)",
      },
      {
        id: "f8",
        label: "4-1. 대표자 및 팀원 역량",
        guidance: "대표자 및 주요 팀원의 전공, 실무 경력, 아이템과의 적합성 및 업무 분장 명시",
        type: "NARRATIVE",
        sectionTitle: "4. 팀구성 (Team)",
      },
      {
        id: "f9",
        label: "4-2. 사업비 집행 및 고용 창출 계획",
        guidance: "정부지원금 신청액의 비목별(재료비/외주비/인건비) 활용 계획 및 신규 고용 계획 기재",
        type: "NARRATIVE",
        sectionTitle: "4. 팀구성 (Team)",
      },
    ],
    constraints: ["분량 최대 15페이지 내외", "양식의 목차 및 기본 표 변경 금지"],
    warnings: [],
  },
  "early-startup": {
    title: "2026년 중소벤처기업부 초기창업패키지 사업계획서",
    fields: [
      {
        id: "f1",
        label: "기본 정보",
        guidance: "기업명, 사업자등록번호, 설립일, 매출액, 종업원 수 등 기본 기업 현황",
        type: "FACT",
        sectionTitle: "기업 일반현황",
      },
      {
        id: "f2",
        label: "1-1. 창업아이템 개요 및 시장 기회",
        guidance: "기출시 제품의 시장 반응, 사용자 피드백 및 스케일업 필요성 기재",
        type: "NARRATIVE",
        sectionTitle: "1. 문제인식 (Problem)",
      },
      {
        id: "f3",
        label: "2-1. 제품·서비스 고도화 및 기술 경쟁력",
        guidance: "기확보된 특허/IP, 기술 성능 지표 및 양산/고도화 개발 계획 기재",
        type: "NARRATIVE",
        sectionTitle: "2. 실현가능성 (Solution)",
      },
      {
        id: "f4",
        label: "3-1. 국내외 시장 진출 및 매출 실현 전략",
        guidance: "유통망 다각화, B2B/B2G 납품 실적, 해외 수출 전략 및 연차별 매출 목표 명시",
        type: "NARRATIVE",
        sectionTitle: "3. 성장전략 (Scale-up)",
      },
      {
        id: "f5",
        label: "3-2. 투자유치 및 자금 조달 계획",
        guidance: "기존 투자 유치 실적 및 향후 후속 투자 유치 로드맵 기재",
        type: "NARRATIVE",
        sectionTitle: "3. 성장전략 (Scale-up)",
      },
      {
        id: "f6",
        label: "4-1. 조직 구성 및 추가 인력 채용 계획",
        guidance: "핵심 개발/영업 조직 역량 및 신규 고용 창출 계획 기재",
        type: "NARRATIVE",
        sectionTitle: "4. 팀구성 (Team)",
      },
    ],
    constraints: ["분량 20페이지 이내", "양식 목차 준수"],
    warnings: [],
  },
  "r-and-d": {
    title: "2026년 디딤돌 R&D 창업성장기술개발 연구개발계획서",
    fields: [
      {
        id: "f1",
        label: "신청기업 기본정보",
        guidance: "기업명, 연구전담부서 유무, 부채비율, 업력 등 R&D 기본 요건",
        type: "FACT",
        sectionTitle: "연구개발기관 현황",
      },
      {
        id: "f2",
        label: "1-1. 연구개발의 필요성 및 시급성",
        guidance: "국가 기술 자립화, 수입 대체 효과 및 기존 기술의 한계 극복 필요성 기재",
        type: "NARRATIVE",
        sectionTitle: "1. 연구개발과제의 필요성",
      },
      {
        id: "f3",
        label: "2-1. 연구개발 최종 목표 및 정량적 성능 지표",
        guidance: "세계 최고 수준 대비 개발 목표치(공인시험인증 규격 등)를 수치로 명시",
        type: "NARRATIVE",
        sectionTitle: "2. 연구개발과제의 목표 및 내용",
      },
      {
        id: "f4",
        label: "2-2. 핵심 연구개발 방법 및 기술 차별성",
        guidance: "독창적 알고리즘/공정 설계 및 특허 회피/선점 전략 기재",
        type: "NARRATIVE",
        sectionTitle: "2. 연구개발과제의 목표 및 내용",
      },
      {
        id: "f5",
        label: "3-1. 사업화 전략 및 경제적 파급효과",
        guidance: "기술 이전, 상용화 양산 계획 및 5개년 매출/고용 예상 효과 기재",
        type: "NARRATIVE",
        sectionTitle: "3. 연구개발성과의 활용 및 사업화 계획",
      },
    ],
    constraints: ["정량적 목표 공인시험성적서 필수 기재", "연구비 비목 규정 준수"],
    warnings: [],
  },
  "youth-academy": {
    title: "2026년 청년창업사관학교 사업화 계획서",
    fields: [
      {
        id: "f1",
        label: "기본 정보",
        guidance: "대표자 연령, 기업명, 사업자번호 등 청년창업 적격 요건",
        type: "FACT",
        sectionTitle: "기본현황",
      },
      {
        id: "f2",
        label: "1. 창업아이템 개요 및 기술 혁신성",
        guidance: "제조/ICT 융합 핵심 기술의 독창성과 혁신성 기재",
        type: "NARRATIVE",
        sectionTitle: "1. 기술성",
      },
      {
        id: "f3",
        label: "2. 시제품 제작 및 양산화 계획",
        guidance: "사관학교 입교 기간 내 시제품 완성 및 양산 공정 구축 방안 기재",
        type: "NARRATIVE",
        sectionTitle: "2. 사업성",
      },
      {
        id: "f4",
        label: "3. 판로 개척 및 해외 진출 전략",
        guidance: "크라우드펀딩, 글로벌 전시회 참가 및 바이어 발굴 로드맵 기재",
        type: "NARRATIVE",
        sectionTitle: "3. 시장성",
      },
      {
        id: "f5",
        label: "4. 대표자 창업 의지 및 사업 추진 역량",
        guidance: "창업 성공에 대한 열정, 관련 전공/자격증 및 팀원 역량 명시",
        type: "NARRATIVE",
        sectionTitle: "4. 대표자 역량",
      },
    ],
    constraints: ["사관학교 출석 및 중간평가 규정 준수"],
    warnings: [],
  },
};

/**
 * 목표 공고명 또는 서식 ID에 매핑되는 표준 서식 스키마 반환
 */
export function getStandardFormSchema(programTitle?: string): FormSchema {
  if (!programTitle) return STANDARD_FORM_SCHEMAS["pre-startup"];

  const title = programTitle.toLowerCase();
  if (title.includes("초기") || title.includes("early")) {
    return STANDARD_FORM_SCHEMAS["early-startup"];
  }
  if (title.includes("r&d") || title.includes("디딤돌") || title.includes("기술개발")) {
    return STANDARD_FORM_SCHEMAS["r-and-d"];
  }
  if (title.includes("청년") || title.includes("사관학교") || title.includes("청창사")) {
    return STANDARD_FORM_SCHEMAS["youth-academy"];
  }
  if (title.includes("도약") || title.includes("scaleup")) {
    return STANDARD_FORM_SCHEMAS["early-startup"]; // 스케일업 형태
  }
  return STANDARD_FORM_SCHEMAS["pre-startup"];
}

export const DEFAULT_INITIAL_MESSAGE =
  "안녕하세요! Ziwon.AI 서식 맞춤형 사업계획서 수석 컨설턴트입니다. 😊\n\n공고 서식의 각 항목과 주관기관 작성 지침(※)에 맞춰, 1:1 심층 인터뷰를 통해 완벽한 사업계획서를 완성해 드릴게요.\n\n구상 중이신 **창업 아이템명**과 **핵심 아이디어**를 편하게 말씀해 주세요!";

export const DEFAULT_SUGGESTIONS = [
  "🌱 스마트팜 원격 온습도 모니터링 및 AI 생육 예측 솔루션",
  "📦 친환경 미세플라스틱 저감 생분해 완충재 포장 플랫폼",
  "🩺 시니어 만성질환자 맞춤형 비대면 AI 헬스케어 디바이스",
];

