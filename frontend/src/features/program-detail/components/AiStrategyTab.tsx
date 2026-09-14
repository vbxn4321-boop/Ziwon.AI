"use client";

import React from "react";
import Link from "next/link";
import {
  Sparkles,
  Building2,
  RefreshCw,
  Lock,
  TrendingUp,
  Award,
  Scale,
  AlertTriangle,
  FileCheck,
  CheckCircle2,
} from "lucide-react";

interface AiStrategyTabProps {
  aiData: any;
  analysisError: string | null;
  isAnalyzing: boolean;
  onRunLiveAnalysis: () => void;
  gateState: "unauthenticated" | "no_company" | null;
  isMatching: boolean;
  matchingResult: any;
  onStartMatching: () => void;
  isLoggedIn?: boolean;
  onPromptLogin?: () => void;
}

export const AiStrategyTab: React.FC<AiStrategyTabProps> = ({
  aiData,
  analysisError,
  isAnalyzing,
  onRunLiveAnalysis,
  gateState,
  isMatching,
  matchingResult,
  onStartMatching,
  isLoggedIn = false,
  onPromptLogin,
}) => {
  return (
    <div className="space-y-6">
      {/* Error Notice */}
      {analysisError && (
        <div className="bg-rose-50 border border-rose-300 p-4 rounded-2xl flex items-center justify-between gap-3 text-rose-700">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{analysisError}</span>
          </div>
          <button
            onClick={onRunLiveAnalysis}
            disabled={isAnalyzing}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer"
          >
            다시 시도
          </button>
        </div>
      )}

      {!aiData ? (
        /* Unanalyzed Empty State - CTA Button */
        <div className="bg-gradient-to-br from-blue-50/90 via-indigo-50/40 to-white p-8 sm:p-12 rounded-2xl border border-blue-200 text-center space-y-5 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-blue-100 border border-blue-200 flex items-center justify-center mx-auto shadow-sm">
            <Sparkles className="w-7 h-7 text-blue-600 animate-pulse" />
          </div>
          <div className="space-y-2 max-w-lg mx-auto">
            <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
              아직 AI 합격 전략 리포트가 생성되지 않았습니다
            </h3>
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
              공고문 전문과 첨부 서류를 Gemini AI로 정밀 분석하여 <strong>합격 공략 3-Step 브리핑, 배점표 심사 기준, 필수 제출 서류 체크리스트, 가점 확보 요건</strong>을 즉시 도출합니다.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={onRunLiveAnalysis}
              disabled={isAnalyzing}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm shadow-md shadow-blue-600/25 transition-all flex items-center space-x-2 mx-auto cursor-pointer disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isAnalyzing ? "animate-spin" : ""}`} />
              <span>{isAnalyzing ? "Gemini AI가 정밀 분석 중입니다..." : "AI 합격 전략 리포트 지금 분석하기"}</span>
            </button>
          </div>
        </div>
      ) : !isLoggedIn ? (
        /* 🔒 Blind/Blur Teaser State for Unauthenticated Users */
        <div className="relative rounded-3xl overflow-hidden border border-blue-200/80 bg-gradient-to-b from-blue-50/30 to-slate-100/60 p-6 sm:p-8 space-y-6">
          {/* Glassmorphism Centered Lock Banner */}
          <div className="relative z-20 max-w-lg mx-auto bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-blue-200 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-500 flex items-center justify-center mx-auto text-white shadow-lg shadow-blue-500/25">
              <Lock className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Gemini AI 합격 전략 리포트 생성 완료</span>
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight leading-snug">
                로그인 후 전체 AI 합격 전략을 무료로 확인하세요
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                이 공고의 <strong>3-Step 합격 로드맵, 심사위원 배점표 심층 분석, 가점 확보 요건, 필수 제출 서류 체크리스트</strong>가 준비되어 있습니다.
              </p>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={onPromptLogin}
                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-sm shadow-md shadow-blue-600/30 transition-all cursor-pointer transform hover:-translate-y-0.5"
              >
                ⚡ 3초 간편 로그인하고 전체 리포트 열람하기
              </button>
              <p className="text-[11px] text-slate-400">
                카카오 · 구글 · 이메일로 3초 만에 무료 열람 가능합니다
              </p>
            </div>
          </div>

          {/* Blurred Background Teaser Preview */}
          <div className="filter blur-[7px] select-none pointer-events-none opacity-50 space-y-6 max-h-[420px] overflow-hidden">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3">
              <div className="h-5 bg-slate-200 rounded w-1/3"></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="h-24 bg-blue-100 rounded-xl"></div>
                <div className="h-24 bg-amber-100 rounded-xl"></div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3">
              <div className="h-5 bg-slate-200 rounded w-1/4"></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="h-28 bg-indigo-100 rounded-xl"></div>
                <div className="h-28 bg-indigo-100 rounded-xl"></div>
                <div className="h-28 bg-indigo-100 rounded-xl"></div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Analyzed Strategy Report for Logged-in Users */
        <div className="space-y-6">
          {/* Header & Controls */}
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50/50 to-white p-5 rounded-2xl border border-blue-200 flex items-center justify-between flex-wrap gap-3 shadow-xs">
            <div className="flex items-center space-x-3">
              <Sparkles className="w-6 h-6 text-blue-600" />
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Gemini AI 정밀 합격 전략 리포트</h3>
                <p className="text-xs text-slate-500">공고문 팩트 기반 합격 대응 가이드라인</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={onStartMatching}
                disabled={isMatching}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs transition-all flex items-center space-x-1.5 shadow-xs cursor-pointer"
              >
                <Building2 className={`w-3.5 h-3.5 ${isMatching ? "animate-spin" : "text-amber-200"}`} />
                <span>{isMatching ? "적합도 분석 중..." : "내 기업 적합도 진단"}</span>
              </button>
              <button
                onClick={onRunLiveAnalysis}
                disabled={isAnalyzing}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs transition-all flex items-center space-x-1.5 cursor-pointer shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? "animate-spin" : ""}`} />
                <span>{isAnalyzing ? "분석 중..." : "AI 재분석"}</span>
              </button>
            </div>
          </div>

          {/* Company Matching Gates */}
          {gateState === "unauthenticated" && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex items-center justify-between gap-3 text-slate-800 shadow-xs">
              <div className="flex items-center space-x-3">
                <Lock className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="font-bold text-xs text-slate-900">로그인이 필요한 서비스입니다</p>
                  <p className="text-[11px] text-slate-600">기업 정보 기반 맞춤 적합도 분석을 위해 먼저 로그인해주세요.</p>
                </div>
              </div>
              <Link
                href="/login"
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs"
              >
                로그인
              </Link>
            </div>
          )}

          {matchingResult && (
            <div className="bg-white border border-indigo-200 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-3">
                  <TrendingUp className="w-6 h-6 text-indigo-600" />
                  <div>
                    <span className="font-extrabold text-sm text-slate-900">내 기업 맞춤 적합도 진단 결과</span>
                    <p className="text-xs text-slate-500">등록된 기업 프로필 기준 심사 적합도</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-200">
                  <span className="text-xs text-indigo-700 font-bold">종합 점수</span>
                  <span className="text-xl font-black text-indigo-700">{matchingResult.totalScore ?? 0}점</span>
                </div>
              </div>
              {matchingResult.recommendation && (
                <p className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200 leading-relaxed">
                  💡 {matchingResult.recommendation}
                </p>
              )}
            </div>
          )}

          {/* 1. Organizer & Program Nature Strategic Analysis Card */}
          {aiData.organizerStrategy && (
            <div className="bg-white border border-blue-200 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-blue-100 pb-3">
                <div className="flex items-center space-x-2.5">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <h4 className="font-extrabold text-slate-900 text-sm">
                    주관·수행기관 성격 및 정책 의도 분석
                  </h4>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                  {aiData.organizerStrategy.programNature || "정책 맞춤형 지원사업"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-blue-50/40 p-4 rounded-xl border border-blue-100 space-y-1.5">
                  <span className="text-blue-800 font-bold block text-[11px]">🎯 기관 핵심 요구 성과지표 (KPI)</span>
                  <p className="text-slate-800 leading-relaxed font-medium">
                    {aiData.organizerStrategy.coreObjective || "사업화 실적 및 고용/매출 증대 목표 명확화"}
                  </p>
                </div>
                <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-100 space-y-1.5">
                  <span className="text-amber-800 font-bold block text-[11px]">💡 심사위원 관점 제안서 작성 방향</span>
                  <p className="text-slate-800 leading-relaxed font-medium">
                    {aiData.organizerStrategy.strategyTip || "주관기관의 설립 목적에 부합하는 문제 해결형 제안 구성"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 2. AI 3-Step Pass Strategy Briefing */}
          {aiData.summaryReport && Array.isArray(aiData.summaryReport) && (
            <div className="bg-white border border-indigo-200 rounded-2xl p-5 sm:p-6 space-y-3 shadow-sm">
              <h4 className="font-extrabold text-indigo-700 text-sm flex items-center space-x-2">
                <Award className="w-4 h-4 text-indigo-600" />
                <span>AI 맞춤형 3-Step 합격 공략 로드맵</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                {aiData.summaryReport.map((sentence: string, idx: number) => (
                  <div key={idx} className="bg-indigo-50/40 p-4 rounded-xl border border-indigo-100 space-y-2 flex flex-col justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-black text-[10px] w-fit inline-block mb-1.5 border border-indigo-200">
                        STEP 0{idx + 1}
                      </span>
                      <p className="text-xs text-slate-800 leading-relaxed font-medium">{sentence}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Evaluation Scoring Rubric (배점표 공략) */}
          {aiData.evaluationCriteria && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-3">
                <h4 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2">
                  <Scale className="w-4 h-4 text-blue-600" />
                  <span>심사위원 평가 기준 & 세부 배점표 공략</span>
                </h4>
                {aiData.evaluationCriteria.steps && aiData.evaluationCriteria.steps.length > 0 && (
                  <div className="flex items-center space-x-1.5 overflow-x-auto text-[11px]">
                    {aiData.evaluationCriteria.steps.map((step: string, sIdx: number) => (
                      <div key={sIdx} className="flex items-center space-x-1 flex-shrink-0">
                        <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                          {step}
                        </span>
                        {sIdx < aiData.evaluationCriteria.steps.length - 1 && <span className="text-slate-400">➔</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {aiData.evaluationCriteria.summary && (
                <p className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200 leading-relaxed">
                  {aiData.evaluationCriteria.summary}
                </p>
              )}

              {/* Detailed Scoring Rubric Cards */}
              {Array.isArray(aiData.evaluationCriteria.items) && aiData.evaluationCriteria.items.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                  {aiData.evaluationCriteria.items.map((item: any, rIdx: number) => {
                    const isObj = typeof item === "object" && item !== null;
                    const category = isObj ? item.category || `평가항목 ${rIdx + 1}` : item;
                    const scoreWeight = isObj ? item.scoreWeight : "배점 공략";
                    const focus = isObj ? item.evaluationFocus : null;
                    const strategy = isObj ? item.writingStrategy : null;

                    return (
                      <div key={rIdx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5 flex flex-col justify-between shadow-2xs">
                        <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                          <span className="font-bold text-slate-900 text-xs truncate">{category}</span>
                          {scoreWeight && (
                            <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-extrabold text-[10px] border border-blue-200 flex-shrink-0">
                              {scoreWeight}
                            </span>
                          )}
                        </div>
                        {focus && (
                          <div className="text-[11px] text-slate-700 space-y-1">
                            <strong className="text-amber-800 font-bold block text-[10px]">🎯 심사위원 착안점</strong>
                            <p className="leading-relaxed">{focus}</p>
                          </div>
                        )}
                        {strategy && (
                          <div className="text-[11px] text-slate-800 bg-white p-2.5 rounded-lg border border-indigo-200 space-y-0.5">
                            <strong className="text-indigo-700 font-bold block text-[10px]">✍️ 고득점 작성 전략</strong>
                            <p className="leading-relaxed">{strategy}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 4. Extra Points & Disqualification Exclusions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Extra Points */}
            {aiData.extraPoints && Array.isArray(aiData.extraPoints.items) && aiData.extraPoints.items.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-sm">
                <h4 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>가점 및 우선선정 우대 요건</span>
                </h4>
                <div className="space-y-2">
                  {aiData.extraPoints.items.map((pt: string, pIdx: number) => (
                    <div key={pIdx} className="bg-amber-50/50 p-3 rounded-xl border border-amber-200 flex items-start space-x-2 text-xs">
                      <span className="text-amber-600 font-bold">★</span>
                      <span className="text-slate-800 leading-tight">{pt}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Exclusions */}
            {aiData.excludedConditions && Array.isArray(aiData.excludedConditions.items) && aiData.excludedConditions.items.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-sm">
                <h4 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span>행정 탈락 방지 (신청 제외 결격 요건)</span>
                </h4>
                <div className="space-y-2">
                  {aiData.excludedConditions.items.map((ex: string, eIdx: number) => (
                    <div key={eIdx} className="bg-rose-50/50 p-3 rounded-xl border border-rose-200 flex items-start space-x-2 text-xs">
                      <span className="text-rose-600 font-bold">✕</span>
                      <span className="text-slate-800 leading-tight">{ex}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 5. Required Documents Checklist */}
          {aiData.requiredDocuments && Array.isArray(aiData.requiredDocuments) && aiData.requiredDocuments.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-3 shadow-sm">
              <h4 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <span>필수 제출 서류 체크리스트 ({aiData.requiredDocuments.length}종)</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {aiData.requiredDocuments.map((doc: string, dIdx: number) => (
                  <div key={dIdx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-start space-x-2.5 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-800 font-semibold">{doc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
