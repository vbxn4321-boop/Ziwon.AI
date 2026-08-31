"use client";

import React from "react";
import { Search, ChevronRight, Zap } from "lucide-react";
import { QuickOnboardingBar } from "./QuickOnboardingBar";
import { RecommendationCarousel } from "./RecommendationCarousel";
import { ProgramListGrid } from "./ProgramListGrid";
import { SupportProgram } from "../ProgramCard";

interface NewbieModeViewProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSearch: (e: React.FormEvent) => void;
  onQuickTagClick: (tag: string) => void;
  selectedStage: string;
  onSelectStage: (stage: string) => void;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  selectedRegion: string;
  onSelectRegion: (region: string) => void;
  onResetAll: () => void;
  totalCount: number;
  myCompany: any;
  isLoggedIn: boolean;
  recommendedPrograms: SupportProgram[];
  loadingRecommended: boolean;
  onOpenCompanyModal: () => void;
  programs: SupportProgram[];
  loading: boolean;
  page: number;
  onPageChange: (p: number) => void;
  onProgramClick: (id: string) => void;
  timeFilter: "today" | "recent" | "urgent" | "all";
  onlyClosed: boolean;
}

export const NewbieModeView: React.FC<NewbieModeViewProps> = ({
  searchQuery,
  setSearchQuery,
  onSearch,
  onQuickTagClick,
  selectedStage,
  onSelectStage,
  selectedCategory,
  onSelectCategory,
  selectedRegion,
  onSelectRegion,
  onResetAll,
  totalCount,
  myCompany,
  isLoggedIn,
  recommendedPrograms,
  loadingRecommended,
  onOpenCompanyModal,
  programs,
  loading,
  page,
  onPageChange,
  onProgramClick,
  timeFilter,
  onlyClosed,
}) => {
  return (
    <div className="space-y-6">
      {/* 1. Super Clean Beginner Hero */}
      <section className="text-center max-w-2xl mx-auto px-4 pt-4 space-y-3">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700 shadow-2xs">
          <Zap className="w-3.5 h-3.5 text-blue-600 fill-blue-600 animate-pulse" />
          <span>처음 이용자를 위한 3초 초간편 정부지원사업 매칭</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          어떤 정부지원사업을 찾으시나요?
        </h2>
        <p className="text-xs text-slate-500">
          복잡한 서류와 조건 없이, <strong>창업 업력과 관심 분야</strong>만 톡 누르면 딱 맞는 공고를 바로 찾아드립니다.
        </p>

        {/* Clean Search Input */}
        <form onSubmit={onSearch} className="pt-1 flex items-center gap-2 max-w-xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="예: 예비창업패키지, 초기창업, 청년지원, 시제품, 서울"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-slate-300 text-xs sm:text-sm placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-900 shadow-xs"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm transition-all shadow-sm shadow-blue-600/25 flex items-center space-x-1 cursor-pointer shrink-0"
          >
            <span>검색</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </form>

        {/* Beginner Popular Tags */}
        <div className="flex items-center justify-center flex-wrap gap-1.5 pt-0.5 text-[11px]">
          <span className="text-slate-400 font-semibold mr-1">초보 추천:</span>
          {["#예비창업패키지", "#초기창업", "#청년창업사관학교", "#디딤돌R&D", "#소상공인", "#사업화자금"].map(
            (tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onQuickTagClick(tag.replace("#", ""))}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 shadow-2xs transition-all cursor-pointer font-medium"
              >
                {tag}
              </button>
            )
          )}
        </div>
      </section>

      {/* 2. 3-Step Interactive Onboarding Chips */}
      <QuickOnboardingBar
        selectedStage={selectedStage}
        onSelectStage={onSelectStage}
        selectedCategory={selectedCategory}
        onSelectCategory={onSelectCategory}
        selectedRegion={selectedRegion}
        onSelectRegion={onSelectRegion}
        onResetAll={onResetAll}
        totalFilteredCount={totalCount}
      />

      {/* 3. Tailored Recommendation Carousel */}
      <RecommendationCarousel
        myCompany={myCompany}
        isLoggedIn={isLoggedIn}
        recommendedPrograms={recommendedPrograms}
        loadingRecommended={loadingRecommended}
        onOpenCompanyModal={onOpenCompanyModal}
        onProgramClick={onProgramClick}
      />

      {/* 4. Filtered Support Program Cards Grid (9 items per page) */}
      <ProgramListGrid
        programs={programs}
        totalCount={totalCount}
        loading={loading}
        currentPage={page}
        totalPages={Math.max(1, Math.ceil(totalCount / 9))}
        pageSize={9}
        onPageChange={onPageChange}
        onProgramClick={onProgramClick}
        onResetFilters={onResetAll}
        timeFilter={timeFilter}
        onlyClosed={onlyClosed}
      />
    </div>
  );
};
