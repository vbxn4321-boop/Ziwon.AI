"use client";

import React from "react";
import {
  Bot,
  SlidersHorizontal,
  Moon,
  Sun,
  Copy,
  Check,
  Plus,
  FolderHeart,
  Loader2,
  FileDown,
  ChevronLeft,
  ClipboardCopy,
  FileText,
  Sparkles,
} from "lucide-react";
import { CreationMode, CanvasTheme } from "../types";

interface PsstHeaderProps {
  creationMode: CreationMode;
  setCreationMode: (mode: CreationMode) => void;
  canvasTheme: CanvasTheme;
  setCanvasTheme: React.Dispatch<React.SetStateAction<CanvasTheme>>;
  hasResult: boolean;
  isCopied: boolean;
  onCopyFullText: () => void;
  onResetNew: () => void;
  onBackToNotices?: () => void;
  onSavePlan?: () => void;
  isSavingPlan?: boolean;
  saveSuccessMsg?: string | null;
  onDownloadPdf?: () => void;
  targetProgramTitle?: string;
  currentStep?: number;
  onOpenVault?: () => void;
}

export const PsstHeader: React.FC<PsstHeaderProps> = ({
  creationMode,
  setCreationMode,
  canvasTheme,
  setCanvasTheme,
  hasResult,
  isCopied,
  onCopyFullText,
  onResetNew,
  onBackToNotices,
  onSavePlan,
  isSavingPlan,
  saveSuccessMsg,
  onDownloadPdf,
  targetProgramTitle,
  currentStep = 1,
  onOpenVault,
}) => {
  // Derive display step from state
  const step = hasResult ? 3 : currentStep;

  return (
    <header className="bg-slate-950 border-b border-slate-800 flex-shrink-0 z-20">
      {/* Top Slim Bar: Logo + Steps + Close */}
      <div className="h-14 px-4 sm:px-6 flex items-center justify-between gap-3">
        {/* Left: Back + Logo + Program Title */}
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onBackToNotices && onBackToNotices()}
            className="flex items-center space-x-1 text-slate-400 hover:text-white transition-colors px-2 py-1.5 rounded-xl hover:bg-slate-800 cursor-pointer flex-shrink-0"
            title="PSST 전문가 탭으로 돌아가기"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-xs font-semibold hidden sm:inline">전문가 탭</span>
          </button>

          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-blue-400 font-bold block leading-none">AI 사업계획서 스튜디오</span>
              <p className="text-xs text-white font-extrabold truncate leading-tight">
                {targetProgramTitle ? (
                  <span className="text-amber-300">{targetProgramTitle}</span>
                ) : (
                  "PSST 정부지원사업 사업계획서"
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Center: 3-Step Workflow Progress */}
        <div className="hidden md:flex items-center space-x-1 text-[11px] font-bold flex-shrink-0">
          {[
            { num: 1, label: "📝 정보 입력", desc: "아이템 & 기업 정보" },
            { num: 2, label: "🤖 AI 생성", desc: "PSST 초안 자동 작성" },
            { num: 3, label: "📋 복사 & 완성", desc: "한글 서식에 붙여넣기" },
          ].map((s, i) => (
            <React.Fragment key={s.num}>
              <div
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl transition-all ${
                  step === s.num
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : step > s.num
                    ? "bg-emerald-900/60 text-emerald-300 border border-emerald-700/40"
                    : "bg-slate-800/60 text-slate-500"
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-black ${
                    step > s.num
                      ? "bg-emerald-500 text-white"
                      : step === s.num
                      ? "bg-white text-blue-600"
                      : "bg-slate-700 text-slate-400"
                  }`}
                >
                  {step > s.num ? "✓" : s.num}
                </span>
                <span>{s.label}</span>
              </div>
              {i < 2 && (
                <div className={`w-5 h-px ${step > s.num ? "bg-emerald-600" : "bg-slate-700"}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          {/* Theme Toggle */}
          <button
            type="button"
            onClick={() => setCanvasTheme((prev) => (prev === "dark" ? "light" : "dark"))}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center space-x-1 cursor-pointer"
            title="문서 시트 다크/라이트 테마 전환"
          >
            {canvasTheme === "dark" ? (
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            )}
          </button>

          {/* Open Vault Button */}
          {onOpenVault && (
            <button
              type="button"
              onClick={onOpenVault}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 flex items-center space-x-1.5 cursor-pointer shadow-xs"
              title="저장된 사업계획서 보관함 열기"
            >
              <FolderHeart className="w-3.5 h-3.5 text-rose-400" />
              <span>내 보관함</span>
            </button>
          )}

          {/* Save Button */}
          {hasResult && onSavePlan && (
            <button
              type="button"
              disabled={isSavingPlan}
              onClick={onSavePlan}
              className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition-all border border-slate-600 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSavingPlan ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>저장 중...</span>
                </>
              ) : saveSuccessMsg ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span className="text-emerald-300">저장 완료!</span>
                </>
              ) : (
                <>
                  <FolderHeart className="w-3.5 h-3.5 text-blue-400" />
                  <span>보관함 저장</span>
                </>
              )}
            </button>
          )}

          {/* PDF Download */}
          {hasResult && onDownloadPdf && (
            <button
              type="button"
              onClick={onDownloadPdf}
              className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition-all border border-slate-600 flex items-center space-x-1.5 cursor-pointer"
              title="사업계획서를 PDF 파일로 저장"
            >
              <FileDown className="w-3.5 h-3.5 text-emerald-400" />
              <span>PDF</span>
            </button>
          )}

          {/* 전문 복사 — Most important action per call discussion */}
          {hasResult && (
            <button
              type="button"
              onClick={onCopyFullText}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-1.5 cursor-pointer shadow-md ${
                isCopied
                  ? "bg-emerald-600 text-white border border-emerald-500 shadow-emerald-600/30"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/30"
              }`}
              title="전문 복사 후 한글 서식 파일에 붙여넣기"
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>복사 완료! 한글 서식에 붙여넣기 하세요</span>
                </>
              ) : (
                <>
                  <ClipboardCopy className="w-3.5 h-3.5" />
                  <span>전문 복사</span>
                </>
              )}
            </button>
          )}

          {/* New Plan */}
          <button
            type="button"
            onClick={onResetNew}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
            title="새 사업계획서 작성"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Mode Switcher Bar */}
      <div className="h-10 px-4 sm:px-6 flex items-center justify-between border-t border-slate-800/60 bg-slate-900/60">
        <div className="flex items-center space-x-1.5">
          <span className="text-[11px] text-slate-500 font-medium mr-2">작성 방식:</span>
          <div className="bg-slate-800 p-0.5 rounded-xl border border-slate-700 flex space-x-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setCreationMode("chat")}
              className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                creationMode === "chat"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Bot className="w-3 h-3" />
              <span>💬 AI 챗봇 인터뷰</span>
            </button>
            <button
              type="button"
              onClick={() => setCreationMode("form")}
              className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                creationMode === "form"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>⚡ 빠른 폼 입력</span>
            </button>
          </div>
        </div>

        {/* Hint: copy to hwp */}
        {hasResult && (
          <div className="hidden sm:flex items-center space-x-1.5 text-[11px] text-emerald-400 font-semibold animate-pulse">
            <ClipboardCopy className="w-3.5 h-3.5" />
            <span>완성! [전문 복사] 후 한글 서식 파일에 붙여넣기 하세요.</span>
          </div>
        )}
      </div>
    </header>
  );
};
