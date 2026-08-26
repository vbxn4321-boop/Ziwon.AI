import { PsstBusinessPlanResult, PsstGeneratorInput } from "@/lib/ai/psst-generator";

export type PsstSectionKey = "overview" | "problem" | "solution" | "scaleUp" | "team" | "evaluation";
export type CreationMode = "chat" | "form";
export type CanvasTheme = "dark" | "light";

export interface PsstPlanGeneratorProps {
  initialProgramTitle?: string;
  initialPlanData?: any;
  onBackToNotices?: () => void;
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
