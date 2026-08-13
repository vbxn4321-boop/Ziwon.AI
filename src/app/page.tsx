"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  ChevronRight,
  Compass,
  LayoutGrid,
  Filter,
  Info,
  Clock,
  ToggleLeft,
  ToggleRight,
  RotateCcw,
} from "lucide-react";
import { Header } from "../components/Header";
import { ProgramCard, SupportProgram } from "../components/ProgramCard";
import { ProgramDetailModal } from "../components/ProgramDetailModal";

interface FilterItem {
  name: string;
  count: number;
}

export default function HomePage() {
  const [programs, setPrograms] = useState<SupportProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Expired Notice Toggle (Default: false = Active/Ongoing Notices Only)
  const [includeClosed, setIncludeClosed] = useState(false);

  // Dynamic filter lists fetched directly from DB with counts
  const [dbCategories, setDbCategories] = useState<FilterItem[]>([{ name: "전체", count: 0 }]);
  const [dbRegions, setDbRegions] = useState<FilterItem[]>([{ name: "전체", count: 0 }]);
  const [dbOrganizers, setDbOrganizers] = useState<FilterItem[]>([{ name: "전체", count: 0 }]);

  // Top Nav Portal Mode
  const [mainPortalMode, setMainPortalMode] = useState<"bizinfo" | "kstartup">("bizinfo");

  // Bizinfo Portal Dynamic Filter View Mode
  const [bizFilterMode, setBizFilterMode] = useState<"category" | "ministry" | "region">("category");
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [selectedOrganizer, setSelectedOrganizer] = useState("전체");
  const [selectedRegion, setSelectedRegion] = useState("전체");

  // K-Startup Navigation Filter Panel
  const [navStage, setNavStage] = useState("전체");
  const [navAge, setNavAge] = useState("전체");
  const [navCategory, setNavCategory] = useState("전체");

  // Detail Modal
  const [selectedProgram, setSelectedProgram] = useState<SupportProgram | null>(null);

  // K-Startup Navigation Control Definitions
  const NAV_STAGES = ["전체", "예비(0년)", "창업(1~3년)", "성장(4~7년)", "신산업(10년 이내)"];
  const NAV_AGES = ["전체", "만 20세 미만", "만 20세 이상~39세 이하", "만 40세 이상"];

  // 1. Fetch Dynamic Filters from DB on Mount
  useEffect(() => {
    fetchFiltersFromDb();
  }, []);

  const fetchFiltersFromDb = async () => {
    try {
      const res = await fetch("/api/filters");
      const json = await res.json();
      if (json.success && json.data) {
        setDbCategories(json.data.categories || [{ name: "전체", count: 0 }]);
        setDbRegions(json.data.regions || [{ name: "전체", count: 0 }]);
        setDbOrganizers(json.data.organizers || [{ name: "전체", count: 0 }]);
      }
    } catch (err) {
      console.error("Failed to fetch filters from DB:", err);
    }
  };

  // 2. Fetch Programs from DB based on selected filters
  useEffect(() => {
    fetchPrograms();
  }, [
    includeClosed,
    mainPortalMode,
    bizFilterMode,
    selectedCategory,
    selectedOrganizer,
    selectedRegion,
    navStage,
    navAge,
    navCategory,
  ]);

  const fetchPrograms = async (query = searchQuery) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.append("q", query);
      if (includeClosed) params.append("includeClosed", "true");

      if (mainPortalMode === "bizinfo") {
        if (bizFilterMode === "category" && selectedCategory !== "전체") {
          params.append("category", selectedCategory);
        } else if (bizFilterMode === "ministry" && selectedOrganizer !== "전체") {
          params.append("organizer", selectedOrganizer);
        } else if (bizFilterMode === "region" && selectedRegion !== "전체") {
          params.append("region", selectedRegion);
        }
      } else {
        if (navStage !== "전체") params.append("founderStage", navStage);
        if (navAge !== "전체") params.append("targetAge", navAge);
        if (navCategory !== "전체") params.append("category", navCategory);
      }

      const res = await fetch(`/api/support-programs?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setPrograms(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch programs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPrograms(searchQuery);
  };

  const resetNavFilters = () => {
    setNavStage("전체");
    setNavAge("전체");
    setNavCategory("전체");
    setSelectedCategory("전체");
    setSelectedOrganizer("전체");
    setSelectedRegion("전체");
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen flex flex-col text-slate-100 bg-slate-950">
      {/* Header Component */}
      <Header mainPortalMode={mainPortalMode} setMainPortalMode={setMainPortalMode} />

      {/* Hero & Search Section */}
      <section className="relative pt-6 pb-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            대한민국 모든 정부지원사업 <br className="sm:hidden" />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              실시간 1,570건 DB 카운팅 탐색
            </span>
          </h1>

          {/* Integrated Search Bar */}
          <form onSubmit={handleSearch} className="pt-2 flex items-center gap-2 max-w-2xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="사업명, 기관명, 지원혜택 키워드 검색 (예: 바우처, AI, 광주, 팁스, 가평)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-slate-100"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-lg shadow-blue-600/25 flex items-center space-x-1.5"
            >
              <span>조회</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </section>

      {/* MAIN PORTAL MODE 1: BIZINFO STYLE */}
      {mainPortalMode === "bizinfo" && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 w-full flex-1 space-y-6">
          {/* Dynamic DB Filter Pill Bar with Count Badges */}
          <div className="glass-panel p-5 rounded-2xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                <span className="text-sm font-bold text-slate-200 mr-2 flex items-center space-x-1.5">
                  <Filter className="w-4 h-4 text-blue-400" />
                  <span>
                    {bizFilterMode === "category"
                      ? "분야별 지원사업 공고"
                      : bizFilterMode === "ministry"
                      ? "주관기관/부처별 지원사업 공고"
                      : "지자체/지역별 지원사업 공고"}
                  </span>
                </span>
                <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex space-x-1 text-xs">
                  <button
                    onClick={() => {
                      setBizFilterMode("category");
                      setSelectedCategory("전체");
                    }}
                    className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
                      bizFilterMode === "category"
                        ? "bg-blue-900/90 text-blue-100 border border-blue-500/50 shadow-md"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    분야별 ({dbCategories.length - 1})
                  </button>
                  <button
                    onClick={() => {
                      setBizFilterMode("ministry");
                      setSelectedOrganizer("전체");
                    }}
                    className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
                      bizFilterMode === "ministry"
                        ? "bg-blue-900/90 text-blue-100 border border-blue-500/50 shadow-md"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    부처/기관별 ({dbOrganizers.length - 1})
                  </button>
                  <button
                    onClick={() => {
                      setBizFilterMode("region");
                      setSelectedRegion("전체");
                    }}
                    className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
                      bizFilterMode === "region"
                        ? "bg-blue-900/90 text-blue-100 border border-blue-500/50 shadow-md"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    지자체별 ({dbRegions.length - 1})
                  </button>
                </div>
              </div>

              {/* Expired Notice Toggle */}
              <div className="flex items-center space-x-3 text-xs">
                <button
                  onClick={() => setIncludeClosed(!includeClosed)}
                  className={`px-3 py-1.5 rounded-xl border transition-all flex items-center space-x-2 ${
                    includeClosed
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-300 font-semibold"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>마감된 공고 포함 보기</span>
                  {includeClosed ? (
                    <ToggleRight className="w-4 h-4 text-amber-400" />
                  ) : (
                    <ToggleLeft className="w-4 h-4 text-slate-500" />
                  )}
                </button>

                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                  {includeClosed ? "전체 공고" : "진행중 공고"}: <strong className="text-blue-400">{programs.length}</strong> 건
                </span>
              </div>
            </div>

            {/* Dynamic Secondary Sub-Pills WITH COUNT BADGES */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
              {bizFilterMode === "category" &&
                dbCategories.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => setSelectedCategory(item.name)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center space-x-1.5 ${
                      selectedCategory === item.name
                        ? "bg-blue-900/90 text-blue-200 border border-blue-500/60 shadow-md shadow-blue-500/20 font-bold"
                        : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
                    }`}
                  >
                    <span>{item.name}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        selectedCategory === item.name
                          ? "bg-blue-500/30 text-blue-100 font-extrabold"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {item.count.toLocaleString()}
                    </span>
                  </button>
                ))}

              {bizFilterMode === "ministry" &&
                dbOrganizers.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => setSelectedOrganizer(item.name)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center space-x-1.5 ${
                      selectedOrganizer === item.name
                        ? "bg-blue-900/90 text-blue-200 border border-blue-500/60 shadow-md shadow-blue-500/20 font-bold"
                        : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
                    }`}
                  >
                    <span className="truncate max-w-[140px]">{item.name}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        selectedOrganizer === item.name
                          ? "bg-blue-500/30 text-blue-100 font-extrabold"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {item.count.toLocaleString()}
                    </span>
                  </button>
                ))}

              {bizFilterMode === "region" &&
                dbRegions.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => setSelectedRegion(item.name)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center space-x-1.5 ${
                      selectedRegion === item.name
                        ? "bg-blue-900/90 text-blue-200 border border-blue-500/60 shadow-md shadow-blue-500/20 font-bold"
                        : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
                    }`}
                  >
                    <span>{item.name}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        selectedRegion === item.name
                          ? "bg-blue-500/30 text-blue-100 font-extrabold"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {item.count.toLocaleString()}
                    </span>
                  </button>
                ))}
            </div>
          </div>

          {/* Program Cards Grid */}
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-slate-400">1,570건 DB 공고 데이터를 불러오고 있습니다...</p>
            </div>
          ) : programs.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 text-center space-y-3">
              <Info className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-base text-slate-300 font-medium">선택하신 조건에 해당하는 공고가 없습니다.</p>
              <p className="text-xs text-slate-500">
                {!includeClosed ? "'마감된 공고 포함 보기'를 켜거나 필터를 '전체'로 변경해 보세요." : "필터를 '전체'로 변경해 보세요."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {programs.map((prog) => (
                <ProgramCard key={prog.id} prog={prog} onClick={() => setSelectedProgram(prog)} />
              ))}
            </div>
          )}
        </main>
      )}

      {/* MAIN PORTAL MODE 2: K-STARTUP 창업네비게이션 */}
      {mainPortalMode === "kstartup" && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 w-full flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Filter Control Panel */}
            <div className="lg:col-span-4 glass-panel rounded-2xl p-5 space-y-6 self-start">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-100 flex items-center space-x-2">
                    <Compass className="w-4 h-4 text-purple-400" />
                    <span>창업네비게이션</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    창업단계, 연령, 관심분야를 설정하여 맞춤공고를 확인해보세요!
                  </p>
                </div>
              </div>

              {/* 1. 창업단계 */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                  <span>창업단계</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {NAV_STAGES.map((stg) => (
                    <button
                      key={stg}
                      onClick={() => setNavStage(stg)}
                      className={`px-3 py-2 rounded-xl text-xs transition-all text-center ${
                        navStage === stg
                          ? "bg-purple-900/90 text-purple-100 border border-purple-500/60 font-bold shadow-md"
                          : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
                      }`}
                    >
                      {stg}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. 창업연령 */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                  <span>창업연령</span>
                </label>
                <div className="space-y-1.5">
                  {NAV_AGES.map((ag) => (
                    <button
                      key={ag}
                      onClick={() => setNavAge(ag)}
                      className={`w-full px-3 py-2 rounded-xl text-xs transition-all text-left ${
                        navAge === ag
                          ? "bg-blue-900/90 text-blue-100 border border-blue-500/60 font-bold shadow-md"
                          : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
                      }`}
                    >
                      {ag}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. 관심분야 WITH COUNT BADGES */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                    <span>관심분야 (DB 카운팅)</span>
                  </span>
                  <span className="text-[10px] text-indigo-400 font-normal">총 {dbCategories.length - 1}개</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {dbCategories.map((item) => (
                    <button
                      key={item.name}
                      onClick={() => setNavCategory(item.name)}
                      className={`px-2.5 py-2 rounded-xl text-xs transition-all text-center flex items-center justify-between ${
                        navCategory === item.name
                          ? "bg-indigo-900/90 text-indigo-100 border border-indigo-500/60 font-bold shadow-md"
                          : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
                      }`}
                    >
                      <span className="truncate">{item.name}</span>
                      <span className="text-[10px] opacity-70 ml-1">({item.count})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={resetNavFilters}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 text-xs font-medium transition-colors flex items-center justify-center space-x-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>선택 초기화</span>
                </button>
                <button
                  onClick={() => fetchPrograms()}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/25 flex items-center justify-center space-x-1"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>찾아보기</span>
                </button>
              </div>
            </div>

            {/* Right Notice List View */}
            <div className="lg:col-span-8 space-y-4">
              <div className="glass-panel p-4 rounded-2xl flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200">
                  맞춤 창업 공고 ({programs.length}건)
                </span>

                <button
                  onClick={() => setIncludeClosed(!includeClosed)}
                  className={`px-3 py-1 rounded-xl border transition-all flex items-center space-x-2 ${
                    includeClosed
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-300 font-semibold"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>마감 공고 포함</span>
                  {includeClosed ? (
                    <ToggleRight className="w-4 h-4 text-amber-400" />
                  ) : (
                    <ToggleLeft className="w-4 h-4 text-slate-500" />
                  )}
                </button>
              </div>

              {loading ? (
                <div className="py-20 text-center space-y-3 glass-panel rounded-2xl">
                  <div className="inline-block w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm text-slate-400">맞춤 창업 공고를 탐색하고 있습니다...</p>
                </div>
              ) : programs.length === 0 ? (
                <div className="glass-panel rounded-2xl p-12 text-center space-y-3">
                  <Info className="w-8 h-8 text-slate-500 mx-auto" />
                  <p className="text-base text-slate-300 font-medium">
                    선택하신 네비게이션 조건에 일치하는 공고가 없습니다.
                  </p>
                  <p className="text-xs text-slate-500">'선택 초기화' 후 조건을 다시 설정해 보세요.</p>
                </div>
              ) : (
                <div className="glass-panel rounded-2xl divide-y divide-slate-800/80 overflow-hidden">
                  {programs.map((prog) => (
                    <ProgramCard key={prog.id} prog={prog} onClick={() => setSelectedProgram(prog)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      )}

      {/* Detail Modal Component */}
      {selectedProgram && (
        <ProgramDetailModal selectedProgram={selectedProgram} onClose={() => setSelectedProgram(null)} />
      )}
    </div>
  );
}
