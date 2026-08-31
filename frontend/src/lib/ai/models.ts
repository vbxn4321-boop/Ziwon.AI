/**
 * Ziwon.AI Unified Google Gemini Model Lineup & Cascade Fallback Utility
 * 
 * Latest Google Gemini 3.7 Flash & 3.x Series
 */

// 1. Fast / General Analysis Cascade (Used by Gemini Analyzer, Match, Chat Coach)
export const FAST_MODELS: string[] = [
  process.env.AI_GENERAL_MODEL || "gemini-3.7-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-flash-latest",
  "gemini-2.0-flash",
];

// 2. Deep Reasoning & Standard PSST Plan Generation Cascade
export const REASONING_MODELS: string[] = [
  process.env.AI_REASONING_MODEL || "gemini-3.7-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.1-pro-preview",
  "gemini-2.5-pro",
  "gemini-3.5-flash",
  "gemini-flash-latest",
  "gemini-2.0-flash",
];

/**
 * Return deduplicated model candidates list
 */
export function getCandidateModels(type: "fast" | "reasoning" = "fast"): string[] {
  const list = type === "reasoning" ? REASONING_MODELS : FAST_MODELS;
  return list.filter((v, i, a) => a.indexOf(v) === i && !!v && typeof v === "string");
}
