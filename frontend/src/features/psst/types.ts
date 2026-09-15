import { PsstBusinessPlanResult, PsstGeneratorInput, ProgramAnalysisContext } from "@/lib/ai/psst-generator";
export type { FormFieldType, FormField, FormSchema } from "@/lib/parser/form-schema-parser";
import type { FormField, FormFieldType } from "@/lib/parser/form-schema-parser";

export type PsstSectionKey = "overview" | "problem" | "solution" | "scaleUp" | "team" | "evaluation";
export type CreationMode = "chat" | "form";
export type CanvasTheme = "dark" | "light";

export interface PsstPlanGeneratorProps {
  initialProgramId?: string;
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

/** 서식 칸 단위 진행 상태 */
export interface FormFieldProgressItem {
  id: string;
  label: string;
  guidance?: string;
  type: FormFieldType;
  sectionTitle?: string;
  completed: boolean;
  value?: string;
}

export interface InterviewProgress {
  itemTarget: boolean;
  problem: boolean;
  solution: boolean;
  scaleUp: boolean;
  team: boolean;
  currentStep: number;
  completedCount: number;
  /** 동적 서식 칸 목록 기반 확장 속성 */
  totalFields?: number;
  currentFieldId?: string;
  currentFieldLabel?: string;
  currentFieldGuidance?: string;
  fieldProgress?: FormFieldProgressItem[];
}

export type PsstFormData = PsstGeneratorInput & { budget?: string; programId?: string };
export type { ProgramAnalysisContext };

