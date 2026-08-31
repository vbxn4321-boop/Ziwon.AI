"use client";

import React from "react";
import {
  Search,
  ChevronRight,
  Flame,
  Sparkles,
  AlertTriangle,
  Layers,
} from "lucide-react";

export interface StatsData {
  totalCount: number;
  activeCount: number;
  todayCount: number;
  recentCount: number;
  urgentCount: number;
}

interface LiveBriefingBannerProps {
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
}

export const LiveBriefingBanner: React.FC<LiveBriefingBannerProps> = ({
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
}) => {
  return (
    <section className="relative pt-8 pb-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6">
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700 shadow-2xs">
          <Flame className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
          <span>기업마당(중기부) & K-Startup(창진원) 통합 실시간 지원사업 탐색</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
          오늘 새로 올라온 <br className="sm:hidden" />
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 bg-clip-text text-transparent">
            정부지원사업 실시간 탐색
          </span>
        </h1>

        <form onSubmit={onSearch} className="pt-2 flex items-center gap-2 max-w-2xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="사업명, 기관명, 분야 검색 (예: 팁스, 초기창업패키지, 바우처, AI, 서울)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-300 text-sm placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all text-slate-900 shadow-2xs"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all shadow-sm shadow-blue-600/25 flex items-center space-x-1.5 cursor-pointer"
          >
            <span>조회</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Tag Recommendations */}
        <div className="flex items-center justify-center flex-wrap gap-1.5 pt-1 text-[11px]">
          <span className="text-slate-400 font-semibold mr-1">추천 검색:</span>
          {["#팁스", "#초기창업패키지", "#AI바우처", "#R&D", "#청년창업", "#마케팅", "#서울"].map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onQuickTagClick(tag.replace("#", ""))}
              className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 shadow-2xs transition-all cursor-pointer font-medium"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Live Stats Curation Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-5xl mx-auto pt-2">
        <button
          type="button"
          onClick={() => {
            setTimeFilter("today");
            setOnlyClosed(false);
          }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between shadow-2xs ${
            timeFilter === "today" && !onlyClosed
              ? "bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 shadow-sm"
              : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-700 flex items-center space-x-1">
              <Flame className="w-3.5 h-3.5 text-blue-600" />
              <span>오늘 신규 수집</span>
            </span>
          </div>
          <div className="pt-2 flex items-baseline space-x-1">
            <span className="text-xl sm:text-2xl font-black text-slate-900">
              {(stats.todayCount || 0).toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">건</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setTimeFilter("recent");
            setOnlyClosed(false);
          }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between shadow-2xs ${
            timeFilter === "recent" && !onlyClosed
              ? "bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm"
              : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-700 flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>최근 3일 신규</span>
            </span>
          </div>
          <div className="pt-2 flex items-baseline space-x-1">
            <span className="text-xl sm:text-2xl font-black text-slate-900">
              {(stats.recentCount || 0).toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">건</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setTimeFilter("urgent");
            setSortOption("deadline");
            setOnlyClosed(false);
          }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between shadow-2xs ${
            timeFilter === "urgent" && !onlyClosed
              ? "bg-rose-50/80 border-rose-500 ring-2 ring-rose-500/20 shadow-sm"
              : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-700 flex items-center space-x-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>마감 임박 (D-7)</span>
            </span>
          </div>
          <div className="pt-2 flex items-baseline space-x-1">
            <span className="text-xl sm:text-2xl font-black text-slate-900">
              {(stats.urgentCount || 0).toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">건</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setTimeFilter("all");
            setOnlyClosed(false);
          }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between shadow-2xs ${
            timeFilter === "all" && !onlyClosed
              ? "bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm"
              : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 flex items-center space-x-1">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <span>전체 진행 중</span>
            </span>
          </div>
          <div className="pt-2 flex items-baseline space-x-1">
            <span className="text-xl sm:text-2xl font-black text-slate-900">
              {(stats.activeCount || stats.totalCount || 0).toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">건</span>
          </div>
        </button>
      </div>
    </section>
  );
};
