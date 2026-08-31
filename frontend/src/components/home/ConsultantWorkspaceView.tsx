"use client";

import React from "react";
import {
  FileText,
  Sparkles,
  Bot,
  ShieldCheck,
  ArrowUpRight,
  Search,
  ChevronRight,
} from "lucide-react";
import { FilterSection, FilterItem } from "./FilterSection";
import { ProgramListGrid } from "./ProgramListGrid";
import { SupportProgram } from "../ProgramCard";

interface ConsultantWorkspaceViewProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSearch: (e: React.FormEvent) => void;
  onQuickTagClick: (tag: string) => void;
  onNavigateToPsst: (targetTitle?: string) => void;
  mainPortalMode: "all" | "bizinfo" | "kstartup";
  setMainPortalMode: (m: "all" | "bizinfo" | "kstartup") => void;
  sortOption: "latest" | "deadline";
  setSortOption: (s: "latest" | "deadline") => void;
  onlyClosed: boolean;
  setOnlyClosed: (c: boolean) => void;
  resetAllFilters: () => void;
  filterTabMode: "category" | "ministry" | "region" | "stage";
  setFilterTabMode: (t: "category" | "ministry" | "region" | "stage") => void;
  isFilterExpanded: boolean;
  setIsFilterExpanded: (e: boolean | ((p: boolean) => boolean)) => void;
  totalCount: number;
  dbCategories: FilterItem[];
  dbOrganizers: FilterItem[];
  dbRegions: FilterItem[];
  selectedCategory: string;
  setSelectedCategory: (c: string) => void;
  selectedOrganizer: string;
  setSelectedOrganizer: (o: string) => void;
  selectedRegion: string;
  setSelectedRegion: (r: string) => void;
  selectedStage: string;
  setSelectedStage: (s: string) => void;
  organizerSegment: "all" | "public" | "private";
  setOrganizerSegment: (s: "all" | "public" | "private") => void;
  organizerSearch: string;
  setOrganizerSearch: (s: string) => void;
  programs: SupportProgram[];
  loading: boolean;
  page: number;
  onPageChange: (p: number) => void;
  onProgramClick: (id: string) => void;
  timeFilter: "today" | "recent" | "urgent" | "all";
}

export const ConsultantWorkspaceView: React.FC<ConsultantWorkspaceViewProps> = ({
  searchQuery,
  setSearchQuery,
  onSearch,
  onQuickTagClick,
  onNavigateToPsst,
  mainPortalMode,
  setMainPortalMode,
  sortOption,
  setSortOption,
  onlyClosed,
  setOnlyClosed,
  resetAllFilters,
  filterTabMode,
  setFilterTabMode,
  isFilterExpanded,
  setIsFilterExpanded,
  totalCount,
  dbCategories,
  dbOrganizers,
  dbRegions,
  selectedCategory,
  setSelectedCategory,
  selectedOrganizer,
  setSelectedOrganizer,
  selectedRegion,
  setSelectedRegion,
  selectedStage,
  setSelectedStage,
  organizerSegment,
  setOrganizerSegment,
  organizerSearch,
  setOrganizerSearch,
  programs,
  loading,
  page,
  onPageChange,
  onProgramClick,
  timeFilter,
}) => {
  return (
    <div className="space-y-6">
      {/* 1. Consultant High-Productivity PSST AI Header */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* PSST AI High-Speed Generator CTA */}
          <div
            onClick={() => onNavigateToPsst()}
            className="md:col-span-2 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 border border-slate-700 rounded-3xl p-6 text-white shadow-md flex flex-col justify-between space-y-4 cursor-pointer hover:border-blue-400 transition-all group"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-blue-300">전문가 전용 AI 사업계획서 빌더</span>
                  <h3 className="text-base sm:text-lg font-black">
                    PSST 정부지원금 사업계획서 10초 자동 작성기
                  </h3>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-blue-500/30 border border-blue-400/40 text-blue-200 text-xs font-bold flex items-center space-x-1">
                <span>작성기 실행</span>
                <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              문제인식(Problem) • 실현가능성(Solution) • 성장전략(Scale-up) • 팀구성(Team) 4대 표준 항목을 정부 심사 기준에 맞추어 전문적인 문체로 자동 생성하고 PDF/한글 서식으로 출력합니다.
            </p>

            <div className="flex items-center space-x-4 pt-1 text-xs text-slate-400">
              <span className="flex items-center space-x-1 text-amber-300 font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Gemini 3.7 Pro Cascade 엔진 탑재</span>
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">창진원·중기부 공통 양식 완벽 호환</span>
            </div>
          </div>

          {/* Deep Rubric & Screening Insights Box */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
                <Bot className="w-4 h-4" />
              </div>
              <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
                심사위원 가점 분석
              </span>
            </div>

            <div className="space-y-1">
              <h4 className="font-extrabold text-slate-900 text-sm">
                결격사유 & 가점 요건 분석
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                공고문 HWP/PDF 원문을 심층 파싱하여 가점 항목(특허, 여성/청년, 벤처인증) 및 필수 제출 서류 체크리스트를 도출합니다.
              </p>
            </div>

            <div className="pt-1 flex items-center text-[11px] font-bold text-blue-600 space-x-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>탈락 방지 결격요건 사전 필터링</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Targeted Search Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <form onSubmit={onSearch} className="flex items-center gap-2 max-w-3xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="사업명, 소관부처, 주관기관, 특정 키워드 검색 (예: 팁스, 스케일업, 융자, 서울)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-slate-300 text-xs sm:text-sm placeholder-slate-400 focus:outline-none focus:border-slate-800 focus:ring-4 focus:ring-slate-500/10 transition-all text-slate-900 shadow-xs"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm transition-all shadow-sm shadow-slate-900/25 flex items-center space-x-1 cursor-pointer shrink-0"
          >
            <span>검색</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </form>
      </section>

      {/* 3. Comprehensive High-Density Smart Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <FilterSection
          mainPortalMode={mainPortalMode}
          setMainPortalMode={setMainPortalMode}
          sortOption={sortOption}
          setSortOption={setSortOption}
          onlyClosed={onlyClosed}
          setOnlyClosed={setOnlyClosed}
          resetAllFilters={resetAllFilters}
          filterTabMode={filterTabMode}
          setFilterTabMode={setFilterTabMode}
          isFilterExpanded={isFilterExpanded}
          setIsFilterExpanded={setIsFilterExpanded}
          totalCount={totalCount}
          dbCategories={dbCategories}
          dbOrganizers={dbOrganizers}
          dbRegions={dbRegions}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          selectedOrganizer={selectedOrganizer}
          setSelectedOrganizer={setSelectedOrganizer}
          selectedRegion={selectedRegion}
          setSelectedRegion={setSelectedRegion}
          selectedStage={selectedStage}
          setSelectedStage={setSelectedStage}
          organizerSegment={organizerSegment}
          setOrganizerSegment={setOrganizerSegment}
          organizerSearch={organizerSearch}
          setOrganizerSearch={setOrganizerSearch}
        />
      </div>

      {/* 4. Support Program Feed Grid (9 per page) */}
      <ProgramListGrid
        programs={programs}
        totalCount={totalCount}
        loading={loading}
        currentPage={page}
        totalPages={Math.max(1, Math.ceil(totalCount / 9))}
        pageSize={9}
        onPageChange={onPageChange}
        onProgramClick={onProgramClick}
        onResetFilters={resetAllFilters}
        timeFilter={timeFilter}
        onlyClosed={onlyClosed}
      />
    </div>
  );
};
