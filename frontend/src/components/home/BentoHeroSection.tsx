"use client";

import React from "react";
import {
  Search,
  ChevronRight,
  Flame,
  Sparkles,
  AlertTriangle,
  Layers,
  FileText,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  Bot,
} from "lucide-react";
import { StatsData } from "./LiveBriefingBanner";

interface BentoHeroSectionProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSearch: (e: React.FormEvent) => void;
  onQuickTagClick: (tag: string) => void;
  stats: StatsData;
  timeFilter: "today" | "recent" | "urgent" | "all";
  setTimeFilter: (f: "today" | "recent" | "urgent" | "all") => void;
  setSortOption: (s: "latest" | "deadline") => void;
  onlyClosed: boolean;
  setOnlyClosed: (c: boolean) => void;
  onNavigateToPsst: () => void;
}

export const BentoHeroSection: React.FC<BentoHeroSectionProps> = ({
  searchQuery,
  setSearchQuery,
  onSearch,
  onQuickTagClick,
  stats,
  timeFilter,
  setTimeFilter,
  setSortOption,
  onlyClosed,
  setOnlyClosed,
  onNavigateToPsst,
}) => {
  return (
    <section className="relative pt-6 pb-2 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-5">
      {/* Top Headline & Main Search Bar */}
      <div className="text-center max-w-3xl mx-auto space-y-3.5">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-blue-50/90 border border-blue-200 text-xs font-bold text-blue-700 shadow-2xs">
          <Zap className="w-3.5 h-3.5 text-blue-600 fill-blue-600 animate-pulse" />
          <span>기업마당 & K-Startup 실시간 통합 AI 지원사업 탐색 엔진</span>
        </div>

        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 leading-tight">
          내 기업에 딱 맞는 정부지원사업, <br />
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            AI가 1초 만에 분석하고 추천합니다
          </span>
        </h1>

        <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
          공고문 전문과 HWP 첨부 서식까지 딥러닝 분석하여 <strong>합격 공략 3-Step</strong>과 <strong>PSST 사업계획서</strong>를 즉시 작성해 드립니다.
        </p>

        {/* Global Search Input */}
        <form onSubmit={onSearch} className="pt-1 flex items-center gap-2 max-w-2xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="사업명, 소관기관, 관심 분야 검색 (예: 팁스, 초기창업패키지, R&D, 바우처, 서울)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-slate-300 text-sm placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-900 shadow-xs"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm transition-all shadow-sm shadow-blue-600/25 flex items-center space-x-1.5 cursor-pointer shrink-0"
          >
            <span>검색</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Tag Recommendations */}
        <div className="flex items-center justify-center flex-wrap gap-1.5 pt-0.5 text-[11px]">
          <span className="text-slate-400 font-semibold mr-1">인기 검색:</span>
          {["#팁스", "#초기창업패키지", "#AI바우처", "#디딤돌R&D", "#청년창업", "#스마트공장", "#서울"].map(
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
      </div>

      {/* 🍱 Modern Bento Grid Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3.5 max-w-6xl mx-auto pt-2">
        {/* Bento Item 1 (Wide: 2 Cols) - 4 Live Curation Toggles */}
        <div className="md:col-span-3 lg:col-span-2 bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30 border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-black text-slate-900">실시간 수집 현황 큐레이션</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">원클릭 필터 전환</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Card 1: Today */}
            <button
              type="button"
              onClick={() => {
                setTimeFilter("today");
                setOnlyClosed(false);
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                timeFilter === "today" && !onlyClosed
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/30"
                  : "bg-white border-slate-200 hover:border-slate-300 text-slate-800"
              }`}
            >
              <span className={`text-[10px] font-bold flex items-center space-x-1 ${timeFilter === "today" && !onlyClosed ? "text-blue-100" : "text-blue-600"}`}>
                <Flame className="w-3 h-3" />
                <span>오늘 신규</span>
              </span>
              <div className="pt-2">
                <span className="text-lg sm:text-xl font-black">{(stats.todayCount || 0).toLocaleString()}</span>
                <span className="text-[10px] ml-0.5 opacity-80">건</span>
              </div>
            </button>

            {/* Card 2: Recent 3 Days */}
            <button
              type="button"
              onClick={() => {
                setTimeFilter("recent");
                setOnlyClosed(false);
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                timeFilter === "recent" && !onlyClosed
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/30"
                  : "bg-white border-slate-200 hover:border-slate-300 text-slate-800"
              }`}
            >
              <span className={`text-[10px] font-bold flex items-center space-x-1 ${timeFilter === "recent" && !onlyClosed ? "text-indigo-100" : "text-indigo-600"}`}>
                <Sparkles className="w-3 h-3" />
                <span>최근 3일</span>
              </span>
              <div className="pt-2">
                <span className="text-lg sm:text-xl font-black">{(stats.recentCount || 0).toLocaleString()}</span>
                <span className="text-[10px] ml-0.5 opacity-80">건</span>
              </div>
            </button>

            {/* Card 3: Urgent D-7 */}
            <button
              type="button"
              onClick={() => {
                setTimeFilter("urgent");
                setSortOption("deadline");
                setOnlyClosed(false);
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                timeFilter === "urgent" && !onlyClosed
                  ? "bg-rose-600 text-white border-rose-600 shadow-sm shadow-rose-600/30"
                  : "bg-white border-slate-200 hover:border-slate-300 text-slate-800"
              }`}
            >
              <span className={`text-[10px] font-bold flex items-center space-x-1 ${timeFilter === "urgent" && !onlyClosed ? "text-rose-100" : "text-rose-600"}`}>
                <AlertTriangle className="w-3 h-3" />
                <span>마감 임박</span>
              </span>
              <div className="pt-2">
                <span className="text-lg sm:text-xl font-black">{(stats.urgentCount || 0).toLocaleString()}</span>
                <span className="text-[10px] ml-0.5 opacity-80">건</span>
              </div>
            </button>

            {/* Card 4: All Active */}
            <button
              type="button"
              onClick={() => {
                setTimeFilter("all");
                setOnlyClosed(false);
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                timeFilter === "all" && !onlyClosed
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-white border-slate-200 hover:border-slate-300 text-slate-800"
              }`}
            >
              <span className={`text-[10px] font-bold flex items-center space-x-1 ${timeFilter === "all" && !onlyClosed ? "text-slate-300" : "text-slate-600"}`}>
                <Layers className="w-3 h-3" />
                <span>전체 진행중</span>
              </span>
              <div className="pt-2">
                <span className="text-lg sm:text-xl font-black">{(stats.activeCount || stats.totalCount || 0).toLocaleString()}</span>
                <span className="text-[10px] ml-0.5 opacity-80">건</span>
              </div>
            </button>
          </div>
        </div>

        {/* Bento Item 2 (1 Col) - PSST Business Plan AI Generator */}
        <div
          onClick={onNavigateToPsst}
          className="bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-700 rounded-3xl p-5 text-white shadow-sm flex flex-col justify-between space-y-3 cursor-pointer group hover:scale-[1.02] transition-all relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
              <FileText className="w-4 h-4" />
            </div>
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-extrabold flex items-center space-x-0.5">
              <span>PSST AI 작성기</span>
              <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </span>
          </div>

          <div className="space-y-1">
            <h3 className="font-extrabold text-sm sm:text-base leading-snug">
              정부지원금 사업계획서 <br />
              10초 자동 생성기
            </h3>
            <p className="text-[11px] text-blue-100 line-clamp-2">
              문제인식(P)·실현가능성(S)·성장전략(S)·팀구성(T) 표준 4대 항목 즉시 도출
            </p>
          </div>

          <div className="pt-1 flex items-center text-xs font-bold text-amber-300 space-x-1">
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
            <span>지금 무료로 작성해보기 ➔</span>
          </div>
        </div>

        {/* Bento Item 3 (1 Col) - AI Rubric Scoring & Agency Persona */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
              <Bot className="w-4 h-4" />
            </div>
            <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
              Gemini 3.7 Pro
            </span>
          </div>

          <div className="space-y-1">
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug">
              심사위원 배점표 & <br />
              가점 요건 정밀 분석
            </h3>
            <p className="text-[11px] text-slate-500 line-clamp-2">
              HWP 공고문 원문을 파싱하여 탈락 방지 결격요건과 필수 제출 서류 체크리스트 제공
            </p>
          </div>

          <div className="pt-1 flex items-center text-[11px] font-bold text-blue-600 space-x-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>공고문 100% 팩트 기반 검증</span>
          </div>
        </div>
      </div>
    </section>
  );
};
