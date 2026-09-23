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
import { useProgramDetail } from "@/features/program-detail/hooks/useProgramDetail";
import { getJwtToken } from "@/lib/supabase-client";
import { fetchMyCompany, fetchMyBookmarks, toggleBookmarkOnBackend } from "@/lib/backend-client";
import CompanyProfileModal from "@/components/auth/CompanyProfileModal";
import LoginPromptModal from "@/components/auth/LoginPromptModal";

// Modularized Sub-Components & Helpers
import { getDDay } from "@/features/program-detail/components/detail-helpers";
import { ProgramHeader } from "@/features/program-detail/components/ProgramHeader";
import { AnalysisGateModal } from "@/features/program-detail/components/AnalysisGateModal";
import { ProgramSummaryCard } from "@/features/program-detail/components/ProgramSummaryCard";
import { NoticeOriginalTab } from "@/features/program-detail/components/NoticeOriginalTab";
import { AiStrategyTab } from "@/features/program-detail/components/AiStrategyTab";
import { DocumentsTab } from "@/features/program-detail/components/DocumentsTab";
import { RawSourceTab } from "@/features/program-detail/components/RawSourceTab";

export default function ProgramDetailPage() {
  const params = useParams();
  const router = useRouter();
  const programId = params?.id as string;

  const { program, loading, error, detailsLoading, detailsError, loadDetails } = useProgramDetail(programId);

  // Active Tab: 'viewer' | 'ai' | 'docs' | 'sources'
  const [activeTab, setActiveTab] = useState<"viewer" | "ai" | "docs" | "sources">("viewer");
  const [selectedDocIndex, setSelectedDocIndex] = useState<number>(0);

  // AI Deep Analysis
  const [liveAnalysis, setLiveAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // 계획서 작성 게이트: 이 계정이 이 공고의 AI 분석을 열었는지 확인한 결과
  const [planGateChecking, setPlanGateChecking] = useState(false);
  const [planGate, setPlanGate] = useState<{ isOpen: boolean; hasAnalysis: boolean }>({
    isOpen: false,
    hasAnalysis: false,
  });
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

  // Login Conversion Prompt Modal State
  const [loginPromptState, setLoginPromptState] = useState<{
    isOpen: boolean;
    title?: string;
    subtitle?: string;
    featureBadge?: string;
  }>({ isOpen: false });

  // UI helpers
  const [shareToast, setShareToast] = useState(false);

  // Auth State
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const syncAuth = async () => {
    const token = await getJwtToken();
    setIsLoggedIn(!!token);
    if (token) {
      try {
        const comp = await fetchMyCompany(token);
        setUserCompany(comp);
      } catch {}
    }
  };

  useEffect(() => {
    syncAuth();
    const handleAuthChange = () => syncAuth();
    window.addEventListener("ziwon_auth_change", handleAuthChange);
    return () => {
      window.removeEventListener("ziwon_auth_change", handleAuthChange);
    };
  }, []);

  // Initial Fetch
  useEffect(() => {
    if (programId) {
      setLiveAnalysis(null);
      setSelectedDocIndex(0);
      setActiveTab("viewer");
      checkBookmarkStatus(programId);
    }
  }, [programId]);

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

  const checkIsLoggedIn = async (): Promise<string | null> => {
    return await getJwtToken();
  };

  const handleToggleBookmark = async () => {
    try {
      setBookmarkLoading(true);
      const token = await checkIsLoggedIn();
      if (!token) {
        setLoginPromptState({
          isOpen: true,
          title: "관심 공고를 찜하고 마감 알림을 받아보세요",
          subtitle: "로그인하시면 마감 D-Day 알림 및 맞춤형 지원사업 변경 소식을 실시간으로 확인하실 수 있습니다.",
          featureBadge: "관심 공고 찜하기",
        });
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
    const token = await checkIsLoggedIn();
    if (!token) {
      setLoginPromptState({
        isOpen: true,
        title: "AI 심층 합격 전략은 회원 전용 혜택이에요",
        subtitle: "3초 간편 로그인 후 이 공고의 HWP 첨부 서식 분석과 3-Step 합격 공략 리포트를 바로 확인해 보세요.",
        featureBadge: "AI 핵심 합격 분석",
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const res = await fetch(`/api/support-programs/${program.id}/analyze`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
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

  /** 계획서 작성 화면으로 이동. editorOnly 면 챗봇 없이 에디터만 연다. */
  const goToPlanEditor = (editorOnly: boolean) => {
    if (!program) return;
    const q = new URLSearchParams({ targetTitle: program.title, programId: program.id });
    if (editorOnly) q.set("editorOnly", "1");
    router.push(`/consultant?${q.toString()}`);
  };

  /**
   * 계획서 작성 버튼. 이 계정이 이 공고의 AI 분석을 열어 뒀는지 먼저 확인한다.
   * 열려 있으면 그대로 넘기고, 아니면 무엇을 포기하는지 알리고 선택을 받는다.
   */
  const handleWritePlan = async () => {
    if (!program) return;
    const token = await checkIsLoggedIn();
    if (!token) {
      setLoginPromptState({
        isOpen: true,
        title: "사업계획서 작성은 회원 전용이에요",
        subtitle: "3초 간편 로그인 후 이 공고의 서식에 맞춘 AI 사업계획서 작성을 시작해 보세요.",
        featureBadge: "AI 사업계획서 작성",
      });
      return;
    }

    setPlanGateChecking(true);
    try {
      const res = await fetch(`/api/support-programs/${program.id}/analysis-access`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (json?.unlocked) {
        goToPlanEditor(false);
        return;
      }
      setPlanGate({ isOpen: true, hasAnalysis: Boolean(json?.hasAnalysis) });
    } catch {
      // 확인 자체가 실패했다고 작성을 막을 이유는 없다. 에디터로 보낸다.
      goToPlanEditor(true);
    } finally {
      setPlanGateChecking(false);
    }
  };

  /** 모달의 "지금 분석하기". 분석이 끝나면 그대로 계획서로 넘어간다. */
  const handleAnalyzeThenWrite = async () => {
    if (!program) return;
    const token = await checkIsLoggedIn();
    if (!token) return;

    setIsAnalyzing(true);
    try {
      const res = await fetch(`/api/support-programs/${program.id}/analyze`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (json?.success) {
        setPlanGate({ isOpen: false, hasAnalysis: true });
        goToPlanEditor(false);
      } else {
        setPlanGate({ isOpen: false, hasAnalysis: false });
        setAnalysisError(json?.error || "AI 분석에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      }
    } catch {
      setPlanGate({ isOpen: false, hasAnalysis: false });
      setAnalysisError("AI 분석 서버와의 통신에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // AI Matching Trigger
  const handleStartMatching = async (companyOverride?: any) => {
    setGateState(null);

    const token = await checkIsLoggedIn();
    if (!token) {
      setLoginPromptState({
        isOpen: true,
        title: "내 기업 맞춤 1:1 적합도 분석",
        subtitle: "로그인 후 내 기업 정보(업력/소재지/매출)와 이 공고의 지원 자격을 1초 만에 비교 채점해 드립니다.",
        featureBadge: "1:1 맞춤 적합도 분석",
      });
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
          onWritePlan={handleWritePlan}
          planGateChecking={planGateChecking}
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
            <span>공고문 원문 뷰어 ({detailsLoading ? "…" : sortedDocs.length})</span>
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
            <span>AI 합격 전략 리포트 {aiData ? "" : ""}</span>
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
            <span>첨부 서류 다운로드 ({detailsLoading ? "…" : sortedDocs.length})</span>
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

        {/* Attachment loading never hides the summary above. */}
        {detailsLoading && (
          <div role="status" className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-3" />
            첨부 문서와 분석 정보를 불러오는 중입니다.
          </div>
        )}
        {detailsError && (
          <div role="alert" className="bg-white border border-amber-200 rounded-2xl p-6 text-sm text-slate-600">
            <p>{detailsError}</p>
            <button onClick={() => void loadDetails()} className="mt-3 text-blue-600 font-bold">다시 불러오기</button>
          </div>
        )}
        {activeTab === "viewer" && !detailsLoading && !detailsError && (
          <NoticeOriginalTab
            sortedDocs={sortedDocs}
            selectedDocIndex={selectedDocIndex}
            setSelectedDocIndex={setSelectedDocIndex}
            onRefresh={() => void loadDetails(true)}
          />
        )}

        {activeTab === "ai" && !detailsLoading && !detailsError && (
          <AiStrategyTab
            aiData={aiData}
            analysisError={analysisError}
            isAnalyzing={isAnalyzing}
            onRunLiveAnalysis={handleRunLiveAnalysis}
            gateState={gateState}
            isMatching={isMatching}
            matchingResult={matchingResult}
            onStartMatching={() => handleStartMatching()}
            isLoggedIn={isLoggedIn}
            onPromptLogin={() =>
              setLoginPromptState({
                isOpen: true,
                title: "AI 심층 합격 전략은 회원 전용 혜택이에요",
                subtitle:
                  "3초 간편 로그인 후 이 공고의 HWP 첨부 서식 분석과 3-Step 합격 공략 리포트를 바로 확인해 보세요.",
                featureBadge: "AI 핵심 합격 분석",
              })
            }
          />
        )}

        {activeTab === "docs" && !detailsLoading && !detailsError && <DocumentsTab sortedDocs={sortedDocs} programTitle={program.title} />}

        {activeTab === "sources" && !detailsLoading && !detailsError && <RawSourceTab sources={program.sources} />}
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

      {/* Login Conversion Modal */}
      <AnalysisGateModal
        isOpen={planGate.isOpen}
        programTitle={program.title}
        hasAnalysis={planGate.hasAnalysis}
        isAnalyzing={isAnalyzing}
        onAnalyze={handleAnalyzeThenWrite}
        onProceedEditorOnly={() => {
          setPlanGate({ isOpen: false, hasAnalysis: false });
          goToPlanEditor(true);
        }}
        onClose={() => setPlanGate({ isOpen: false, hasAnalysis: false })}
      />

      <LoginPromptModal
        isOpen={loginPromptState.isOpen}
        onClose={() => setLoginPromptState((prev) => ({ ...prev, isOpen: false }))}
        title={loginPromptState.title}
        subtitle={loginPromptState.subtitle}
        featureBadge={loginPromptState.featureBadge}
        redirectUrl={`/programs/${programId}`}
      />
    </div>
  );
}
