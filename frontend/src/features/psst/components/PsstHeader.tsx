"use client";

import React from "react";
import {
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
    <header className="bg-[#fbfbfa] border-b border-stone-200 flex-shrink-0 z-20">
      {/* Top Slim Bar: Logo + Steps + Close */}
      <div className="h-14 px-4 sm:px-6 flex items-center justify-between gap-3">
        {/* Left: Back + Logo + Program Title */}
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onBackToNotices && onBackToNotices()}
            className="flex items-center space-x-1 text-slate-500 hover:text-slate-900 transition-colors px-2 py-1.5 rounded-xl hover:bg-slate-100 cursor-pointer flex-shrink-0"
            title="PSST 전문가 탭으로 돌아가기"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-xs font-semibold hidden sm:inline">전문가 탭</span>
          </button>

          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-indigo-600 font-bold block leading-none tracking-wide">AI 사업계획서 스튜디오</span>
              <p className="text-[13px] text-slate-900 font-extrabold truncate leading-tight mt-0.5">
                {targetProgramTitle ? (
                  <span className="text-slate-900">{targetProgramTitle}</span>
                ) : (
                  "PSST 정부지원사업 사업계획서"
                )}
              </p>
            </div>
          </div>
        </div>

        {/* 문서 중심 breadcrumb: 작업 단계를 가리는 대시보드형 진행 바 대신 현재 문서를 강조합니다. */}
        <div className="hidden md:flex items-center gap-2 min-w-0 max-w-[38%] text-xs">
          <span className="text-slate-400">사업계획서</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-700 font-semibold truncate">{targetProgramTitle || "새 계획서"}</span>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          {/* Open Vault Button */}
          {onOpenVault && (
            <button
              type="button"
              onClick={onOpenVault}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all border border-slate-200 flex items-center space-x-1.5 cursor-pointer"
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
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all border border-slate-200 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
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
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all border border-slate-200 flex items-center space-x-1.5 cursor-pointer"
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
            className="p-2 rounded-lg bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-900 border border-slate-200 transition-colors cursor-pointer"
            title="새 사업계획서 작성"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

    </header>
  );
};
