"use client";

import React from "react";
import { Sparkles, Plus, Home, FileText, Award, ChevronRight } from "lucide-react";
import { PsstSectionKey } from "../types";

interface PsstSidebarProps {
  onBackToNotices?: () => void;
  onResetNew: () => void;
  onScrollToSection: (section: PsstSectionKey) => void;
  activeSection?: PsstSectionKey;
}

export const PsstSidebar: React.FC<PsstSidebarProps> = ({
  onBackToNotices,
  onResetNew,
  onScrollToSection,
  activeSection = "overview",
}) => {
  return (
    <aside className="w-14 lg:w-60 bg-[#fbfbfa] border-r border-stone-200 flex flex-col py-3 justify-between flex-shrink-0 z-30">
      <div className="flex flex-col items-center space-y-5 w-full">
        {/* Logo */}
        <div
          onClick={() => onBackToNotices && onBackToNotices()}
          className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-extrabold text-sm cursor-pointer"
          title="공고 탐색으로 이동"
        >
          <Sparkles className="w-5 h-5 text-white" />
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
            <span>공고탐색</span>
          </button>

          <button
            type="button"
            className="flex flex-col lg:flex-row items-center lg:justify-start gap-1.5 lg:gap-3 text-blue-600 font-bold bg-blue-50 w-full px-3 lg:px-5 py-2 border-r-2 border-blue-600 cursor-pointer"
            title="PSST 사업계획서"
          >
            <FileText className="w-4 h-4 text-blue-600" />
            <span>사업계획서</span>
          </button>

          <button
            type="button"
            onClick={() => onScrollToSection("evaluation")}
            className="flex flex-col lg:flex-row items-center lg:justify-start gap-1.5 lg:gap-3 hover:text-amber-600 transition-colors w-full px-3 lg:px-5 py-2 cursor-pointer"
            title="심사역 모의 평가"
          >
            <Award className="w-4 h-4 text-slate-500 hover:text-amber-600" />
            <span>평가리포트</span>
          </button>
        </nav>

        <div className="hidden lg:block w-full px-3 pt-4 border-t border-slate-100">
          <p className="px-2 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">문서 목차</p>
          {([
            ["overview", "기업·아이템 개요"],
            ["problem", "문제 인식"],
            ["solution", "해결 방안"],
            ["scaleUp", "사업화 전략"],
            ["team", "팀 구성"],
            ["evaluation", "평가 리포트"],
          ] as [PsstSectionKey, string][]).map(([key, label]) => (
            <button key={key} type="button" onClick={() => onScrollToSection(key)} className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-colors ${activeSection === key ? "bg-slate-100 text-slate-900 font-bold" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}>
              <ChevronRight className={`w-3 h-3 ${activeSection === key ? "text-blue-600" : "text-slate-300"}`} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
};
