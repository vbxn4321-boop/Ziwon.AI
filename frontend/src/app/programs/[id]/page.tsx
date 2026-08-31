"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  AlertTriangle,
  RefreshCw,
  Eye,
  Sparkles,
  FileText,
  ExternalLink,
} from "lucide-react";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";
import { SupportProgram } from "@/components/ProgramCard";
import { getJwtToken } from "@/lib/supabase-client";
import { fetchMyCompany, fetchMyBookmarks, toggleBookmarkOnBackend } from "@/lib/backend-client";
import CompanyProfileModal from "@/components/auth/CompanyProfileModal";

// Modularized Sub-Components & Helpers
import { getDDay } from "@/components/program-detail/detail-helpers";
import { ProgramHeader } from "@/components/program-detail/ProgramHeader";
import { ProgramSummaryCard } from "@/components/program-detail/ProgramSummaryCard";
import { NoticeOriginalTab } from "@/components/program-detail/NoticeOriginalTab";
import { AiStrategyTab } from "@/components/program-detail/AiStrategyTab";
import { DocumentsTab } from "@/components/program-detail/DocumentsTab";
import { RawSourceTab } from "@/components/program-detail/RawSourceTab";

export default function ProgramDetailPage() {
  const params = useParams();
  const router = useRouter();
  const programId = params?.id as string;

  const [program, setProgram] = useState<SupportProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Tab: 'viewer' | 'ai' | 'docs' | 'sources'
  const [activeTab, setActiveTab] = useState<"viewer" | "ai" | "docs" | "sources">("viewer");
  const [selectedDocIndex, setSelectedDocIndex] = useState<number>(0);

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

  // UI helpers
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

  const isKst = program?.sources?.some((s) => s.sourceType === "K_STARTUP") || false;
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
    } catch {
      setAnalysisError("AI 분석 서버와의 통신에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // AI Matching Trigger
  const handleStartMatching = async (companyOverride?: any) => {
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
      } catch {
        comp = null;
      }
    }

    if (!comp || !comp.name) {
      setGateState("no_company");
      setShowCompanyModal(true);
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
        setAnalysisError(json.error || "적합도 분석에 실패했습니다.");
      }
    } catch {
      setAnalysisError("적합도 분석 중 통신 오류가 발생했습니다.");
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
      <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col">
        <Header />
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
          <div className="text-center space-y-4">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-slate-500 text-sm font-medium">공고 원문 및 문서를 안전하게 불러오는 중입니다...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Error State
  if (error || !program) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col">
        <Header />
        <main className="flex-1 max-w-4xl w-full mx-auto p-6 flex items-center justify-center">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4 max-w-md w-full shadow-sm">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
            <h2 className="text-lg font-bold text-slate-900">공고를 찾을 수 없습니다</h2>
            <p className="text-sm text-slate-500">{error || "삭제되었거나 존재하지 않는 공고 ID입니다."}</p>
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-bold text-white transition-all inline-flex items-center space-x-1.5 shadow-sm cursor-pointer"
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
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation Breadcrumb & Action Bar */}
        <ProgramHeader
          program={program}
          onBack={() => router.back()}
          onShare={handleShareUrl}
          shareToast={shareToast}
          isBookmarked={isBookmarked}
          bookmarkLoading={bookmarkLoading}
          onToggleBookmark={handleToggleBookmark}
        />

        {/* 1. Main Notice Info Banner */}
        <ProgramSummaryCard
          program={program}
          isKst={isKst}
          ddayInfo={ddayInfo}
          kst={kst}
          biz={biz}
        />

        {/* 2. Main Content Tabs Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-100 rounded-2xl p-1.5 text-xs font-semibold space-x-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("viewer")}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
              activeTab === "viewer"
                ? "bg-white text-slate-900 shadow-xs font-bold border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Eye className="w-4 h-4 text-blue-600" />
            <span>공고문 원문 뷰어 ({sortedDocs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("ai")}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
              activeTab === "ai"
                ? "bg-white text-slate-900 shadow-xs font-bold border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>AI 합격 전략 리포트 {aiData ? "✨" : ""}</span>
          </button>

          <button
            onClick={() => setActiveTab("docs")}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
              activeTab === "docs"
                ? "bg-white text-slate-900 shadow-xs font-bold border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileText className="w-4 h-4 text-slate-500" />
            <span>첨부 서류 다운로드 ({sortedDocs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("sources")}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
              activeTab === "sources"
                ? "bg-white text-slate-900 shadow-xs font-bold border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ExternalLink className="w-4 h-4 text-slate-500" />
            <span>출처 원문 ({program.sources.length})</span>
          </button>
        </div>

        {/* 3. Tab Contents */}
        {activeTab === "viewer" && (
          <NoticeOriginalTab
            sortedDocs={sortedDocs}
            selectedDocIndex={selectedDocIndex}
            setSelectedDocIndex={setSelectedDocIndex}
            onRefresh={() => fetchProgramDetail(programId)}
          />
        )}

        {activeTab === "ai" && (
          <AiStrategyTab
            aiData={aiData}
            analysisError={analysisError}
            isAnalyzing={isAnalyzing}
            onRunLiveAnalysis={handleRunLiveAnalysis}
            gateState={gateState}
            isMatching={isMatching}
            matchingResult={matchingResult}
            onStartMatching={() => handleStartMatching()}
          />
        )}

        {activeTab === "docs" && <DocumentsTab sortedDocs={sortedDocs} />}

        {activeTab === "sources" && <RawSourceTab sources={program.sources} />}
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
