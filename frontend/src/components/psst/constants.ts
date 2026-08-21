import { TargetProgramFormat, PsstSectionKey } from "./types";

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

export const DEFAULT_INITIAL_MESSAGE =
  "안녕하세요! Ziwon.AI 사업계획서 전문 컨설턴트입니다. 😊\n\n구상 중이신 **창업 아이템명**과 **어떤 서비스/제품인지 핵심 아이디어**를 편하게 한 줄로 말씀해 주시면, 제가 심층 인터뷰를 통해 대한민국 표준 PSST 사업계획서를 완성해 드릴게요!";

export const DEFAULT_SUGGESTIONS = [
  "🌱 스마트팜 원격 온습도 모니터링",
  "📦 친환경 생분해 완충재 포장",
  "🩺 AI 헬스케어 비대면 건강관리",
];
