/**
 * PSST 스튜디오 네비게이터 유틸
 *
 * 공고 상세 페이지에서 PSST 사업계획서 스튜디오로 이동할 때,
 * 해당 공고의 AI 심층분석 데이터(배점기준, 주관기관 성격, 가점요건 등)를
 * sessionStorage를 통해 전달합니다.
 *
 * [사용 예시] (공고 상세 모달 또는 페이지에서)
 * import { navigateToPsstStudio } from "@/lib/psst-navigator";
 * navigateToPsstStudio(router, { programTitle: "2026 예창패", programAnalysis: aiData });
 */

import { ProgramAnalysisContext } from "@/lib/ai/psst-generator";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export interface PsstNavigationOptions {
  /** 연계할 공고명 (PSST 서식 자동 선택에 사용) */
  programTitle: string;
  /** 공고 AI 심층분석 결과 데이터 */
  programAnalysis?: ProgramAnalysisContext;
}

/**
 * 공고 상세에서 PSST 스튜디오로 이동하면서 분석 데이터를 sessionStorage로 전달
 */
export function navigateToPsstStudio(
  router: AppRouterInstance,
  options: PsstNavigationOptions
): void {
  const { programTitle, programAnalysis } = options;

  // Store analysis data in sessionStorage (scoped by unique key)
  const analysisKey = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  if (programAnalysis) {
    try {
      sessionStorage.setItem(`psst_analysis_${analysisKey}`, JSON.stringify(programAnalysis));
    } catch (e) {
      console.warn("[PSST Navigator] Failed to store analysis in sessionStorage:", e);
    }
  }

  const params = new URLSearchParams();
  params.set("targetTitle", programTitle);
  if (programAnalysis) {
    params.set("analysisKey", analysisKey);
  }

  router.push(`/consultant?${params.toString()}`);
}
