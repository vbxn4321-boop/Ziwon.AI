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
  FileDown,
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
}) => {
  return (
    <header className="h-14 bg-white/95 border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between flex-shrink-0 z-20 backdrop-blur-md shadow-2xs">
      {/* Left: Mode Switcher & Title */}
      <div className="flex items-center space-x-3 overflow-hidden">
        <button
          type="button"
          onClick={() => onBackToNotices && onBackToNotices()}
          className="text-slate-500 hover:text-slate-800 transition-colors p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
          title="공고 탐색으로 돌아가기"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Creation Mode Toggle */}
        <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex space-x-1 text-xs">
          <button
            type="button"
            onClick={() => setCreationMode("chat")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
              creationMode === "chat"
                ? "bg-indigo-600 text-white shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
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
                ? "bg-blue-600 text-white shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
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
          className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium transition-colors flex items-center space-x-1 cursor-pointer shadow-2xs"
          title="문서 시트 다크/라이트 테마 전환"
        >
          {canvasTheme === "dark" ? (
            <>
              <Moon className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-[11px] font-semibold">다크 뷰</span>
            </>
          ) : (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[11px] font-semibold">페이퍼 뷰</span>
            </>
          )}
        </button>

        {hasResult && onSavePlan && (
          <button
            type="button"
            disabled={isSavingPlan}
            onClick={onSavePlan}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSavingPlan ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>저장 중...</span>
              </>
            ) : saveSuccessMsg ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-200" />
                <span>저장 완료!</span>
              </>
            ) : (
              <>
                <FolderHeart className="w-3.5 h-3.5 text-indigo-200" />
                <span>내 보관함 저장</span>
              </>
            )}
          </button>
        )}

        {hasResult && onDownloadPdf && (
          <button
            type="button"
            onClick={onDownloadPdf}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
            title="사업계획서를 PDF 파일로 저장"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>PDF 저장</span>
          </button>
        )}

        {hasResult && (
          <button
            type="button"
            onClick={onCopyFullText}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-200" />
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
          className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors cursor-pointer shadow-2xs"
          title="새 사업계획서 작성"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Exit/Close Button */}
        <button
          type="button"
          onClick={() => onBackToNotices && onBackToNotices()}
          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer shadow-2xs"
          title="사업계획서 화면을 닫고 공고 탐색 홈으로 이동"
        >
          <span>✕ 닫기</span>
        </button>
      </div>
    </header>
  );
};
