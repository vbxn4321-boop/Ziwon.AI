"use client";

import React from "react";
import {
  Globe,
  Building2,
  Rocket,
  ArrowUpDown,
  Clock,
  ToggleRight,
  ToggleLeft,
  RotateCcw,
  Filter,
  Search,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export interface FilterItem {
  name: string;
  count: number;
}

interface FilterSectionProps {
  mainPortalMode: "all" | "bizinfo" | "kstartup";
  setMainPortalMode: (mode: "all" | "bizinfo" | "kstartup") => void;
  sortOption: "latest" | "deadline";
  setSortOption: (sort: "latest" | "deadline") => void;
  onlyClosed: boolean;
  setOnlyClosed: (closed: boolean) => void;
  resetAllFilters: () => void;
  filterTabMode: "category" | "ministry" | "region" | "stage";
  setFilterTabMode: (mode: "category" | "ministry" | "region" | "stage") => void;
  isFilterExpanded: boolean;
  setIsFilterExpanded: (exp: boolean) => void;
  totalCount: number;
  dbCategories: FilterItem[];
  dbOrganizers: FilterItem[];
  dbRegions: FilterItem[];
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  selectedOrganizer: string;
  setSelectedOrganizer: (org: string) => void;
  selectedRegion: string;
  setSelectedRegion: (reg: string) => void;
  selectedStage: string;
  setSelectedStage: (stg: string) => void;
  organizerSegment: "all" | "public" | "private";
  setOrganizerSegment: (seg: "all" | "public" | "private") => void;
  organizerSearch: string;
  setOrganizerSearch: (s: string) => void;
}

const STAGES_LIST = [
  { name: "전체", count: 0 },
  { name: "예비창업자", count: 0 },
  { name: "1년 미만", count: 0 },
  { name: "3년 미만", count: 0 },
  { name: "7년 미만", count: 0 },
  { name: "10년 미만", count: 0 },
];

export const FilterSection: React.FC<FilterSectionProps> = ({
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
}) => {
  return (
    <div className="bg-white p-5 rounded-2xl space-y-4 border border-slate-200 shadow-sm">
      {/* Row 1: Source Portal Toggle + Sort Order + Expired Toggle */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        {/* Source Portal Mode Selector */}
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-600 px-2 flex items-center space-x-1">
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            <span>출처 포털:</span>
          </span>
          <button
            type="button"
            onClick={() => setMainPortalMode("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mainPortalMode === "all"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            통합 전체
          </button>
          <button
            type="button"
            onClick={() => setMainPortalMode("bizinfo")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 ${
              mainPortalMode === "bizinfo"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>기업마당(중기부)</span>
          </button>
          <button
            type="button"
            onClick={() => setMainPortalMode("kstartup")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 ${
              mainPortalMode === "kstartup"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Rocket className="w-3.5 h-3.5" />
            <span>K-Startup(창진원)</span>
          </button>
        </div>

        {/* Right: Sort Options & Expired Notice Toggle */}
        <div className="flex items-center space-x-2 text-xs shrink-0 self-end lg:self-auto">
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <span className="text-slate-500 pl-1.5 flex items-center space-x-1">
              <ArrowUpDown className="w-3 h-3 text-slate-500" />
              <span className="text-[11px]">정렬:</span>
            </span>
            <button
              type="button"
              onClick={() => setSortOption("latest")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                sortOption === "latest"
                  ? "bg-white text-slate-900 shadow-2xs border border-slate-200 font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              최신순
            </button>
            <button
              type="button"
              onClick={() => setSortOption("deadline")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                sortOption === "deadline"
                  ? "bg-white text-slate-900 shadow-2xs border border-slate-200 font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              마감임박순
            </button>
          </div>

          <button
            type="button"
            onClick={() => setOnlyClosed(!onlyClosed)}
            className={`px-3 py-1.5 rounded-xl border transition-all flex items-center space-x-1.5 cursor-pointer ${
              onlyClosed
                ? "bg-rose-50 border-rose-300 text-rose-700 font-bold"
                : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs"
            }`}
          >
            <Clock className={`w-3.5 h-3.5 ${onlyClosed ? "text-rose-600" : "text-slate-400"}`} />
            <span>마감 공고</span>
            {onlyClosed ? (
              <ToggleRight className="w-4 h-4 text-rose-600" />
            ) : (
              <ToggleLeft className="w-4 h-4 text-slate-400" />
            )}
          </button>

          <button
            type="button"
            onClick={resetAllFilters}
            title="필터 초기화"
            className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900 shadow-2xs cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Row 2: Sub-Filter Tab Switcher (Category / Ministry / Region / Stage) */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              <span>스마트 필터:</span>
            </span>

            <div className="bg-slate-100 p-0.5 rounded-lg border border-slate-200 flex space-x-1 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setFilterTabMode("category");
                  setIsFilterExpanded(false);
                }}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  filterTabMode === "category"
                    ? "bg-white text-slate-900 shadow-2xs font-bold border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                지원분야 ({dbCategories.length - 1})
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterTabMode("ministry");
                  setIsFilterExpanded(false);
                }}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  filterTabMode === "ministry"
                    ? "bg-white text-slate-900 shadow-2xs font-bold border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                주관기관 ({dbOrganizers.length - 1})
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterTabMode("region");
                  setIsFilterExpanded(false);
                }}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  filterTabMode === "region"
                    ? "bg-white text-slate-900 shadow-2xs font-bold border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                지역별 ({dbRegions.length - 1})
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterTabMode("stage");
                  setIsFilterExpanded(false);
                }}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  filterTabMode === "stage"
                    ? "bg-white text-slate-900 shadow-2xs font-bold border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                창업업력
              </button>
            </div>
          </div>

          <span className="text-xs font-semibold text-slate-500">
            총 <strong className="text-blue-600 font-extrabold">{totalCount.toLocaleString()}</strong>건 공고
          </span>
        </div>

        {/* K-Startup Style 2-Segment Classifier (중앙부처·지자체·공공기관 vs 민간기관·교육기관) */}
        {filterTabMode === "ministry" && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1 pb-1 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/80">
            <div className="inline-flex p-0.5 bg-white rounded-lg border border-slate-200 text-xs shadow-2xs">
              <button
                type="button"
                onClick={() => setOrganizerSegment("all")}
                className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                  organizerSegment === "all"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                전체 기관
              </button>
              <button
                type="button"
                onClick={() => setOrganizerSegment("public")}
                className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                  organizerSegment === "public"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>🏛️ 중앙부처 · 지자체 · 공공기관</span>
              </button>
              <button
                type="button"
                onClick={() => setOrganizerSegment("private")}
                className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                  organizerSegment === "private"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>🎓 민간기관 · 교육기관</span>
              </button>
            </div>

            {/* Quick Search inside Organizers */}
            <div className="relative max-w-xs w-full">
              <input
                type="text"
                value={organizerSearch}
                onChange={(e) => setOrganizerSearch(e.target.value)}
                placeholder="기관명 빠른 검색..."
                className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              {organizerSearch && (
                <button
                  type="button"
                  onClick={() => setOrganizerSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Sub-Filter Pill Chips with Collapsible Views */}
        <div className="pt-1">
          {/* 1. 지원분야 Chips */}
          {filterTabMode === "category" && (
            <div className="flex flex-wrap gap-1.5 items-center">
              {(isFilterExpanded ? dbCategories : dbCategories.slice(0, 11)).map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setSelectedCategory(item.name)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center space-x-1.5 cursor-pointer ${
                    selectedCategory === item.name
                      ? "bg-blue-600 text-white font-bold shadow-xs border border-blue-600"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <span>{item.name}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      selectedCategory === item.name
                        ? "bg-white/20 text-white font-bold"
                        : "bg-slate-200/80 text-slate-600"
                    }`}
                  >
                    {item.count.toLocaleString()}
                  </span>
                </button>
              ))}

              {/* Expand / Collapse Button */}
              {dbCategories.length > 11 && (
                <button
                  type="button"
                  onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                  className="px-3 py-1 rounded-full text-xs font-bold text-blue-600 hover:bg-blue-50 border border-blue-200/90 transition-all flex items-center space-x-1 cursor-pointer shadow-2xs"
                >
                  <span>{isFilterExpanded ? "접기" : `+${dbCategories.length - 11}개 분야 펼치기`}</span>
                  {isFilterExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          )}

          {/* 2. 주관기관 Chips */}
          {filterTabMode === "ministry" && (
            <div className="space-y-2">
              <div className={`flex flex-wrap gap-1.5 items-center ${isFilterExpanded ? "max-h-60 overflow-y-auto pr-1" : ""}`}>
                {(() => {
                  const filtered = dbOrganizers.filter((item) => {
                    if (item.name === "전체") return true;
                    if (organizerSearch.trim()) {
                      if (!item.name.toLowerCase().includes(organizerSearch.toLowerCase().trim())) {
                        return false;
                      }
                    }
                    if (organizerSegment === "public") {
                      return (
                        item.name.includes("부") ||
                        item.name.includes("청") ||
                        item.name.includes("원") ||
                        item.name.includes("공단") ||
                        item.name.includes("공사") ||
                        item.name.includes("시") ||
                        item.name.includes("도") ||
                        item.name.includes("기금") ||
                        item.name.includes("테크노파크") ||
                        item.name.includes("진흥") ||
                        item.name.includes("센터")
                      );
                    }
                    if (organizerSegment === "private") {
                      return (
                        item.name.includes("대") ||
                        item.name.includes("대학") ||
                        item.name.includes("산학") ||
                        item.name.includes("협회") ||
                        item.name.includes("은행") ||
                        item.name.includes("투자") ||
                        item.name.includes("회사") ||
                        item.name.includes("랩") ||
                        item.name.includes("파트너스") ||
                        item.name.includes("학회")
                      );
                    }
                    return true;
                  });

                  const visibleList = isFilterExpanded ? filtered : filtered.slice(0, 12);

                  return (
                    <>
                      {visibleList.map((item) => (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => setSelectedOrganizer(item.name)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center space-x-1.5 cursor-pointer ${
                            selectedOrganizer === item.name
                              ? "bg-blue-600 text-white font-bold shadow-xs border border-blue-600"
                              : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                          }`}
                        >
                          <span className="truncate max-w-[140px]">{item.name}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                              selectedOrganizer === item.name
                                ? "bg-white/20 text-white font-bold"
                                : "bg-slate-200/80 text-slate-600"
                            }`}
                          >
                            {item.count.toLocaleString()}
                          </span>
                        </button>
                      ))}

                      {filtered.length > 12 && (
                        <button
                          type="button"
                          onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                          className="px-3 py-1 rounded-full text-xs font-bold text-blue-600 hover:bg-blue-50 border border-blue-200/90 transition-all flex items-center space-x-1 cursor-pointer shadow-2xs"
                        >
                          <span>{isFilterExpanded ? "접기" : `+${filtered.length - 12}개 기관 펼치기`}</span>
                          {isFilterExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* 3. 지역별 Chips */}
          {filterTabMode === "region" && (
            <div className="flex flex-wrap gap-1.5 items-center">
              {(isFilterExpanded ? dbRegions : dbRegions.slice(0, 11)).map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setSelectedRegion(item.name)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center space-x-1.5 cursor-pointer ${
                    selectedRegion === item.name
                      ? "bg-blue-600 text-white font-bold shadow-xs border border-blue-600"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <span>{item.name}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      selectedRegion === item.name
                        ? "bg-white/20 text-white font-bold"
                        : "bg-slate-200/80 text-slate-600"
                    }`}
                  >
                    {item.count.toLocaleString()}
                  </span>
                </button>
              ))}

              {dbRegions.length > 11 && (
                <button
                  type="button"
                  onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                  className="px-3 py-1 rounded-full text-xs font-bold text-blue-600 hover:bg-blue-50 border border-blue-200/90 transition-all flex items-center space-x-1 cursor-pointer shadow-2xs"
                >
                  <span>{isFilterExpanded ? "접기" : `+${dbRegions.length - 11}개 지역 펼치기`}</span>
                  {isFilterExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          )}

          {/* 4. 창업업력 Chips */}
          {filterTabMode === "stage" && (
            <div className="flex flex-wrap gap-1.5 items-center">
              {STAGES_LIST.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setSelectedStage(item.name)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center space-x-1.5 cursor-pointer ${
                    selectedStage === item.name
                      ? "bg-blue-600 text-white font-bold shadow-xs border border-blue-600"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Active Filter Tags Bar */}
        {(selectedCategory !== "전체" ||
          selectedOrganizer !== "전체" ||
          selectedRegion !== "전체" ||
          selectedStage !== "전체" ||
          mainPortalMode !== "all" ||
          onlyClosed) && (
          <div className="flex items-center gap-2 flex-wrap pt-2.5 border-t border-slate-100 mt-2">
            <span className="text-[11px] font-bold text-slate-500 flex items-center space-x-1">
              <span>적용 필터:</span>
            </span>
            {mainPortalMode !== "all" && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
                <span>출처: {mainPortalMode === "bizinfo" ? "기업마당" : "K-Startup"}</span>
                <button onClick={() => setMainPortalMode("all")} className="hover:text-blue-900 cursor-pointer ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedCategory !== "전체" && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
                <span>분야: {selectedCategory}</span>
                <button onClick={() => setSelectedCategory("전체")} className="hover:text-blue-900 cursor-pointer ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedOrganizer !== "전체" && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
                <span>기관: {selectedOrganizer}</span>
                <button onClick={() => setSelectedOrganizer("전체")} className="hover:text-blue-900 cursor-pointer ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedRegion !== "전체" && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
                <span>지역: {selectedRegion}</span>
                <button onClick={() => setSelectedRegion("전체")} className="hover:text-blue-900 cursor-pointer ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedStage !== "전체" && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
                <span>업력: {selectedStage}</span>
                <button onClick={() => setSelectedStage("전체")} className="hover:text-blue-900 cursor-pointer ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={resetAllFilters}
              className="text-xs text-slate-500 hover:text-rose-600 font-semibold underline underline-offset-2 ml-1 cursor-pointer transition-colors flex items-center space-x-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>필터 전체 초기화</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
