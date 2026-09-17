"use client";

import React from "react";
import { Sparkles, Plus, Home, FileText, Award, PanelLeftClose } from "lucide-react";
import { PsstSectionKey } from "../types";

interface PsstSidebarProps {
  onBackToNotices?: () => void;
  onResetNew: () => void;
  onScrollToSection: (section: PsstSectionKey) => void;
  /** 사이드바를 통째로 감춘다. 작업 폭을 최대로 확보할 때 쓴다. */
  onCollapse: () => void;
}

export const PsstSidebar: React.FC<PsstSidebarProps> = ({
  onBackToNotices,
  onResetNew,
  onScrollToSection,
  onCollapse,
}) => {
  return (
    <aside className="w-14 lg:w-60 bg-[#fbfbfa] border-r border-stone-200 flex flex-col py-3 justify-between flex-shrink-0 z-30">
      <div className="flex flex-col items-center space-y-5 w-full">
        {/* Logo + 접기 */}
        <div className="w-full px-3 flex items-center justify-center lg:justify-between">
          <div
            onClick={() => onBackToNotices && onBackToNotices()}
            className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-extrabold text-sm cursor-pointer flex-shrink-0"
            title="공고 탐색으로 이동"
          >
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <button
            type="button"
            onClick={onCollapse}
            title="사이드바 숨기기"
            aria-label="사이드바 숨기기"
            className="hidden lg:flex w-7 h-7 rounded-lg items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-stone-200 transition-colors cursor-pointer"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Plus Button */}
        <button
          type="button"
          onClick={onResetNew}
          className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-slate-700 flex items-center justify-center transition-colors border border-stone-200 cursor-pointer"
          title="새 사업계획서 작성"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Menu Items */}
        <nav className="flex flex-col items-center space-y-2 w-full text-[10px] text-slate-500 font-medium">
          <button
            type="button"
            onClick={() => onBackToNotices && onBackToNotices()}
            className="flex flex-col lg:flex-row items-center lg:justify-start gap-1.5 lg:gap-3 hover:text-blue-600 transition-colors w-full px-3 lg:px-5 py-2 cursor-pointer"
            title="지원사업 공고 탐색 포털로 복귀"
          >
            <Home className="w-4 h-4 text-slate-500 hover:text-blue-600" />
            <span className="hidden lg:inline">공고탐색</span>
          </button>

          <button
            type="button"
            className="flex flex-col lg:flex-row items-center lg:justify-start gap-1.5 lg:gap-3 text-slate-900 font-semibold bg-stone-100 w-full px-3 lg:px-5 py-2 border-r-2 border-slate-900 cursor-pointer"
            title="PSST 사업계획서"
          >
            <FileText className="w-4 h-4 text-slate-700" />
            <span className="hidden lg:inline">사업계획서</span>
          </button>

          <button
            type="button"
            onClick={() => onScrollToSection("evaluation")}
            className="flex flex-col lg:flex-row items-center lg:justify-start gap-1.5 lg:gap-3 hover:text-amber-600 transition-colors w-full px-3 lg:px-5 py-2 cursor-pointer"
            title="심사역 모의 평가"
          >
            <Award className="w-4 h-4 text-slate-500 hover:text-amber-600" />
            <span className="hidden lg:inline">평가리포트</span>
          </button>
        </nav>

      </div>
    </aside>
  );
};
