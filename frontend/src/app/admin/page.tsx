"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Layers,
  Database,
  CheckCircle2,
  AlertCircle,
  Play,
  RefreshCw,
  GitMerge,
  FileText,
  Clock,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Zap,
  DownloadCloud,
  FileCode2,
  Building2,
  ArrowRight,
  Sparkles,
  Users,
  Radio,
  AlertTriangle,
} from "lucide-react";
import { initAuthStore } from "@/lib/auth-store";
import { getJwtToken } from "@/lib/supabase-client";

interface AdminStats {
  userStats?: {
    activeUsersNow: number;
    loggedInUsers: number;
    guestUsers: number;
    todayVisitors: number;
    totalUsers: number;
    totalCompanies: number;
    totalSavedPlans: number;
    activePages: Record<string, number>;
  };
  totalPrograms: number;
  activePrograms: number;
  bizinfoCount: number;
  kstartupCount: number;
  mergedCount: number;
  programsWithDocs: number;
  activeProgramsWithDocs: number;
  activeProgramsMissingDocs: number;
  dualSourcePrograms: Array<{
    id: string;
    title: string;
    organizer: string;
    endDate: string | null;
    docCount: number;
    sources: Array<{
      type: string;
      url: string;
      rawTitle: string;
    }>;
  }>;
  crawlLogs: Array<{
    id: string;
    sourceType: string;
    status: string;
    itemCount: number;
    executedAt: string;
  }>;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"merged" | "queue" | "logs">("merged");

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Pre-scraping state
  const [isPreScraping, setIsPreScraping] = useState(false);
  const [preScrapeLimit, setPreScrapeLimit] = useState(5);
  const [preScrapeResult, setPreScrapeResult] = useState<any>(null);

  // Dedup state
  const [isDeduping, setIsDeduping] = useState(false);
  const [dedupResult, setDedupResult] = useState<any>(null);

  // Crawler state
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlerResult, setCrawlerResult] = useState<any>(null);

  // Safety Confirmation Modal state (위험 작업 이중 확인 장치)
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    description: string;
    actionType: "crawler" | "dedup" | "preScrape";
    confirmButtonText: string;
    isDestructive?: boolean;
  } | null>(null);

  // [보안 1순위] JWT 인증 토큰 자동 첨부 fetch 헬퍼
  const authFetch = async (url: string, options: RequestInit = {}) => {
    const token = await getJwtToken();
    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return fetch(url, { ...options, headers });
  };

  const fetchStats = async (isBackground = false) => {
    try {
      if (!isBackground) setIsLoading(true);
      const res = await authFetch("/api/admin/stats");
      const json = await res.json();
      if (json.success) {
        setStats(json.data);
      }
    } catch (err) {
      console.error("Failed to load admin stats:", err);
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  };

  useEffect(() => {
    initAuthStore().then((user) => {
      setCurrentUser(user);
      setAuthChecked(true);
      if (user?.role === "ADMIN" || user?.email === "qjawls2617@naver.com") {
        fetchStats();
      }
    });
  }, []);

  const isAdmin = currentUser?.role === "ADMIN" || currentUser?.email === "qjawls2617@naver.com";

  useEffect(() => {
    if (!isAdmin) return;
    const timer = setInterval(() => {
      fetchStats(true);
    }, 10000);
    return () => clearInterval(timer);
  }, [isAdmin]);

  // Actual executions
  const executePreScrape = async () => {
    try {
      setIsPreScraping(true);
      setPreScrapeResult(null);
      const res = await authFetch("/api/admin/pre-scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: preScrapeLimit }),
      });
      const data = await res.json();
      setPreScrapeResult(data);
      fetchStats();
    } catch (err: any) {
      setPreScrapeResult({ success: false, error: err.message });
    } finally {
      setIsPreScraping(false);
    }
  };

  const executeDedup = async () => {
    try {
      setIsDeduping(true);
      setDedupResult(null);
      const res = await authFetch("/api/admin/dedup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      setDedupResult(data);
      fetchStats();
    } catch (err: any) {
      setDedupResult({ success: false, error: err.message });
    } finally {
      setIsDeduping(false);
    }
  };

  const executeCrawler = async () => {
    try {
      setIsCrawling(true);
      setCrawlerResult(null);
      const res = await authFetch("http://localhost:8000/api/v1/admin/crawler/run", {
        method: "POST",
      });
      const data = await res.json();
      setCrawlerResult(data);
      fetchStats();
    } catch (err: any) {
      setCrawlerResult({ success: false, error: err.message });
    } finally {
      setIsCrawling(false);
    }
  };

  const handlePreScrapeClick = () => {
    if (preScrapeLimit >= 10) {
      setConfirmModal({
        title: `대량 첨부파일 사전 스크래핑 (${preScrapeLimit}건)`,
        description: `진행중인 공고 ${preScrapeLimit}건의 정부 사이트에 순차 접속하여 서식 파일 다운로드 및 본문 파싱을 일괄 실행합니다. 계속하시겠습니까?`,
        actionType: "preScrape",
        confirmButtonText: `${preScrapeLimit}건 스크래핑 시작`,
        isDestructive: false,
      });
    } else {
      executePreScrape();
    }
  };

  const handleDedupClick = () => {
    setConfirmModal({
      title: "중복 공고 일괄 매칭 및 병합",
      description: "기업마당과 K-Startup에 중복 수집된 공고들을 기업마당 대표 공고 1건으로 통합하고 출처를 단일화합니다. 진행하시겠습니까?",
      actionType: "dedup",
      confirmButtonText: "일괄 통합 실행",
      isDestructive: true,
    });
  };

  const handleCrawlerClick = () => {
    setConfirmModal({
      title: "정부 OpenAPI 실시간 수집 가동",
      description: "기업마당 및 K-Startup 공식 OpenAPI에서 각 500건씩 최신 지원사업 데이터를 가져와 DB에 적재합니다. 진행하시겠습니까?",
      actionType: "crawler",
      confirmButtonText: "수집 파이프라인 가동",
      isDestructive: false,
    });
  };

  const handleConfirmAction = () => {
    if (!confirmModal) return;
    const type = confirmModal.actionType;
    setConfirmModal(null);
    if (type === "crawler") executeCrawler();
    else if (type === "dedup") executeDedup();
    else if (type === "preScrape") executePreScrape();
  };

  // 1. 관리자 권한 확인 중 로딩 화면 (화면 깜빡임 및 데이터 유출 100% 방지)
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mx-auto shadow-xl">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-white tracking-wide">관리자 보안 인증 확인 중</h2>
            <p className="text-xs text-slate-500">인증 상태를 안전하게 검증하고 있습니다...</p>
          </div>
        </div>
      </div>
    );
  }

  // 2. 관리자가 아닌 비회원/일반 회원 접근 차단 화면
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-extrabold text-white">관리자 전용 페이지</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            해당 대시보드는 최고 관리자 권한을 가진 계정만 열람할 수 있습니다.
          </p>
          <Link
            href="/"
            className="inline-block w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all"
          >
            서비스 홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Top Header Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-black text-lg shadow-lg">
            ⚡
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-extrabold text-white tracking-tight">
                Ziwon.AI 시스템 운영 관리 센터
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                Live Admin Mode
              </span>
            </div>
            <p className="text-xs text-slate-400">
              공고문 중복 수집 방지(Canonical Deduplication) & 백그라운드 사전 스크래핑 모니터링
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchStats()}
            disabled={isLoading}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300 flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-blue-400" : ""}`} />
            <span>새로고침</span>
          </button>
          <Link
            href="/"
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md flex items-center space-x-1 transition-all"
          >
            <span>서비스 홈으로</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="max-w-7xl mx-auto p-6 space-y-8">
        {/* 1. Core KPIs Stats Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 0: Real-time Live Active Users */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-500/40 shadow-xl space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span className="flex items-center space-x-1.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-300 font-bold tracking-wider">LIVE 동시 접속자</span>
              </span>
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-black text-emerald-400">
                {stats?.userStats?.activeUsersNow ?? 0}
              </span>
              <span className="text-xs text-slate-400">명 실시간 체류</span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/60">
              <span>오늘 방문: <strong className="text-slate-200">{stats?.userStats?.todayVisitors ?? 0}명</strong></span>
              <span>가입 회원: <strong className="text-emerald-400">{stats?.userStats?.totalUsers ?? 0}명</strong></span>
            </div>
          </div>

          {/* Card 1: Total Programs */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>총 적재 지원사업</span>
              <Database className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-black text-white">
                {stats?.totalPrograms.toLocaleString() || "..."}
              </span>
              <span className="text-xs text-slate-400">건</span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center space-x-2 pt-1 border-t border-slate-800/60">
              <span className="text-emerald-400 font-bold">
                진행중 {stats?.activePrograms || 0}건
              </span>
              <span>•</span>
              <span className="text-slate-500">
                마감 {(stats?.totalPrograms || 0) - (stats?.activePrograms || 0)}건
              </span>
            </div>
          </div>

          {/* Card 2: Sources Distribution */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>수집 출처별 현황 (SupportSource)</span>
              <Layers className="w-4 h-4 text-purple-400" />
            </div>
            <div className="flex items-baseline space-x-3">
              <div>
                <span className="text-xs text-blue-400 font-bold block">기업마당</span>
                <span className="text-2xl font-black text-white">
                  {stats?.bizinfoCount.toLocaleString() || "..."}
                </span>
              </div>
              <span className="text-slate-600 text-xl font-light">/</span>
              <div>
                <span className="text-xs text-purple-400 font-bold block">K-Startup</span>
                <span className="text-2xl font-black text-white">
                  {stats?.kstartupCount.toLocaleString() || "..."}
                </span>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/60 flex items-center justify-between">
              <span>총 수집 소스</span>
              <span className="font-bold text-slate-200">
                {((stats?.bizinfoCount || 0) + (stats?.kstartupCount || 0)).toLocaleString()}건
              </span>
            </div>
          </div>

          {/* Card 3: Deduplication / Canonical Merged */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/20 shadow-xl space-y-3 relative">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>중복 매칭 & 통합 완료 (Canonical)</span>
              <GitMerge className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-black text-emerald-400">
                {stats?.mergedCount || 0}
              </span>
              <span className="text-xs text-slate-400">건 통합 완료</span>
            </div>
            <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
              <span className="text-emerald-300 font-semibold">
                기업마당 우선 원칙에 의해 1개 대표공고로 통합됨
              </span>
            </div>
          </div>

          {/* Card 4: Document Pre-scraping */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-blue-500/20 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>진행중 공고 첨부파일 적재율</span>
              <DownloadCloud className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-black text-blue-400">
                {stats?.activePrograms
                  ? Math.round(
                      ((stats.activeProgramsWithDocs || 0) / stats.activePrograms) * 100
                    )
                  : 0}
                %
              </span>
              <span className="text-xs text-slate-400">
                ({stats?.activeProgramsWithDocs || 0} / {stats?.activePrograms || 0})
              </span>
            </div>
            <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/60 flex items-center justify-between">
              <span>사전 적재 대기</span>
              <span className="font-bold text-amber-400">
                {stats?.activeProgramsMissingDocs || 0}건 필요
              </span>
            </div>
          </div>
        </section>

        {/* 2. Operations Control Action Panel */}
        <section className="rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/40 p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-300">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-white">
                  원클릭 제어 & 사전 적재 워커 실행
                </h2>
                <p className="text-xs text-slate-400">
                  대기열에 있는 공고를 백그라운드에서 스크래핑하거나, 중복 공고를 즉시 통합합니다.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Action 1: Pre-Scraping Batch */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-300 flex items-center space-x-1.5">
                  <DownloadCloud className="w-3.5 h-3.5" />
                  <span>첨부서류 사전 스크래핑</span>
                </span>
                <select
                  value={preScrapeLimit}
                  onChange={(e) => setPreScrapeLimit(Number(e.target.value))}
                  disabled={isPreScraping}
                  className="bg-slate-900 border border-slate-700 text-slate-300 text-[11px] rounded-lg px-2 py-1"
                >
                  <option value={3}>3건 처리</option>
                  <option value={5}>5건 처리 (권장)</option>
                  <option value={10}>10건 처리</option>
                  <option value={20}>20건 처리</option>
                </select>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                미적재 활성 공고의 원문 사이트에 접근하여 HWP/PDF 파일을 사전 다운로드 & 목차를 추출합니다.
              </p>
              <button
                onClick={handlePreScrapeClick}
                disabled={isPreScraping}
                className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white text-xs font-bold shadow-md flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
              >
                {isPreScraping ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>순차 적재 중 (건당 2초 텀)...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>사전 스크래핑 가동</span>
                  </>
                )}
              </button>
            </div>

            {/* Action 2: Run Deduplication */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-3">
              <span className="text-xs font-bold text-emerald-300 flex items-center space-x-1.5">
                <GitMerge className="w-3.5 h-3.5" />
                <span>중복 공고 스캔 & 통합</span>
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                기업마당과 K-Startup 간 신규 중복 공고를 3중 매칭(정규화 제목+마감일+기관)으로 스캔하여 단일화합니다.
              </p>
              <button
                onClick={handleDedupClick}
                disabled={isDeduping}
                className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white text-xs font-bold shadow-md flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
              >
                {isDeduping ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>중복 대조 및 통합 중...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>중복 재스캔 & 자동 통합</span>
                  </>
                )}
              </button>
            </div>

            {/* Action 3: Trigger Live Crawler */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-3">
              <span className="text-xs font-bold text-blue-300 flex items-center space-x-1.5">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>정부 API 실시간 수집</span>
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                기업마당 및 K-Startup 공식 OpenAPI로부터 최신 지원사업 공고를 즉시 갱신 수집합니다.
              </p>
              <button
                onClick={handleCrawlerClick}
                disabled={isCrawling}
                className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white text-xs font-bold shadow-md flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
              >
                {isCrawling ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>공고 크롤링 수집 중...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>크롤러 즉시 가동</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Action Feedback Notifications */}
          {preScrapeResult && (
            <div className="p-4 rounded-2xl bg-slate-900 border border-indigo-500/40 text-xs text-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="font-bold">{preScrapeResult.message || JSON.stringify(preScrapeResult)}</span>
                </div>
                <button
                  onClick={() => setPreScrapeResult(null)}
                  className="text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 cursor-pointer"
                >
                  닫기
                </button>
              </div>

              {preScrapeResult.data?.results && preScrapeResult.data.results.length > 0 && (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {preScrapeResult.data.results.map((r: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-2 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-[11px]"
                    >
                      <div className="truncate pr-3 max-w-[70%] text-slate-300">
                        <span className="text-slate-500 font-mono mr-1.5">{idx + 1}.</span>
                        {r.title}
                      </div>
                      <div>
                        {r.status === "SUCCESS" ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                            ✓ 첨부 {r.docCount}개 적재 완료
                          </span>
                        ) : r.status === "NO_ATTACHMENTS_FOUND" ? (
                          <span
                            className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium"
                            title="원문 웹페이지에 서식 파일이 없고 URL 링크만 있는 공고"
                          >
                            ⚠ 원문 파일 미제공 (URL접수형)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                            ✕ 실패
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {dedupResult && (
            <div className="p-3.5 rounded-xl bg-slate-900 border border-emerald-500/40 text-xs text-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{dedupResult.message || `통합 결과: ${JSON.stringify(dedupResult)}`}</span>
              </div>
              <button
                onClick={() => setDedupResult(null)}
                className="text-[11px] text-slate-400 hover:text-white"
              >
                닫기
              </button>
            </div>
          )}

          {crawlerResult && (
            <div className="p-3.5 rounded-xl bg-slate-900 border border-blue-500/40 text-xs text-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400" />
                <span>{crawlerResult.message || JSON.stringify(crawlerResult)}</span>
              </div>
              <button
                onClick={() => setCrawlerResult(null)}
                className="text-[11px] text-slate-400 hover:text-white"
              >
                닫기
              </button>
            </div>
          )}
        </section>

        {/* 3. Detailed Inspection Tabs */}
        <section className="space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800">
            <button
              onClick={() => setActiveTab("merged")}
              className={`pb-3 px-4 text-xs font-bold transition-all relative cursor-pointer ${
                activeTab === "merged"
                  ? "text-blue-400 border-b-2 border-blue-500"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              🔗 기업마당 & K-Startup 통합 공고 목록 ({stats?.dualSourcePrograms.length || 0}건)
            </button>
            <button
              onClick={() => setActiveTab("logs")}
              className={`pb-3 px-4 text-xs font-bold transition-all relative cursor-pointer ${
                activeTab === "logs"
                  ? "text-blue-400 border-b-2 border-blue-500"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              📜 크롤러 수집 파이프라인 로그 ({stats?.crawlLogs.length || 0}건)
            </button>
          </div>

          {activeTab === "merged" && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
              <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div className="text-xs font-bold text-slate-300">
                  하나의 대표 사업으로 통합된 양방향 출처 공고 목록
                </div>
                <span className="text-[11px] text-emerald-400 font-semibold">
                  ✓ 중복 노출 없이 1개 공고에 2개 출처가 정상 매핑됨
                </span>
              </div>

              <div className="divide-y divide-slate-800/80">
                {stats?.dualSourcePrograms && stats.dualSourcePrograms.length > 0 ? (
                  stats.dualSourcePrograms.map((p, idx) => (
                    <div key={p.id} className="p-4 hover:bg-slate-900/80 transition-colors space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                              기업마당
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                              K-Startup
                            </span>
                            <span className="text-xs font-extrabold text-white">
                              {p.title}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center space-x-3">
                            <span>주관: {p.organizer}</span>
                            <span>•</span>
                            <span>
                              마감: {p.endDate ? new Date(p.endDate).toLocaleDateString() : "상시"}
                            </span>
                            <span>•</span>
                            <span className="text-emerald-400 font-semibold">
                              첨부문서 {p.docCount}개 확보
                            </span>
                          </div>
                        </div>

                        <Link
                          href={`/programs/${p.id}`}
                          target="_blank"
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 flex items-center space-x-1"
                        >
                          <span>공고 상세</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>

                      {/* Source URLs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                        {p.sources.map((s, sIdx) => (
                          <a
                            key={sIdx}
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between group"
                          >
                            <span className="truncate pr-2 text-slate-400 group-hover:text-slate-200">
                              [{s.type}] {s.rawTitle || s.url}
                            </span>
                            <ExternalLink className="w-3 h-3 text-slate-500 flex-shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400">
                    현재 통합된 중복 공고가 없습니다.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "logs" && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold">
                  <tr>
                    <th className="p-3">실행 시각 (KST)</th>
                    <th className="p-3">수집 모듈</th>
                    <th className="p-3">상태</th>
                    <th className="p-3 text-right">수집/적재 건수</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {stats?.crawlLogs && stats.crawlLogs.length > 0 ? (
                    stats.crawlLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-900/40">
                        <td className="p-3 text-slate-400">
                          {new Date(log.executedAt).toLocaleString("ko-KR")}
                        </td>
                        <td className="p-3 font-semibold text-blue-400">{log.sourceType}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.status === "SUCCESS"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="p-3 text-right font-bold text-white">
                          +{log.itemCount}건
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-500">
                        기록된 크롤러 로그가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Safety Confirmation Modal (휴먼 에러 방지 이중 확인 장치) */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start space-x-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  confirmModal.isDestructive
                    ? "bg-rose-500/10 border border-rose-500/30 text-rose-400"
                    : "bg-amber-500/10 border border-amber-500/30 text-amber-400"
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-white">
                  {confirmModal.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {confirmModal.description}
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2.5 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className={`px-4 py-2 rounded-xl text-white text-xs font-extrabold shadow-md transition-all cursor-pointer flex items-center space-x-1.5 ${
                  confirmModal.isDestructive
                    ? "bg-rose-600 hover:bg-rose-500"
                    : "bg-amber-600 hover:bg-amber-500"
                }`}
              >
                <span>{confirmModal.confirmButtonText}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
