"use client";

import React from "react";
import { Sparkles, FileText, Loader2, X, Zap } from "lucide-react";

interface AnalysisGateModalProps {
  isOpen: boolean;
  programTitle: string;
  /** 공고 단위 분석 캐시가 이미 있는가. 있으면 "지금 분석하기"가 즉시 끝난다. */
  hasAnalysis: boolean;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  onProceedEditorOnly: () => void;
  onClose: () => void;
}

/**
 * AI 분석을 열지 않은 공고에서 계획서 작성을 누를 때 뜨는 안내.
 *
 * 그냥 막지 않고 두 갈래를 준다. 분석을 열면 이 공고의 평가항목에 맞춘
 * 단계별 질문을 받고, 열지 않으면 빈 에디터로 바로 들어간다. 무엇을
 * 포기하는지 알고 넘어가게 하는 것이 목적이다.
 */
export const AnalysisGateModal: React.FC<AnalysisGateModalProps> = ({
  isOpen,
  programTitle,
  hasAnalysis,
  isAnalyzing,
  onAnalyze,
  onProceedEditorOnly,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="px-6 pt-6 pb-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-slate-900">AI 분석을 아직 열지 않은 공고입니다</h2>
            <p className="mt-0.5 text-[11px] text-slate-500 truncate">{programTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isAnalyzing}
            className="text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-40 cursor-pointer"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pb-5 space-y-3">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700">
              <Sparkles className="w-3.5 h-3.5" />
              <span>분석하고 작성하면</span>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-600 leading-relaxed">
              이 공고의 평가항목·제출서식을 근거로 AI가 항목을 하나씩 짚어가며 질문합니다.
              답변이 그대로 계획서 칸에 채워집니다.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
              <FileText className="w-3.5 h-3.5" />
              <span>분석 없이 진행하면</span>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-600 leading-relaxed">
              빈 에디터만 열립니다. 목차 자동 구성과 공고 맞춤 질문은 제공되지 않습니다.
            </p>
          </div>

          {hasAnalysis && (
            <p className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold">
              <Zap className="w-3.5 h-3.5" />
              이미 분석된 공고라 바로 열립니다. 기다리지 않아도 됩니다.
            </p>
          )}
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={onProceedEditorOnly}
            disabled={isAnalyzing}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-semibold hover:text-slate-900 hover:border-slate-400 transition-colors disabled:opacity-40 cursor-pointer"
          >
            에디터로 진행
          </button>
          <button
            type="button"
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>분석 중...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>지금 분석하기</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
