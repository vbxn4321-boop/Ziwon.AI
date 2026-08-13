"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Building2,
  Filter,
  Calendar,
  Sparkles,
  ExternalLink,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Layers,
  MapPin,
  Tag,
  Download,
  Info,
  X,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

interface SupportProgram {
  id: string;
  title: string;
  organizer: string;
  executingAgency?: string;
  category: string;
  region: string;
  targetDescription?: string;
  startDate?: string;
  endDate?: string;
  budget?: string;
  officialNoticeNo?: string;
  duplicateStatus: string;
  sources: { id: string; sourceType: string; sourceUrl: string; rawTitle: string }[];
  documents: { id: string; fileName: string; fileUrl: string; fileType: string }[];
  analyses: any[];
}

export default function HomePage() {
  const [programs, setPrograms] = useState<SupportProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("전체");
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [selectedProgram, setSelectedProgram] = useState<SupportProgram | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "sources" | "docs" | "ai">("overview");

  const REGIONS = ["전체", "전국", "광주", "서울", "경기"];
  const CATEGORIES = ["전체", "창업/사업화", "R&D/투자", "수출/해외진출", "소상공인/디지털", "사업화/스케일업"];

  useEffect(() => {
    fetchPrograms();
  }, [selectedRegion, selectedCategory]);

  const fetchPrograms = async (query = searchQuery) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.append("q", query);
      if (selectedRegion !== "전체") params.append("region", selectedRegion);
      if (selectedCategory !== "전체") params.append("category", selectedCategory);

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

  const getDDay = (endDateStr?: string) => {
    if (!endDateStr) return "상시모집";
    const end = new Date(endDateStr);
    const today = new Date();
    const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 3600 * 24));
    if (diffDays < 0) return "마감됨";
    if (diffDays === 0) return "D-Day";
    return `D-${diffDays}`;
  };

  return (
    <div className="min-h-screen flex flex-col text-slate-100">
      {/* Top Glass Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-500 p-[1px]">
              <div className="h-full w-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-blue-400" />
              </div>
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
                Ziwon.AI
              </span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Phase 1 Active
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2 text-xs text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-200 font-medium">(주)지윈에이아이</span>
              <span className="text-slate-600">|</span>
              <span>AI SW 개발업</span>
            </div>
            <button className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center space-x-1.5 shadow-lg shadow-blue-600/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>기업 프로필</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-8 pb-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>K-Startup & 기업마당 실시간 통합 수집 파이프라인 가동 중</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            내 기업에 꼭 맞는 <br className="sm:hidden" />
            <span className="bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
              정부 지원사업 AI Finder
            </span>
          </h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            분산된 지원사업 공고를 실시간 수집·정규화하여 핵심 혜택, 신청 자격 및 서류를 한눈에 안내합니다.
          </p>

          {/* Integrated Search Bar */}
          <form onSubmit={handleSearch} className="pt-2 flex flex-col sm:flex-row items-center gap-2 max-w-2xl mx-auto">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="사업명, 기관명, 키워드 검색 (예: AI, 바우처, 수출, 광주)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm transition-all shadow-md shadow-blue-600/25 flex items-center justify-center space-x-2"
            >
              <span>검색</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </section>

      {/* Filter & Listing Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 space-y-6">
        {/* Multi-Filter Bar */}
        <div className="glass-panel p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-blue-400" />
              <span className="text-slate-400 font-medium">지역:</span>
              <div className="flex space-x-1">
                {REGIONS.map((reg) => (
                  <button
                    key={reg}
                    onClick={() => setSelectedRegion(reg)}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      selectedRegion === reg
                        ? "bg-blue-600 text-white font-semibold"
                        : "bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800"
                    }`}
                  >
                    {reg}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Tag className="w-4 h-4 text-purple-400" />
              <span className="text-slate-400 font-medium">분야:</span>
              <div className="flex flex-wrap gap-1">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      selectedCategory === cat
                        ? "bg-purple-600 text-white font-semibold"
                        : "bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-400 font-mono">
            총 <span className="text-blue-400 font-bold">{programs.length}</span> 건 검색됨
          </div>
        </div>

        {/* Programs Cards Grid */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-slate-400">지원사업 공고를 동기화하고 있습니다...</p>
          </div>
        ) : programs.length === 0 ? (
          <div className="glass-panel rounded-2xl p-12 text-center space-y-3">
            <Info className="w-8 h-8 text-slate-500 mx-auto" />
            <p className="text-base text-slate-300 font-medium">조건에 일치하는 지원사업 공고가 없습니다.</p>
            <p className="text-xs text-slate-500">필터를 해제하거나 다른 키워드로 검색해 보세요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {programs.map((prog) => {
              const dday = getDDay(prog.endDate);
              const isUrgent = dday.startsWith("D-") && parseInt(dday.replace("D-", "")) <= 7;

              return (
                <div
                  key={prog.id}
                  onClick={() => setSelectedProgram(prog)}
                  className="glass-card rounded-2xl p-5 cursor-pointer flex flex-col justify-between space-y-4 group relative overflow-hidden"
                >
                  {/* Top Badges */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {prog.region}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                          {prog.category}
                        </span>
                        {prog.duplicateStatus === "MERGE_CANDIDATE" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center space-x-1">
                            <Layers className="w-3 h-3" />
                            <span>통합 후보</span>
                          </span>
                        )}
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          isUrgent
                            ? "bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse"
                            : dday === "마감됨"
                            ? "bg-slate-800 text-slate-500"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        }`}
                      >
                        {dday}
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-slate-100 group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                      {prog.title}
                    </h3>
                  </div>

                  {/* Metadata Fields */}
                  <div className="space-y-2 text-xs text-slate-400 border-t border-slate-800/80 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">주관기관:</span>
                      <span className="text-slate-300 font-medium truncate max-w-[180px]">{prog.organizer}</span>
                    </div>
                    {prog.budget && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">지원규모:</span>
                        <span className="text-blue-300 font-semibold truncate max-w-[180px]">{prog.budget}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">수집 출처:</span>
                      <div className="flex space-x-1">
                        {prog.sources.map((src) => (
                          <span
                            key={src.id}
                            className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                              src.sourceType === "K_STARTUP"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-teal-500/10 text-teal-300 border border-teal-500/20"
                            }`}
                          >
                            {src.sourceType === "K_STARTUP" ? "K-Startup" : "기업마당"}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Action Link */}
                  <div className="flex items-center justify-between text-xs text-blue-400 font-medium pt-1">
                    <span>상세보기 및 AI 분석</span>
                    <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Program Detail Modal */}
      {selectedProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="glass-panel w-full max-w-3xl max-h-[85vh] rounded-3xl overflow-hidden flex flex-col border border-slate-700/80 shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {selectedProgram.region}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                    {selectedProgram.category}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-100">{selectedProgram.title}</h2>
                <p className="text-xs text-slate-400">주관기관: {selectedProgram.organizer}</p>
              </div>
              <button
                onClick={() => setSelectedProgram(null)}
                className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tab Nav */}
            <div className="flex border-b border-slate-800 bg-slate-900/60 px-6 text-xs font-medium space-x-6">
              <button
                onClick={() => setActiveTab("overview")}
                className={`py-3 border-b-2 transition-colors flex items-center space-x-1.5 ${
                  activeTab === "overview"
                    ? "border-blue-500 text-blue-400 font-bold"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Info className="w-3.5 h-3.5" />
                <span>공고 개요</span>
              </button>
              <button
                onClick={() => setActiveTab("sources")}
                className={`py-3 border-b-2 transition-colors flex items-center space-x-1.5 ${
                  activeTab === "sources"
                    ? "border-blue-500 text-blue-400 font-bold"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>원문 출처 ({selectedProgram.sources.length})</span>
              </button>
              <button
                onClick={() => setActiveTab("docs")}
                className={`py-3 border-b-2 transition-colors flex items-center space-x-1.5 ${
                  activeTab === "docs"
                    ? "border-blue-500 text-blue-400 font-bold"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>첨부 서류 ({selectedProgram.documents.length})</span>
              </button>
              <button
                onClick={() => setActiveTab("ai")}
                className={`py-3 border-b-2 transition-colors flex items-center space-x-1.5 ${
                  activeTab === "ai"
                    ? "border-blue-500 text-blue-400 font-bold"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>AI 공고 분석 캐시</span>
              </button>
            </div>

            {/* Modal Body Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-sm flex-1">
              {activeTab === "overview" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-1">
                      <span className="text-slate-500 font-medium">지원금액 / 규모</span>
                      <p className="text-blue-300 font-semibold text-sm">{selectedProgram.budget || "공고문 참조"}</p>
                    </div>
                    <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-1">
                      <span className="text-slate-500 font-medium">접수기간</span>
                      <p className="text-slate-200 font-semibold text-xs">
                        {selectedProgram.startDate
                          ? `${new Date(selectedProgram.startDate).toLocaleDateString()} ~ ${
                              selectedProgram.endDate
                                ? new Date(selectedProgram.endDate).toLocaleDateString()
                                : "상시"
                            }`
                          : "공고문 참조"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">지원대상 요약</h4>
                    <p className="text-slate-200 bg-slate-900/50 p-4 rounded-xl border border-slate-800 text-xs leading-relaxed">
                      {selectedProgram.targetDescription || "세부 자격 요건은 원문 공고문을 확인하세요."}
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "sources" && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400">
                    본 공고는 아래 공식 기관 포털에서 수집 및 정규화되었습니다:
                  </p>
                  {selectedProgram.sources.map((src) => (
                    <div
                      key={src.id}
                      className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-1">
                        <span className="font-semibold text-slate-200">
                          [{src.sourceType}] {src.rawTitle}
                        </span>
                        <p className="text-[11px] text-slate-500 truncate max-w-md">{src.sourceUrl}</p>
                      </div>
                      <a
                        href={src.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 transition-colors flex items-center space-x-1"
                      >
                        <span>원문 보기</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "docs" && (
                <div className="space-y-3">
                  {selectedProgram.documents.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center">등록된 첨부 문서 파일이 없습니다.</p>
                  ) : (
                    selectedProgram.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center space-x-3">
                          <FileText className="w-4 h-4 text-blue-400" />
                          <span className="font-medium text-slate-200">{doc.fileName}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                            {doc.fileType}
                          </span>
                        </div>
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === "ai" && (
                <div className="bg-indigo-950/30 border border-indigo-500/20 p-5 rounded-2xl space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      <span className="font-semibold text-indigo-200">On-Demand Gemini AI 공고 분석 캐시</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                      비용 최적화 캐싱 적용
                    </span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    사용자 클릭 시점에 공고문 전체 파싱 후 자격요건, 혜택, 필수 제출 서류 및 평가 가점 항목을 자동 구조화합니다.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs">
              <span className="text-slate-500">ID: {selectedProgram.id}</span>
              <button
                onClick={() => setSelectedProgram(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
