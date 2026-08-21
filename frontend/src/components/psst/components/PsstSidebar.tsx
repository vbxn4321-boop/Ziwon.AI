"use client";

import React from "react";
import { Sparkles, Plus, Home, FileText, Award } from "lucide-react";
import { PsstSectionKey } from "../types";

interface PsstSidebarProps {
  onBackToNotices?: () => void;
  onResetNew: () => void;
  onScrollToSection: (section: PsstSectionKey) => void;
}

export const PsstSidebar: React.FC<PsstSidebarProps> = ({
  onBackToNotices,
  onResetNew,
  onScrollToSection,
}) => {
  return (
    <aside className="w-16 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-3.5 justify-between flex-shrink-0 z-30 shadow-lg">
      <div className="flex flex-col items-center space-y-5 w-full">
        {/* Logo */}
        <div
          onClick={() => onBackToNotices && onBackToNotices()}
          className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-blue-500/20 cursor-pointer"
          title="공고 탐색으로 이동"
        >
          <Sparkles className="w-5 h-5 text-white" />
        </div>

        {/* Plus Button */}
        <button
          type="button"
          onClick={onResetNew}
          className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors border border-slate-700 cursor-pointer"
          title="새 사업계획서 작성"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Menu Items */}
        <nav className="flex flex-col items-center space-y-3.5 w-full text-[10px] text-slate-400 font-medium">
          <button
            type="button"
            onClick={() => onBackToNotices && onBackToNotices()}
            className="flex flex-col items-center space-y-1 hover:text-blue-400 transition-colors w-full py-1 cursor-pointer"
            title="지원사업 공고 탐색 포털로 복귀"
          >
            <Home className="w-4 h-4 text-slate-400 hover:text-blue-400" />
            <span>공고탐색</span>
          </button>

          <button
            type="button"
            className="flex flex-col items-center space-y-1 text-blue-400 font-bold bg-blue-500/10 w-full py-1.5 border-r-2 border-blue-500 cursor-pointer"
            title="PSST 사업계획서"
          >
            <FileText className="w-4 h-4 text-blue-400" />
            <span>사업계획서</span>
          </button>

          <button
            type="button"
            onClick={() => onScrollToSection("evaluation")}
            className="flex flex-col items-center space-y-1 hover:text-amber-400 transition-colors w-full py-1 cursor-pointer"
            title="심사역 모의 평가"
          >
            <Award className="w-4 h-4 text-slate-400 hover:text-amber-400" />
            <span>평가리포트</span>
          </button>
        </nav>
      </div>
    </aside>
  );
};
