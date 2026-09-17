"use client";

import React from "react";
import {
  ArrowLeft,
  Share2,
  Check,
  Bookmark,
  Sparkles,
} from "lucide-react";
import { SupportProgram } from "@/components/ProgramCard";

interface ProgramHeaderProps {
  program: SupportProgram;
  onBack: () => void;
  onShare: () => void;
  shareToast: boolean;
  isBookmarked: boolean;
  bookmarkLoading: boolean;
  onToggleBookmark: () => void;
  /** 계획서 작성 진입. 링크가 아니라 콜백인 이유는 AI 분석 이용권을 먼저 확인해야 해서다. */
  onWritePlan: () => void;
  planGateChecking?: boolean;
}

export const ProgramHeader: React.FC<ProgramHeaderProps> = ({
  program,
  onBack,
  onShare,
  shareToast,
  isBookmarked,
  bookmarkLoading,
  onToggleBookmark,
  onWritePlan,
  planGateChecking = false,
}) => {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <button
        onClick={onBack}
        className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition-all flex items-center space-x-1.5 shadow-2xs cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4 text-slate-500" />
        <span>목록으로 돌아가기</span>
      </button>

      <div className="flex items-center space-x-2">
        {/* Share / Copy URL Button */}
        <button
          onClick={onShare}
          className="px-3.5 py-2 rounded-xl bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer shadow-2xs"
          title="공고 링크 복사"
        >
          {shareToast ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4 text-slate-500" />}
          <span>{shareToast ? "링크 복사됨!" : "공유"}</span>
        </button>

        {/* Bookmark Button */}
        <button
          onClick={onToggleBookmark}
          disabled={bookmarkLoading}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer border shadow-2xs ${
            isBookmarked
              ? "bg-amber-50 text-amber-800 border-amber-300"
              : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200"
          }`}
        >
          <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-amber-500 text-amber-500" : "text-slate-400"}`} />
          <span>{isBookmarked ? "찜 완료" : "관심 공고 찜"}</span>
        </button>

        {/* PSST 사업계획서 작성 — 바로 넘기지 않고 AI 분석 이용권부터 확인한다 */}
        <button
          type="button"
          onClick={onWritePlan}
          disabled={planGateChecking}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm shadow-blue-600/20 disabled:opacity-60 cursor-pointer"
        >
          <Sparkles className={`w-4 h-4 ${planGateChecking ? "animate-pulse" : ""}`} />
          <span>PSST 사업계획서 작성</span>
        </button>
      </div>
    </div>
  );
};
