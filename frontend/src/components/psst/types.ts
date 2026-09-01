import { PsstBusinessPlanResult, PsstGeneratorInput, ProgramAnalysisContext } from "@/lib/ai/psst-generator";

export type PsstSectionKey = "overview" | "problem" | "solution" | "scaleUp" | "team" | "evaluation";
export type CreationMode = "chat" | "form";
export type CanvasTheme = "dark" | "light";

export interface PsstPlanGeneratorProps {
  initialProgramTitle?: string;
  initialPlanData?: any;
  onBackToNotices?: () => void;
  /** 공고 상세 페이지에서 넘어온 경우, 해당 공고의 AI 심층분석 결과를 전달 */
  initialProgramAnalysis?: ProgramAnalysisContext;
}

export interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  timestamp: string;
}

export interface TargetProgramFormat {
  id: string;
  name: string;
  badge: string;
  description: string;
}

export interface InterviewProgress {
  itemTarget: boolean;
  problem: boolean;
  solution: boolean;
  scaleUp: boolean;
  team: boolean;
  currentStep: number;
  completedCount: number;
}

export type PsstFormData = PsstGeneratorInput & { budget?: string };
export type { ProgramAnalysisContext };
