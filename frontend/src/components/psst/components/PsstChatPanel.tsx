"use client";

import React from "react";
import {
  Sparkles,
  Send,
  Flame,
  Target,
  RefreshCw,
  User,
} from "lucide-react";
import { PsstBusinessPlanResult } from "@/lib/ai/psst-generator";
import {
  ChatMessage,
  InterviewProgress,
  PsstFormData,
  PsstSectionKey,
} from "../types";
import { TARGET_PROGRAM_FORMATS, SECTION_LABELS } from "../constants";

interface PsstChatPanelProps {
  formData: PsstFormData;
  setFormData: React.Dispatch<React.SetStateAction<PsstFormData>>;
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
  formData,
  setFormData,
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
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Chat Header Sub-Banner */}
      <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between flex-shrink-0 shadow-sm">
        {/* Target Format Selector */}
        <div className="flex-1 min-w-0 flex items-center space-x-2 bg-slate-950 px-3 py-2 rounded-xl border border-amber-500/30">
          <span className="text-[11px] text-amber-400 font-bold flex-shrink-0 flex items-center space-x-1">
            <Target className="w-3.5 h-3.5 text-amber-400" />
            <span>목표 서식:</span>
          </span>
          <select
            value={formData.targetProgramTitle}
            onChange={(e) => setFormData({ ...formData, targetProgramTitle: e.target.value })}
            className="w-full bg-transparent text-slate-100 text-xs font-bold focus:outline-none cursor-pointer pr-1"
            title="AI 챗봇이 인터뷰할 기준이 되는 정부 공인 표준 서식"
          >
            {TARGET_PROGRAM_FORMATS.map((fmt) => (
              <option key={fmt.id} value={fmt.name} className="bg-slate-900 text-slate-200 py-1">
                [{fmt.badge}] {fmt.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={onGenerateFromChat}
          disabled={isGenerating}
          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center space-x-1.5 disabled:opacity-50 flex-shrink-0 cursor-pointer"
        >
          <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
          <span>{isGenerating ? "문서 생성 중..." : "대화 기반 PSST 생성"}</span>
        </button>
      </div>

      {/* PSST 5-Step Interactive Interview Progress Bar & Checklist */}
      <div className="px-3 py-2 bg-slate-950/95 border-b border-slate-800/80 space-y-1.5 flex-shrink-0">
        <div className="flex items-center justify-between text-[10px]">
          <span className="font-bold text-slate-300 flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span>PSST 필수 인터뷰 수집도</span>
          </span>
          <span className="text-indigo-400 font-extrabold">
            {interviewProgress.completedCount} / 5단계 완료 ({Math.round((interviewProgress.completedCount / 5) * 100)}%)
          </span>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
          <div
            className="bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-400 h-full rounded-full transition-all duration-300"
            style={{ width: `${Math.max(10, (interviewProgress.completedCount / 5) * 100)}%` }}
          />
        </div>

        {/* 5-Step Badges */}
        <div className="flex items-center justify-between text-[10px] overflow-x-auto gap-1 pt-0.5">
          {[
            { step: 1, label: "1.아이템/타겟", done: interviewProgress.itemTarget, current: interviewProgress.currentStep === 1 },
            { step: 2, label: "2.문제인식(P)", done: interviewProgress.problem, current: interviewProgress.currentStep === 2 },
            { step: 3, label: "3.실현기술(S)", done: interviewProgress.solution, current: interviewProgress.currentStep === 3 },
            { step: 4, label: "4.BM(Scale-up)", done: interviewProgress.scaleUp, current: interviewProgress.currentStep === 4 },
            { step: 5, label: "5.팀역량(Team)", done: interviewProgress.team, current: interviewProgress.currentStep === 5 },
          ].map((s) => (
            <div
              key={s.step}
              className={`px-1.5 py-0.5 rounded-md font-bold transition-all whitespace-nowrap flex items-center space-x-1 ${
                s.done
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : s.current
                  ? "bg-indigo-600/30 text-indigo-200 border border-indigo-500/50 shadow-sm"
                  : "bg-slate-900 text-slate-500 border border-slate-800"
              }`}
            >
              <span>{s.done ? "✓" : s.current ? "⏳" : "○"}</span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable Chat Area */}
      <div
        ref={chatScrollRef as any}
        className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 text-xs"
      >
        {chatMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start space-x-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-md">
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
                    : "bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none shadow-sm"
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
              <div className="w-7 h-7 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs flex-shrink-0">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}

        {generatedResult && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/60 via-indigo-950/60 to-purple-950/60 border border-indigo-500/40 space-y-2.5 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-indigo-300 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>PSST 사업계획서 우측 렌더링 완료!</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                {generatedResult.evaluationReport.score}점 ({generatedResult.evaluationReport.grade})
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              우측 문서 시트에 사업계획서 전문과 심사역 평가 리포트가 렌더링되었습니다.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(["overview", "problem", "solution", "scaleUp", "team", "evaluation"] as PsstSectionKey[]).map(
                (sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => onScrollToSection(sec)}
                    className="px-2 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-[10px] text-slate-300 border border-slate-700 hover:border-indigo-400 transition-colors cursor-pointer"
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
      <div className="px-3 py-2 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between overflow-x-auto gap-2">
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
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-indigo-900/50 hover:text-indigo-200 text-slate-300 text-[10px] whitespace-nowrap transition-colors border border-slate-700 cursor-pointer"
              >
                🔧 기술 사양 보강
              </button>
              <button
                type="button"
                onClick={() => onQuickSuggestion("3-1 과금 모델을 월 39,000원 구독형 SaaS로 수정해줘")}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-indigo-900/50 hover:text-indigo-200 text-slate-300 text-[10px] whitespace-nowrap transition-colors border border-slate-700 cursor-pointer"
              >
                💰 BM/가격 수정
              </button>
              <button
                type="button"
                onClick={() => onQuickSuggestion("3-3 예산 계획표에서 인건비와 시제품 제작비 비중을 조정해줘")}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-indigo-900/50 hover:text-indigo-200 text-slate-300 text-[10px] whitespace-nowrap transition-colors border border-slate-700 cursor-pointer"
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
                className="px-2 py-1 rounded-lg bg-indigo-950/40 hover:bg-indigo-900/70 text-indigo-300 hover:text-white text-[10px] whitespace-nowrap transition-all border border-indigo-500/30 flex items-center space-x-1 shadow-sm cursor-pointer"
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
        className="p-3 bg-slate-900 border-t border-slate-800 flex items-center space-x-2 flex-shrink-0"
      >
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="답변이나 질문을 입력해 주세요... (엔터로 전송)"
          disabled={isChatSending || isGenerating}
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
        />
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
