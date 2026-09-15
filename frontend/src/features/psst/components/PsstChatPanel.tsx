"use client";

import React from "react";
import {
  Sparkles,
  Send,
  Flame,
  CheckCircle2,
  RefreshCw,
  User,
} from "lucide-react";
import { PsstBusinessPlanResult } from "@/lib/ai/psst-generator";
import {
  ChatMessage,
  InterviewProgress,
  PsstSectionKey,
} from "../types";
import { SECTION_LABELS } from "../constants";

interface PsstChatPanelProps {
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (val: string) => void;
  isChatSending: boolean;
  isGenerating: boolean;
  interviewProgress: InterviewProgress;
  currentSuggestions: string[];
  generatedResult: PsstBusinessPlanResult | null;
  chatScrollRef: React.RefObject<HTMLDivElement | null>;
  onSendChat: (e: React.FormEvent) => void;
  onGenerateFromChat: () => void;
  onQuickSuggestion: (sugg: string) => void;
  onScrollToSection: (sec: PsstSectionKey) => void;
}

export const PsstChatPanel: React.FC<PsstChatPanelProps> = ({
  chatMessages,
  chatInput,
  setChatInput,
  isChatSending,
  isGenerating,
  interviewProgress,
  currentSuggestions,
  generatedResult,
  chatScrollRef,
  onSendChat,
  onGenerateFromChat,
  onQuickSuggestion,
  onScrollToSection,
}) => {
  const totalFields = interviewProgress.totalFields || 5;
  const completedFields = interviewProgress.completedCount || 0;
  const interviewReady = completedFields >= totalFields;
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-white text-slate-900">
      {/* Chat Header Sub-Banner */}
      <div className="p-4 bg-white border-b border-slate-200 flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between flex-shrink-0">
        <div className="flex-1 min-w-0 flex items-center space-x-2 px-1">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] text-slate-800 font-bold truncate">AI 작성 도우미</p>
            <p className="text-[10px] text-slate-500 truncate">현재 문서 항목을 함께 작성합니다</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onGenerateFromChat}
          disabled={isGenerating}
          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-50 flex-shrink-0 cursor-pointer"
        >
          <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
          <span>{isGenerating ? "초안 생성 중..." : interviewReady ? "초안 만들기" : "지금까지 답변으로 초안 만들기"}</span>
        </button>
      </div>

      {/* Compact document status, keeping the conversation as the primary action. */}
      <div className="px-4 py-2 bg-white border-b border-slate-200 flex items-center gap-3 flex-shrink-0 text-[11px]">
        <span className="font-semibold text-slate-600">현재 항목</span>
        <span className="truncate text-slate-900">{interviewProgress.currentFieldLabel || "사업계획서 개요"}</span>
        <span className="ml-auto text-slate-400 tabular-nums">{completedFields}/{totalFields} 완료</span>
        <div className="w-16 h-1 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, (completedFields / Math.max(1, totalFields)) * 100)}%` }} /></div>
      </div>

      {/* Scrollable Chat Area */}
      <div
        ref={chatScrollRef as any}
        className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-5 text-xs bg-[#fbfbfa]"
      >
        {chatMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start space-x-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                Z
              </div>
            )}

            <div className={`space-y-1 max-w-[85%] ${msg.role === "user" ? "text-right" : "text-left"}`}>
              <span className="text-[10px] text-slate-500 font-semibold block">
                {msg.role === "assistant" ? "Ziwon AI 컨설턴트" : "창업자"}
              </span>
              <div
                className={`p-3.5 rounded-2xl leading-relaxed whitespace-pre-line text-xs ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white rounded-tr-none shadow-md"
                    : "bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-sm"
                }`}
              >
                {msg.content
                  .replace(/<<<SUGGESTIONS>>>[\s\S]*?(?:<<<PROGRESS>>>|PROGRESS|\{|```|$)/gi, "")
                  .replace(/<<<PROGRESS>>>[\s\S]*?$/gi, "")
                  .replace(/PROGRESS:?\s*\{[\s\S]*?\}/gi, "")
                  .replace(/\{[\s\S]*?"itemTarget"[\s\S]*?\}/gi, "")
                  .replace(/\{[\s\S]*?"currentStep"[\s\S]*?\}/gi, "")
                  .replace(/```json[\s\S]*?```/gi, "")
                  .trim()}
              </div>
            </div>

            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs flex-shrink-0">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}

        {generatedResult && (
          <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-indigo-600 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>PSST 사업계획서 우측 렌더링 완료!</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                {generatedResult.evaluationReport.score}점 ({generatedResult.evaluationReport.grade})
              </span>
            </div>
            <p className="text-[11px] text-slate-600">
              우측 문서 시트에 사업계획서 전문과 심사역 평가 리포트가 렌더링되었습니다.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(["overview", "problem", "solution", "scaleUp", "team", "evaluation"] as PsstSectionKey[]).map(
                (sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => onScrollToSection(sec)}
                    className="px-2 py-1 rounded-lg bg-white hover:bg-slate-50 text-[10px] text-slate-600 border border-slate-200 hover:border-indigo-400 transition-colors cursor-pointer"
                  >
                    {SECTION_LABELS[sec]?.split(" ")[0]}
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {isChatSending && (
          <div className="flex items-center space-x-2 text-indigo-400 text-xs pl-9">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>컨설턴트가 답변을 분석하고 있습니다...</span>
          </div>
        )}
      </div>

      {/* 1-Click Action Suggestion Pills */}
      <div className="px-3 py-2 bg-white border-t border-slate-200 flex items-center justify-between overflow-x-auto gap-2">
        <span className="text-[10px] text-slate-400 font-medium flex items-center space-x-1 flex-shrink-0">
          <Flame className="w-3 h-3 text-amber-400" />
          <span>{generatedResult ? "✏️ 실시간 수정 추천:" : "💡 원클릭 빠른 답변:"}</span>
        </span>

        <div className="flex items-center space-x-1.5 overflow-x-auto">
          {generatedResult ? (
            <>
              <button
                type="button"
                onClick={() => onQuickSuggestion("2-1 핵심 기술 사양과 특허 차별성을 좀 더 전문적으로 보강해줘")}
                className="px-2 py-1 rounded-lg bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 text-[10px] whitespace-nowrap transition-colors border border-slate-200 cursor-pointer"
              >
                🔧 기술 사양 보강
              </button>
              <button
                type="button"
                onClick={() => onQuickSuggestion("3-1 과금 모델을 월 39,000원 구독형 SaaS로 수정해줘")}
                className="px-2 py-1 rounded-lg bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 text-[10px] whitespace-nowrap transition-colors border border-slate-200 cursor-pointer"
              >
                💰 BM/가격 수정
              </button>
              <button
                type="button"
                onClick={() => onQuickSuggestion("3-3 예산 계획표에서 인건비와 시제품 제작비 비중을 조정해줘")}
                className="px-2 py-1 rounded-lg bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 text-[10px] whitespace-nowrap transition-colors border border-slate-200 cursor-pointer"
              >
                📊 예산표 조정
              </button>
            </>
          ) : (
            currentSuggestions.map((sugg, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onQuickSuggestion(sugg)}
                className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-900 text-[10px] whitespace-nowrap transition-all border border-indigo-200 flex items-center space-x-1 cursor-pointer"
              >
                <span>{sugg}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Input Bar */}
      <form
        onSubmit={onSendChat}
        className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2 flex-shrink-0"
      >
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder={`${interviewProgress.currentFieldLabel || "현재 항목"}에 대해 편하게 적어 주세요 (엔터로 전송)`}
          disabled={isChatSending || isGenerating}
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
        />
        {!generatedResult && interviewProgress.currentFieldId && (
          <button
            type="button"
            onClick={() => onQuickSuggestion("현재 항목은 건너뛰고 다음 항목으로 넘어가줘")}
            disabled={isChatSending || isGenerating}
            className="px-2.5 py-2.5 rounded-xl border border-slate-200 text-[10px] text-slate-500 hover:text-slate-800 hover:border-slate-400 whitespace-nowrap disabled:opacity-40"
            title="이 항목은 나중에 작성하고 다음 질문으로 이동합니다"
          >
            건너뛰기
          </button>
        )}
        <button
          type="submit"
          disabled={!chatInput.trim() || isChatSending || isGenerating}
          className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-40 shadow-md shadow-indigo-600/30 cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
