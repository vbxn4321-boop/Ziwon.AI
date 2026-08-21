"use client";

import React from "react";
import {
  Menu,
  Bot,
  SlidersHorizontal,
  Moon,
  Sun,
  Copy,
  Check,
  Plus,
  FolderHeart,
  Loader2,
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
}) => {
  return (
    <header className="h-14 bg-slate-900/90 border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between flex-shrink-0 z-20 backdrop-blur-md">
      {/* Left: Mode Switcher & Title */}
      <div className="flex items-center space-x-3 overflow-hidden">
        <button
          type="button"
          onClick={() => onBackToNotices && onBackToNotices()}
          className="text-slate-400 hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
          title="공고 탐색으로 돌아가기"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Creation Mode Toggle */}
        <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex space-x-1 text-xs">
          <button
            type="button"
            onClick={() => setCreationMode("chat")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
              creationMode === "chat"
                ? "bg-indigo-600 text-white shadow-md font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>💬 AI 챗봇 인터뷰 모드</span>
          </button>
          <button
            type="button"
            onClick={() => setCreationMode("form")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
              creationMode === "form"
                ? "bg-blue-600 text-white shadow-md font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>⚡ 퀵 폼 정보 입력 모드</span>
          </button>
        </div>
      </div>

      {/* Right: Actions & Theme Toggle */}
      <div className="flex items-center space-x-2">
        {/* Canvas Dark/Light Toggle */}
        <button
          type="button"
          onClick={() => setCanvasTheme((prev) => (prev === "dark" ? "light" : "dark"))}
          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-colors flex items-center space-x-1 cursor-pointer"
          title="문서 시트 다크/라이트 테마 전환"
        >
          {canvasTheme === "dark" ? (
            <>
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[11px]">다크 뷰</span>
            </>
          ) : (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px]">페이퍼 뷰</span>
            </>
          )}
        </button>

        {hasResult && onSavePlan && (
          <button
            type="button"
            disabled={isSavingPlan}
            onClick={onSavePlan}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/30 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSavingPlan ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>저장 중...</span>
              </>
            ) : saveSuccessMsg ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>저장 완료!</span>
              </>
            ) : (
              <>
                <FolderHeart className="w-3.5 h-3.5 text-purple-300" />
                <span>내 보관함 저장</span>
              </>
            )}
          </button>
        )}

        {hasResult && (
          <button
            type="button"
            onClick={onCopyFullText}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center space-x-1.5 cursor-pointer"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>복사 완료!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>전문 복사</span>
              </>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={onResetNew}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
          title="새 사업계획서 작성"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Exit/Close Button */}
        <button
          type="button"
          onClick={() => onBackToNotices && onBackToNotices()}
          className="px-3 py-1.5 rounded-xl bg-rose-950/50 hover:bg-rose-900/70 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer shadow-sm hover:text-white"
          title="사업계획서 화면을 닫고 공고 탐색 홈으로 이동"
        >
          <span>✕ 닫기</span>
        </button>
      </div>
    </header>
  );
};
