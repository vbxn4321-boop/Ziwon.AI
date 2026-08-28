"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Bookmark,
  Sparkles,
  Eye,
  FileText,
  ExternalLink,
  Download,
  Building2,
  Calendar,
  Layers,
  TrendingUp,
  AlertTriangle,
  FileCheck,
  Award,
  Scale,
  ShieldAlert,
  Lock,
  ArrowRight,
  RefreshCw,
  Copy,
  Check,
  CheckCircle2,
  Maximize2,
  Share2,
} from "lucide-react";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";
import { SupportProgram } from "@/components/ProgramCard";
import { getJwtToken } from "@/lib/supabase-client";
import { fetchMyCompany, fetchMyBookmarks, toggleBookmarkOnBackend } from "@/lib/backend-client";
import CompanyProfileModal from "@/components/auth/CompanyProfileModal";

// Helper to strip HTML tags safely
function cleanHtml(rawText: string | null | undefined): string {
  if (!rawText) return "";
  return rawText
    .replace(/<br\s*[\/]?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&apos;/gi, "'")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&#34;/gi, '"')
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&middot;/gi, "·")
    .replace(/&#183;/gi, "·")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

function formatNoticeDate(raw: string | null | undefined): string {
  if (!raw) return "공고문 참조";
  const cleaned = cleanHtml(raw);
  return cleaned.replace(/(\d{4})(\d{2})(\d{2})/g, "$1.$2.$3");
}

function getDDay(endDateStr?: string): { text: string; isUrgent: boolean; isClosed: boolean } {
  if (!endDateStr) return { text: "상시모집", isUrgent: false, isClosed: false };
  const end = new Date(endDateStr);
  if (isNaN(end.getTime())) return { text: "공고문 참조", isUrgent: false, isClosed: false };
  end.setHours(23, 59, 59, 999);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((end.getTime() - today.getTime()) / (1000 * 3600 * 24));
  if (diffDays < 0) return { text: "마감완료", isUrgent: false, isClosed: true };
  if (diffDays === 0) return { text: "오늘 마감 (D-Day)", isUrgent: true, isClosed: false };
  return { text: `D-${diffDays}`, isUrgent: diffDays <= 7, isClosed: false };
}

function renderConditionChips(
  rawString: string | null | undefined,
  fallback: string = "공고문 참조",
  colorScheme: "amber" | "blue" | "teal" | "purple" = "amber"
) {
  if (!rawString || !rawString.trim()) {
    return <span className="text-slate-400 text-xs">{fallback}</span>;
  }
  const clean = cleanHtml(rawString);
  const items = clean
    .split(/[,/·|]/)
    .map((i) => i.trim())
    .filter(Boolean);

  if (items.length <= 1) {
    return <span className="font-semibold text-slate-200 text-xs break-words leading-relaxed">{clean}</span>;
  }

  const colorClasses = {
    amber: "bg-amber-500/15 text-amber-200 border-amber-500/30",
    blue: "bg-blue-500/15 text-blue-200 border-blue-500/30",
    teal: "bg-teal-500/15 text-teal-200 border-teal-500/30",
    purple: "bg-purple-500/15 text-purple-200 border-purple-500/30",
  }[colorScheme];

  return (
    <div className="flex flex-wrap gap-1.5 pt-0.5">
      {items.map((item, idx) => (
        <span
          key={idx}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium border break-all leading-tight ${colorClasses}`}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

export default function ProgramDetailPage() {
  const params = useParams();
  const router = useRouter();
  const programId = params?.id as string;

  const [program, setProgram] = useState<SupportProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Tab: 'viewer' (default: 0 AI cost) | 'ai' | 'docs' | 'sources'
  const [activeTab, setActiveTab] = useState<"viewer" | "ai" | "docs" | "sources">("viewer");

  // Document states
  const [selectedDocIndex, setSelectedDocIndex] = useState<number>(0);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);

  // AI Deep Analysis
  const [liveAnalysis, setLiveAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Bookmark states
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  // Company Match Gate States
  const [userCompany, setUserCompany] = useState<any>(null);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [gateState, setGateState] = useState<"unauthenticated" | "no_company" | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [matchingResult, setMatchingResult] = useState<any>(null);
  const [matchError, setMatchError] = useState<string | null>(null);

  // UI helpers
  const [isCopied, setIsCopied] = useState(false);
  const [shareToast, setShareToast] = useState(false);

  // Initial Fetch
  useEffect(() => {
    if (programId) {
      fetchProgramDetail(programId);
      checkBookmarkStatus(programId);
    }
  }, [programId]);

  const fetchProgramDetail = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/support-programs/${id}`);
      if (!res.ok) {
        throw new Error("공고 정보를 불러오는데 실패했습니다.");
      }
      const json = await res.json();
      if (json.success && json.data) {
        setProgram(json.data);
        if (json.data.analyses && json.data.analyses.length > 0) {
          setLiveAnalysis(json.data.analyses[0]);
        }
      } else {
        throw new Error(json.error || "공고를 찾을 수 없습니다.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "공고를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const checkBookmarkStatus = async (id: string) => {
    try {
      const token = await getJwtToken();
      if (!token) return;
      const bks = await fetchMyBookmarks(token);
      if (Array.isArray(bks)) {
        setIsBookmarked(bks.some((b: any) => b.supportProgramId === id || b.programId === id));
      }
    } catch (e) {
      console.warn("Failed to check bookmark:", e);
    }
  };

  const handleToggleBookmark = async () => {
    try {
      setBookmarkLoading(true);
      const token = await getJwtToken();
      if (!token) {
        alert("관심 공고를 찜하려면 먼저 로그인해 주세요.");
        router.push("/login");
        return;
      }
      const res = await toggleBookmarkOnBackend(token, programId);
      setIsBookmarked(res.bookmarked);
    } catch (err) {
      console.error("Failed to toggle bookmark:", err);
    } finally {
      setBookmarkLoading(false);
    }
  };

  const handleShareUrl = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2000);
    }
  };

  // Raw source parsing helpers
  const kstartupRawData = useMemo(() => {
    if (!program?.sources) return null;
    const kstSrc = program.sources.find((s) => s.sourceType === "K_STARTUP");
    if (!kstSrc || !kstSrc.rawData) return null;
    try {
      return typeof kstSrc.rawData === "string" ? JSON.parse(kstSrc.rawData) : kstSrc.rawData;
    } catch {
      return null;
    }
  }, [program?.sources]);

  const bizinfoRawData = useMemo(() => {
    if (!program?.sources) return null;
    const bizSrc = program.sources.find((s) => s.sourceType === "BIZINFO");
    if (!bizSrc || !bizSrc.rawData) return null;
    try {
      return typeof bizSrc.rawData === "string" ? JSON.parse(bizSrc.rawData) : bizSrc.rawData;
    } catch {
      return null;
    }
  }, [program?.sources]);

  const kst = (keys: string[]): string | null => {
    if (!kstartupRawData) return null;
    for (const k of keys) {
      const val = kstartupRawData[k];
      if (val && String(val).trim() && String(val).trim() !== "0") return String(val).trim();
    }
    return null;
  };

  const biz = (keys: string[]): string | null => {
    if (!bizinfoRawData) return null;
    for (const k of keys) {
      const val = bizinfoRawData[k];
      if (val && String(val).trim() && String(val).trim() !== "0") return String(val).trim();
    }
    return null;
  };

  const isKst = program?.sources.some((s) => s.sourceType === "K_STARTUP");
  const isBiz = program?.sources.some((s) => s.sourceType === "BIZINFO");
  const ddayInfo = getDDay(program?.endDate);

  const programDocs = program?.documents || [];
  const sortedDocs = useMemo(() => {
    return [...programDocs].sort((a, b) => {
      const aIsPdf = a.fileType?.toUpperCase() === "PDF" || a.fileName?.toLowerCase().endsWith(".pdf");
      const bIsPdf = b.fileType?.toUpperCase() === "PDF" || b.fileName?.toLowerCase().endsWith(".pdf");
      if (aIsPdf && !bIsPdf) return -1;
      if (!aIsPdf && bIsPdf) return 1;
      return 0;
    });
  }, [programDocs]);

  const currentDoc = sortedDocs[selectedDocIndex] || sortedDocs[0] || null;
  const isCurrentPdf =
    currentDoc?.fileType?.toUpperCase() === "PDF" || currentDoc?.fileName?.toLowerCase().endsWith(".pdf");

  // On-Demand AI Deep Analysis Trigger
  const handleRunLiveAnalysis = async () => {
    if (!program) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const res = await fetch(`/api/support-programs/${program.id}/analyze`, {
        method: "POST",
      });
      const rawText = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(rawText);
      } catch {
        json = null;
      }

      if (json && json.success && json.analysis) {
        setLiveAnalysis(json.analysis);
        setAnalysisError(null);
        setActiveTab("ai");
      } else {
        const errMsg = json?.error || "AI 분석 서버와의 통신에 실패했습니다. 잠시 후 다시 시도해 주세요.";
        setAnalysisError(errMsg);
      }
    } catch (err: any) {
      setAnalysisError("AI 분석 서버와의 통신에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // AI Matching Trigger
  const handleStartMatching = async (companyOverride?: any) => {
    setMatchError(null);
    setGateState(null);

    const token = await getJwtToken();
    if (!token) {
      setGateState("unauthenticated");
      return;
    }

    let comp = companyOverride || userCompany;
    if (!comp) {
      try {
        comp = await fetchMyCompany(token);
        setUserCompany(comp);
      } catch (err) {
        comp = null;
      }
    }

    if (!comp || !comp.name) {
      setGateState("no_company");
      return;
    }

    setIsMatching(true);
    try {
      const res = await fetch("/api/ai/match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          programId: program?.id,
          companyProfile: comp,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setMatchingResult(json.data);
      } else {
        setMatchError(json.error || "적합도 분석에 실패했습니다.");
      }
    } catch (err: any) {
      setMatchError("적합도 분석 중 통신 오류가 발생했습니다.");
    } finally {
      setIsMatching(false);
    }
  };

  // Structured AI JSON parser
  const aiData = useMemo(() => {
    const rawResultJson = liveAnalysis?.resultJson || program?.analyses?.[0]?.resultJson;
    if (!rawResultJson) return null;
    try {
      return typeof rawResultJson === "string" ? JSON.parse(rawResultJson) : rawResultJson;
    } catch {
      return null;
    }
  }, [liveAnalysis, program?.analyses]);

  // Loading Skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Header activeNavTab="notices" setActiveNavTab={() => {}} mainPortalMode="bizinfo" setMainPortalMode={() => {}} totalCount={0} />
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
          <div className="text-center space-y-4">
            <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
            <p className="text-slate-400 text-sm font-medium">공고 원문 및 문서를 안전하게 불러오는 중입니다...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Error State
  if (error || !program) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Header activeNavTab="notices" setActiveNavTab={() => {}} mainPortalMode="bizinfo" setMainPortalMode={() => {}} totalCount={0} />
        <main className="flex-1 max-w-4xl w-full mx-auto p-6 flex items-center justify-center">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4 max-w-md w-full">
            <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
            <h2 className="text-lg font-bold text-white">공고를 찾을 수 없습니다</h2>
            <p className="text-sm text-slate-400">{error || "삭제되었거나 존재하지 않는 공고 ID입니다."}</p>
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white transition-all inline-flex items-center space-x-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>지원사업 탐색으로 돌아가기</span>
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <Header
        activeNavTab="notices"
        setActiveNavTab={() => {}}
        mainPortalMode={isKst ? "kstartup" : "bizinfo"}
        setMainPortalMode={() => {}}
        totalCount={1}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation Breadcrumb & Action Bar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <button
            onClick={() => router.back()}
            className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-medium transition-all flex items-center space-x-1.5 shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>목록으로 돌아가기</span>
          </button>

          <div className="flex items-center space-x-2">
            {/* Share / Copy URL Button */}
            <button
              onClick={handleShareUrl}
              className="px-3 py-2 rounded-xl bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 text-xs font-medium transition-all flex items-center space-x-1.5 cursor-pointer relative"
              title="공고 링크 복사"
            >
              {shareToast ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              <span>{shareToast ? "링크 복사됨!" : "공유"}</span>
            </button>

            {/* Bookmark Button */}
            <button
              onClick={handleToggleBookmark}
              disabled={bookmarkLoading}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer border ${
                isBookmarked
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/20"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700"
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-amber-400 text-amber-400" : ""}`} />
              <span>{isBookmarked ? "찜 완료" : "관심 공고 찜"}</span>
            </button>

            {/* PSST Plan Creation Link */}
            <Link
              href={`/?tab=psst&programTitle=${encodeURIComponent(program.title)}`}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-md shadow-purple-600/20"
            >
              <Sparkles className="w-4 h-4" />
              <span>PSST 사업계획서 작성</span>
            </Link>
          </div>
        </div>

        {/* 1. Main Notice Info Banner (0 Cost Raw Data & Platform Specific Fields) */}
        {isKst ? (
          <div className="bg-gradient-to-r from-amber-950/30 via-slate-900 to-indigo-950/20 border border-amber-500/30 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
            <div className="flex items-start justify-between flex-wrap gap-3 border-b border-amber-500/20 pb-4">
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30">
                    🚀 K-Startup 창업 지원사업
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700">
                    {program.category || "일반창업"}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${
                    ddayInfo.isClosed
                      ? "bg-slate-800 text-slate-400 border-slate-700"
                      : ddayInfo.isUrgent
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse"
                      : "bg-blue-500/20 text-blue-300 border-blue-500/30"
                  }`}>
                    {ddayInfo.text}
                  </span>
                </div>
                <h1 className="text-lg sm:text-2xl font-black text-slate-100 break-words leading-snug">
                  {cleanHtml(kst(["biz_pbanc_nm", "intg_pbanc_biz_nm", "공고명"])) || program.title}
                </h1>
              </div>

              {kst(["aply_mthd_onli_rcpt_istc", "detl_pg_url"])?.startsWith("http") && (
                <a
                  href={kst(["aply_mthd_onli_rcpt_istc", "detl_pg_url"])!}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center space-x-1.5 transition-colors flex-shrink-0"
                >
                  <span>K-Startup 온라인 접수처 바로가기</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {/* 4 Key Condition Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-1.5 flex flex-col justify-start">
                <span className="text-[11px] text-amber-400/90 font-bold block">창업 업력 조건</span>
                <div className="flex-1">{renderConditionChips(kst(["biz_enyy", "창업업력"]), "공고문 참조", "amber")}</div>
              </div>
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-1.5 flex flex-col justify-start">
                <span className="text-[11px] text-amber-400/90 font-bold block">대상 연령</span>
                <div className="flex-1">{renderConditionChips(kst(["aply_trgt_age", "대상연령"]), "공고문 참조", "amber")}</div>
              </div>
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-1.5 flex flex-col justify-start">
                <span className="text-[11px] text-amber-400/90 font-bold block">지원 지역</span>
                <div className="flex-1">{renderConditionChips(kst(["supt_regin", "지역"]) || program.region, "전국", "blue")}</div>
              </div>
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-1.5 flex flex-col justify-start">
                <span className="text-[11px] text-amber-400/90 font-bold block">접수 기간</span>
                <span className="font-semibold text-slate-200 text-xs break-words leading-relaxed block">
                  {kst(["pbanc_rcpt_bgng_dt"]) && kst(["pbanc_rcpt_end_dt"])
                    ? `${formatNoticeDate(kst(["pbanc_rcpt_bgng_dt"]))} ~ ${formatNoticeDate(kst(["pbanc_rcpt_end_dt"]))}`
                    : "공고문 참조"}
                </span>
              </div>
            </div>

            {/* Extended Detail Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              {cleanHtml(kst(["aply_trgt_ctnt", "신청대상"])) && (
                <div className="text-xs bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 text-slate-300 leading-relaxed space-y-1">
                  <strong className="text-emerald-400 font-bold block text-[11px]">🎯 신청 대상 상세</strong>
                  <p className="text-slate-200 whitespace-pre-wrap">{cleanHtml(kst(["aply_trgt_ctnt", "신청대상"]))}</p>
                </div>
              )}
              {cleanHtml(kst(["aply_excl_trgt_ctnt", "제외대상"])) && (
                <div className="text-xs bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 text-slate-300 leading-relaxed space-y-1">
                  <strong className="text-rose-400 font-bold block text-[11px]">🚫 신청 제외 대상</strong>
                  <p className="text-slate-300 whitespace-pre-wrap">{cleanHtml(kst(["aply_excl_trgt_ctnt", "제외대상"]))}</p>
                </div>
              )}
            </div>

            {/* Agency and Contact Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80">
              <div>
                <span className="text-slate-400 font-bold block text-[11px]">소관/주관기관</span>
                <span className="text-slate-200 font-medium">{cleanHtml(kst(["pbanc_ntrp_nm", "소관기관"])) || program.organizer || "공고문 참조"}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[11px]">수행/운영기관</span>
                <span className="text-slate-200 font-medium">{cleanHtml(kst(["exct_istt_nm", "수행기관"])) || program.executingAgency || "창업진흥원"}</span>
              </div>
              <div>
                <span className="text-amber-400/90 font-bold block text-[11px]">문의처</span>
                <span className="text-slate-200 font-medium">{cleanHtml(kst(["tel_no", "cntct_no", "문의처"])) || "공고문 참조"}</span>
              </div>
            </div>
          </div>
        ) : (
          /* Bizinfo Header Banner */
          <div className="bg-gradient-to-r from-teal-950/20 via-slate-900 to-blue-950/20 border border-teal-500/20 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
            <div className="flex items-start justify-between flex-wrap gap-3 border-b border-teal-500/20 pb-4">
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-bold text-xs border border-teal-500/30">
                    🏢 기업마당 정책 지원사업
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700">
                    {program.category || "중소기업지원"}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${
                    ddayInfo.isClosed
                      ? "bg-slate-800 text-slate-400 border-slate-700"
                      : ddayInfo.isUrgent
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse"
                      : "bg-blue-500/20 text-blue-300 border-blue-500/30"
                  }`}>
                    {ddayInfo.text}
                  </span>
                </div>
                <h1 className="text-lg sm:text-2xl font-black text-slate-100 break-words leading-snug">
                  {cleanHtml(biz(["pblancNm", "사업명"])) || program.title}
                </h1>
              </div>

              {biz(["pblancUrl"])?.startsWith("http") && (
                <a
                  href={biz(["pblancUrl"])!}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 text-xs font-bold flex items-center space-x-1.5 transition-colors flex-shrink-0"
                >
                  <span>기업마당 공고 원문</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {/* 2-Column Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-[11px] text-teal-400 font-bold block">🎯 지원대상</span>
                <p className="font-medium text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {cleanHtml(biz(["trgetNm", "지원대상"])) || program.targetDescription || "공고문 참조"}
                </p>
              </div>
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-[11px] text-teal-400 font-bold block">📋 사업 개요</span>
                <div className="font-medium text-slate-300 leading-relaxed whitespace-pre-wrap max-h-[140px] overflow-y-auto custom-scrollbar">
                  {cleanHtml(biz(["bsnsSumryCn", "사업요약"])) || "공고문 전문을 참조해 주세요."}
                </div>
              </div>
            </div>

            {/* Agency and Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80">
              <div>
                <span className="text-slate-400 font-bold block text-[11px]">소관기관</span>
                <span className="text-slate-200 font-medium">{cleanHtml(biz(["jnsmAgencyNm", "소관기관"])) || program.organizer}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[11px]">신청기간</span>
                <span className="text-slate-200 font-medium">{cleanHtml(biz(["reqstBeginEndDe", "신청기간"])) || "공고문 참조"}</span>
              </div>
              <div>
                <span className="text-teal-400 font-bold block text-[11px]">신청방법</span>
                <span className="text-slate-200 font-medium">{cleanHtml(biz(["reqstMthPapersCn", "신청방법"])) || "온라인/공고문 참조"}</span>
              </div>
            </div>
          </div>
        )}

        {/* 2. Main Content Tabs Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-900/60 rounded-2xl p-1.5 text-xs font-semibold space-x-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("viewer")}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
              activeTab === "viewer"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>공고문 원문 뷰어 ({sortedDocs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("ai")}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
              activeTab === "ai"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>AI 합격 전략 리포트 {aiData ? "✨" : ""}</span>
          </button>

          <button
            onClick={() => setActiveTab("docs")}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
              activeTab === "docs"
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>첨부 서류 다운로드 ({sortedDocs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("sources")}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
              activeTab === "sources"
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <ExternalLink className="w-4 h-4" />
            <span>출처 원문 ({program.sources.length})</span>
          </button>
        </div>

        {/* 3. Tab Contents */}

        {/* TAB 1: Document Viewer (Default: 0 Cost) */}
        {activeTab === "viewer" && (
          <div className="space-y-4">
            {sortedDocs.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-4 shadow-lg">
                <FileText className="w-12 h-12 text-slate-500 mx-auto" />
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-200 text-sm">열람 가능한 첨부 문서가 아직 동기화되지 않았습니다</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    원문 공고 웹페이지에 연결하여 최신 공고문(PDF)과 신청 서식 파일을 실시간으로 검색하고 동기화합니다.
                  </p>
                </div>
                <button
                  onClick={() => fetchProgramDetail(programId)}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center space-x-2 shadow-md shadow-blue-600/30 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>공식 첨부 서류 실시간 동기화</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Document Selector Pills (PDF listed first) */}
                <div className="flex items-center justify-between flex-wrap gap-2 pb-1">
                  <div className="flex items-center space-x-2 overflow-x-auto max-w-full pb-1">
                    {sortedDocs.map((doc, idx) => {
                      const isPdf = doc.fileType?.toUpperCase() === "PDF" || doc.fileName?.toLowerCase().endsWith(".pdf");
                      const isSelected = idx === selectedDocIndex;
                      return (
                        <button
                          key={doc.id || idx}
                          onClick={() => setSelectedDocIndex(idx)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 whitespace-nowrap flex-shrink-0 cursor-pointer border ${
                            isSelected
                              ? isPdf
                                ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30"
                                : "bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30"
                              : "bg-slate-900/80 text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-extrabold ${
                              isPdf ? "bg-blue-900/80 text-blue-200" : "bg-purple-900/80 text-purple-200"
                            }`}
                          >
                            {isPdf ? "PDF 공고문" : "HWP 서식"}
                          </span>
                          <span className="truncate max-w-[220px]">{doc.fileName}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Main Viewer Canvas */}
                {currentDoc && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col min-h-[650px]">
                    {/* Viewer Header */}
                    <div className="bg-slate-950/80 px-4 py-3 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
                      <div className="flex items-center space-x-2 min-w-0">
                        <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        <span className="font-bold text-slate-200 truncate max-w-md">{currentDoc.fileName}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {isCurrentPdf && (
                          <a
                            href={`/api/download?url=${encodeURIComponent(
                              currentDoc.fileUrl
                            )}&filename=${encodeURIComponent(currentDoc.fileName)}&view=true`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center space-x-1 font-semibold"
                            title="새 창으로 크게 보기"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                            <span>새 창 열기</span>
                          </a>
                        )}

                        <a
                          href={`/api/download?url=${encodeURIComponent(
                            currentDoc.fileUrl
                          )}&filename=${encodeURIComponent(currentDoc.fileName)}`}
                          download={currentDoc.fileName}
                          className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors flex items-center space-x-1 shadow-md shadow-blue-600/20"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>원본 다운로드</span>
                        </a>
                      </div>
                    </div>

                    {/* Viewer Body: PDF Iframe or HWP Formatted Text */}
                    <div className="flex-1 bg-slate-950 p-1 flex flex-col min-h-[600px]">
                      {isCurrentPdf ? (
                        <iframe
                          src={`/api/download?url=${encodeURIComponent(
                            currentDoc.fileUrl
                          )}&filename=${encodeURIComponent(currentDoc.fileName)}&view=true`}
                          className="w-full flex-1 min-h-[650px] rounded-xl border-0 bg-slate-900"
                          title={currentDoc.fileName}
                        />
                      ) : (
                        /* HWP Text Formatted Reader */
                        <div className="flex-1 p-6 text-slate-300 space-y-4 max-h-[650px] overflow-y-auto custom-scrollbar">
                          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                            <span>💡 한글(HWP) 파일 텍스트 추출본입니다. 표/서식 작성은 상단 [원본 다운로드] 후 한글 오피스에서 직접 진행해 주세요.</span>
                          </div>
                          <div className="font-mono text-xs whitespace-pre-wrap leading-relaxed select-text bg-slate-900/40 p-6 rounded-xl border border-slate-800/80">
                            {currentDoc.extractedText || "문서 텍스트를 불러올 수 없습니다. 상단 [원본 다운로드] 버튼을 눌러 확인해 주세요."}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: AI Deep Analysis & 3-Step Strategy (On-Demand) */}
        {activeTab === "ai" && (
          <div className="space-y-6">
            {/* Error Notice */}
            {analysisError && (
              <div className="bg-rose-950/40 border border-rose-500/40 p-4 rounded-2xl flex items-center justify-between gap-3 text-rose-300">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{analysisError}</span>
                </div>
                <button
                  onClick={handleRunLiveAnalysis}
                  disabled={isAnalyzing}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
                >
                  다시 시도
                </button>
              </div>
            )}

            {!aiData ? (
              /* Unanalyzed Empty State - CTA Button */
              <div className="bg-gradient-to-br from-indigo-950/40 via-purple-950/30 to-slate-900 p-8 sm:p-12 rounded-2xl border border-indigo-500/30 text-center space-y-5 shadow-2xl">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/20">
                  <Sparkles className="w-7 h-7 text-indigo-400 animate-pulse" />
                </div>
                <div className="space-y-2 max-w-lg mx-auto">
                  <h3 className="font-bold text-slate-100 text-base sm:text-lg">
                    아직 AI 합격 전략 리포트가 생성되지 않았습니다
                  </h3>
                  <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                    공고문 전문과 첨부 서류를 Gemini AI로 정밀 분석하여 <strong>합격 공략 3-Step 브리핑, 배점표 심사 기준, 필수 제출 서류 체크리스트, 가점 확보 요건</strong>을 즉시 도출합니다.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleRunLiveAnalysis}
                    disabled={isAnalyzing}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-black text-sm shadow-xl shadow-indigo-600/30 transition-all flex items-center space-x-2 mx-auto cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className={`w-4 h-4 ${isAnalyzing ? "animate-spin" : ""}`} />
                    <span>{isAnalyzing ? "Gemini AI가 정밀 분석 중입니다..." : "AI 합격 전략 리포트 지금 분석하기"}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Analyzed Strategy Report */
              <div className="space-y-6">
                {/* Header & Controls */}
                <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900 p-5 rounded-2xl border border-indigo-500/30 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center space-x-3">
                    <Sparkles className="w-6 h-6 text-indigo-400" />
                    <div>
                      <h3 className="font-bold text-base text-indigo-200">Gemini AI 정밀 합격 전략 리포트</h3>
                      <p className="text-xs text-slate-400">공고문 팩트 기반 합격 대응 가이드라인</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleStartMatching()}
                      disabled={isMatching}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs transition-all flex items-center space-x-1.5 shadow-md shadow-blue-600/30 cursor-pointer"
                    >
                      <Building2 className={`w-3.5 h-3.5 ${isMatching ? "animate-spin" : "text-amber-300"}`} />
                      <span>{isMatching ? "적합도 분석 중..." : "내 기업 적합도 진단"}</span>
                    </button>
                    <button
                      onClick={handleRunLiveAnalysis}
                      disabled={isAnalyzing}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-xs transition-all flex items-center space-x-1.5 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? "animate-spin" : ""}`} />
                      <span>{isAnalyzing ? "분석 중..." : "AI 재분석"}</span>
                    </button>
                  </div>
                </div>

                {/* Company Matching Gates */}
                {gateState === "unauthenticated" && (
                  <div className="bg-slate-900 border border-blue-500/40 p-4 rounded-2xl flex items-center justify-between gap-3 text-slate-200">
                    <div className="flex items-center space-x-3">
                      <Lock className="w-5 h-5 text-blue-400 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-xs text-white">로그인이 필요한 서비스입니다</p>
                        <p className="text-[11px] text-slate-400">기업 정보 기반 맞춤 적합도 분석을 위해 먼저 로그인해주세요.</p>
                      </div>
                    </div>
                    <Link
                      href="/login"
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                    >
                      로그인
                    </Link>
                  </div>
                )}

                {matchingResult && (
                  <div className="bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/40 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800/80 pb-3">
                      <div className="flex items-center space-x-3">
                        <TrendingUp className="w-6 h-6 text-indigo-300" />
                        <div>
                          <span className="font-bold text-sm text-white">내 기업 맞춤 적합도 진단 결과</span>
                          <p className="text-xs text-slate-400">등록된 기업 프로필 기준 심사 적합도</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 bg-slate-950/80 px-4 py-2 rounded-xl border border-indigo-500/30">
                        <span className="text-xs text-slate-400">종합 점수</span>
                        <span className="text-xl font-black text-indigo-300">{matchingResult.totalScore ?? 0}점</span>
                      </div>
                    </div>
                    {matchingResult.recommendation && (
                      <p className="text-xs text-slate-200 bg-indigo-950/30 p-3.5 rounded-xl border border-indigo-500/20 leading-relaxed">
                        💡 {matchingResult.recommendation}
                      </p>
                    )}
                  </div>
                )}

                {/* 1. Organizer & Program Nature Strategic Analysis Card */}
                {aiData.organizerStrategy && (
                  <div className="bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-900 border border-blue-500/30 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between flex-wrap gap-2 border-b border-blue-500/20 pb-3">
                      <div className="flex items-center space-x-2.5">
                        <Building2 className="w-5 h-5 text-blue-400" />
                        <h4 className="font-bold text-slate-100 text-sm">
                          주관·수행기관 성격 및 정책 의도 분석
                        </h4>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/30">
                        {aiData.organizerStrategy.programNature || "정책 맞춤형 지원사업"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-1.5">
                        <span className="text-blue-400 font-bold block text-[11px]">🎯 기관 핵심 요구 성과지표 (KPI)</span>
                        <p className="text-slate-200 leading-relaxed font-medium">
                          {aiData.organizerStrategy.coreObjective || "사업화 실적 및 고용/매출 증대 목표 명확화"}
                        </p>
                      </div>
                      <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-1.5">
                        <span className="text-amber-400 font-bold block text-[11px]">💡 심사위원 관점 제안서 작성 방향</span>
                        <p className="text-slate-200 leading-relaxed font-medium">
                          {aiData.organizerStrategy.strategyTip || "주관기관의 설립 목적에 부합하는 문제 해결형 제안 구성"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. AI 3-Step Pass Strategy Briefing */}
                {aiData.summaryReport && Array.isArray(aiData.summaryReport) && (
                  <div className="bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-5 sm:p-6 space-y-3 shadow-lg">
                    <h4 className="font-bold text-indigo-300 text-sm flex items-center space-x-2">
                      <Award className="w-4 h-4 text-indigo-400" />
                      <span>AI 맞춤형 3-Step 합격 공략 로드맵</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                      {aiData.summaryReport.map((sentence: string, idx: number) => (
                        <div key={idx} className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                          <div>
                            <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-extrabold text-[10px] w-fit inline-block mb-1.5 border border-indigo-500/30">
                              STEP 0{idx + 1}
                            </span>
                            <p className="text-xs text-slate-200 leading-relaxed font-medium">{sentence}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Evaluation Scoring Rubric (배점표 공략) */}
                {aiData.evaluationCriteria && (
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-lg">
                    <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-3">
                      <h4 className="font-bold text-slate-100 text-sm flex items-center space-x-2">
                        <Scale className="w-4 h-4 text-blue-400" />
                        <span>심사위원 평가 기준 & 세부 배점표 공략</span>
                      </h4>
                      {aiData.evaluationCriteria.steps && aiData.evaluationCriteria.steps.length > 0 && (
                        <div className="flex items-center space-x-1.5 overflow-x-auto text-[11px]">
                          {aiData.evaluationCriteria.steps.map((step: string, sIdx: number) => (
                            <div key={sIdx} className="flex items-center space-x-1 flex-shrink-0">
                              <span className="px-2.5 py-1 rounded-lg bg-blue-600/20 text-blue-300 border border-blue-500/30 font-bold">
                                {step}
                              </span>
                              {sIdx < aiData.evaluationCriteria.steps.length - 1 && <span className="text-slate-600">➔</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {aiData.evaluationCriteria.summary && (
                      <p className="text-xs text-slate-300 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 leading-relaxed">
                        {aiData.evaluationCriteria.summary}
                      </p>
                    )}

                    {/* Detailed Scoring Rubric Cards */}
                    {Array.isArray(aiData.evaluationCriteria.items) && aiData.evaluationCriteria.items.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                        {aiData.evaluationCriteria.items.map((item: any, rIdx: number) => {
                          const isObj = typeof item === "object" && item !== null;
                          const category = isObj ? item.category || `평가항목 ${rIdx + 1}` : item;
                          const scoreWeight = isObj ? item.scoreWeight : "배점 공략";
                          const focus = isObj ? item.evaluationFocus : null;
                          const strategy = isObj ? item.writingStrategy : null;

                          return (
                            <div key={rIdx} className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2.5 flex flex-col justify-between">
                              <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                                <span className="font-bold text-slate-100 text-xs truncate">{category}</span>
                                {scoreWeight && (
                                  <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 font-extrabold text-[10px] border border-blue-500/30 flex-shrink-0">
                                    {scoreWeight}
                                  </span>
                                )}
                              </div>
                              {focus && (
                                <div className="text-[11px] text-slate-300 space-y-1">
                                  <strong className="text-amber-400/90 font-bold block text-[10px]">🎯 심사위원 착안점</strong>
                                  <p className="leading-relaxed">{focus}</p>
                                </div>
                              )}
                              {strategy && (
                                <div className="text-[11px] text-slate-200 bg-indigo-950/30 p-2.5 rounded-lg border border-indigo-500/20 space-y-0.5">
                                  <strong className="text-indigo-300 font-bold block text-[10px]">✍️ 고득점 작성 전략</strong>
                                  <p className="leading-relaxed">{strategy}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Extra Points & Disqualification Exclusions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Extra Points */}
                  {aiData.extraPoints && Array.isArray(aiData.extraPoints.items) && aiData.extraPoints.items.length > 0 && (
                    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
                      <h4 className="font-bold text-slate-100 text-sm flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span>가점 및 우선선정 우대 요건</span>
                      </h4>
                      <div className="space-y-2">
                        {aiData.extraPoints.items.map((pt: string, pIdx: number) => (
                          <div key={pIdx} className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-start space-x-2 text-xs">
                            <span className="text-amber-400 font-bold">★</span>
                            <span className="text-slate-200 leading-tight">{pt}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Exclusions */}
                  {aiData.excludedConditions && Array.isArray(aiData.excludedConditions.items) && aiData.excludedConditions.items.length > 0 && (
                    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
                      <h4 className="font-bold text-slate-100 text-sm flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        <span>행정 탈락 방지 (신청 제외 결격 요건)</span>
                      </h4>
                      <div className="space-y-2">
                        {aiData.excludedConditions.items.map((ex: string, eIdx: number) => (
                          <div key={eIdx} className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-start space-x-2 text-xs">
                            <span className="text-rose-400 font-bold">✕</span>
                            <span className="text-slate-300 leading-tight">{ex}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. Required Documents Checklist */}
                {aiData.requiredDocuments && Array.isArray(aiData.requiredDocuments) && aiData.requiredDocuments.length > 0 && (
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-3 shadow-lg">
                    <h4 className="font-bold text-slate-100 text-sm flex items-center space-x-2">
                      <FileCheck className="w-4 h-4 text-emerald-400" />
                      <span>필수 제출 서류 체크리스트 ({aiData.requiredDocuments.length}종)</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {aiData.requiredDocuments.map((doc: string, dIdx: number) => (
                        <div key={dIdx} className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-start space-x-2.5 text-xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span className="text-slate-200 font-medium">{doc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Direct Attachment Downloads */}
        {activeTab === "docs" && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-slate-200 text-sm">공식 첨부 서류 다운로드</h3>
            {sortedDocs.length === 0 ? (
              <p className="text-xs text-slate-500">등록된 첨부 서류가 없습니다.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sortedDocs.map((doc, idx) => (
                  <div key={doc.id || idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2.5 truncate mr-2">
                      <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      <span className="font-semibold text-slate-200 truncate">{doc.fileName}</span>
                    </div>
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      download={doc.fileName}
                      className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition-colors flex items-center space-x-1 flex-shrink-0 font-bold"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>다운로드</span>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Original Sources */}
        {activeTab === "sources" && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-slate-200 text-sm">공공기관 원문 출처 링크</h3>
            <div className="space-y-3">
              {program.sources.map((src, idx) => (
                <div key={src.id ? `${src.id}-${idx}` : idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {src.sourceType}
                      </span>
                      <span className="font-semibold text-slate-200">{src.rawTitle}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate max-w-xl">{src.sourceUrl}</p>
                  </div>
                  <a
                    href={src.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center space-x-1 flex-shrink-0 font-bold"
                  >
                    <span>원문 열기</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />

      {/* Company Profile Register Modal */}
      {showCompanyModal && (
        <CompanyProfileModal
          isOpen={showCompanyModal}
          onClose={() => setShowCompanyModal(false)}
          onSaved={(savedComp) => {
            setUserCompany(savedComp);
            setShowCompanyModal(false);
            handleStartMatching(savedComp);
          }}
        />
      )}
    </div>
  );
}
