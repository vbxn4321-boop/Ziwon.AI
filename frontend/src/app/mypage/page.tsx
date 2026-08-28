"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  FileText,
  Bookmark,
  Award,
  Calendar,
  DollarSign,
  Users,
  Briefcase,
  MapPin,
  TrendingUp,
  Trash2,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Eye,
  Check,
  ChevronRight,
  ShieldCheck,
  Zap,
  Info,
  Layers,
  HelpCircle,
  BadgeCheck,
  Flame,
  FileCheck2,
  Globe2,
  Edit3,
  X,
  Lock,
} from "lucide-react";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";
import { ProgramDetailModal } from "@/components/ProgramDetailModal";
import { SupportProgram } from "@/components/ProgramCard";
import {
  fetchMyProfile,
  fetchMyCompany,
  saveMyCompany,
  fetchMyPlans,
  deletePlanFromBackend,
  fetchMyBookmarks,
  toggleBookmarkOnBackend,
} from "@/lib/backend-client";
import { getJwtToken } from "@/lib/supabase-client";

// Format Korean Won currency into readable text (e.g. 150000000 -> "1억 5,000만 원")
function formatKoreanCurrency(amountStr: string): string {
  if (!amountStr) return "";
  const num = parseFloat(amountStr.replace(/[^0-9.]/g, ""));
  if (isNaN(num) || num <= 0) return "";

  const eok = Math.floor(num / 100000000);
  const man = Math.floor((num % 100000000) / 10000);
  const won = Math.floor(num % 10000);

  let result = "";
  if (eok > 0) result += `${eok}억 `;
  if (man > 0) result += `${man.toLocaleString()}만 `;
  if (won > 0 && eok === 0 && man === 0) result += `${won.toLocaleString()} `;
  result += "원";
  return result.trim();
}

// Calculate Company Stage Track according to Ministry of SMEs & Startups criteria
function getStartupStageTrack(foundedDateStr?: string) {
  if (!foundedDateStr) {
    return {
      trackName: "창업 준비 및 예비 단계",
      badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      description: "예비창업패키지, 창업중심대학(예비) 등 창업 전 단계 최적",
      years: 0,
      months: 0,
    };
  }

  const founded = new Date(foundedDateStr);
  const now = new Date();
  const diffTime = now.getTime() - founded.getTime();
  if (diffTime < 0) {
    return {
      trackName: "예비창업자",
      badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      description: "설립 예정 또는 예비 창업 단계",
      years: 0,
      months: 0,
    };
  }

  const totalMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30.4375));
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  if (years < 3) {
    return {
      trackName: `초기 창업 기업 (${years}년 ${months}개월)`,
      badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      description: "초기창업패키지, 창업성장 디딤돌 R&D, 청년창업사관학교 최적",
      years,
      months,
    };
  } else if (years < 7) {
    return {
      trackName: `창업 도약 기업 (${years}년 ${months}개월)`,
      badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
      description: "창업도약패키지, TIPS 스케일업, 스케일업 R&D 최적",
      years,
      months,
    };
  } else {
    return {
      trackName: `중소/성장 기업 (${years}년 ${months}개월)`,
      badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
      description: "중소기업 R&D 혁신바우처, 스마트제조혁신, 수출바우처 최적",
      years,
      months,
    };
  }
}

// Calculate Company Profile Completion Rate & Missing Items Checklist
function getProfileCompletionDetail(comp: any) {
  let score = 0;
  const missingItems: string[] = [];

  if (comp.name && comp.name.trim()) score += 20;
  else missingItems.push("기업명/예비창업자명");

  if (comp.bizRegNo && comp.bizRegNo.trim()) score += 15;
  else missingItems.push("사업자등록번호");

  if (comp.industry && comp.industry.trim()) score += 15;
  else missingItems.push("산업 분야/업종");

  if (comp.region && comp.region.trim()) score += 10;
  else missingItems.push("소재지 지역");

  if (comp.foundedDate) score += 15;
  else missingItems.push("설립연월일(업력)");

  if (comp.revenue !== undefined && comp.revenue !== null && comp.revenue !== "") score += 10;
  else missingItems.push("연간 매출액");

  if (comp.coreItemSummary && comp.coreItemSummary.trim().length >= 10) score += 15;
  else missingItems.push("핵심 아이템 상세 설명");

  return {
    score: Math.min(100, score),
    missingItems,
  };
}

const POPULAR_INDUSTRIES = [
  "생성형 AI & B2B SaaS",
  "스마트팜 & 애그리테크",
  "바이오 & 헬스케어",
  "친환경 · 에너지 · ESG",
  "반도체 & 딥테크",
  "이커머스 & 물류",
  "로봇 & 자율주행",
  "에듀테크 & 지식서비스",
  "핀테크 & 웹3",
];

export default function MyPage() {
  const router = useRouter();

  // Auth & User State
  const [authChecking, setAuthChecking] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"company" | "plans" | "bookmarks">("company");

  // Edit Mode Lock State (Default: Read-Only View Mode)
  const [isEditingCompany, setIsEditingCompany] = useState(false);

  // Backup of Saved Company Data for Rollback / View Mode
  const [savedCompanyData, setSavedCompanyData] = useState<any>(null);

  // Company Form State
  const [name, setName] = useState("");
  const [bizRegNo, setBizRegNo] = useState("");
  const [industry, setIndustry] = useState("");
  const [region, setRegion] = useState("서울특별시");
  const [foundedDate, setFoundedDate] = useState("");
  const [revenue, setRevenue] = useState<string>("");
  const [employeeCount, setEmployeeCount] = useState<number>(1);
  const [hasPatents, setHasPatents] = useState(false);
  const [hasCertifications, setHasCertifications] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [coreItemSummary, setCoreItemSummary] = useState("");

  // Data Lists
  const [plans, setPlans] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);

  // Direct In-Page Program Detail Modal State
  const [selectedProgramForModal, setSelectedProgramForModal] = useState<SupportProgram | null>(null);
  const [programModalLoading, setProgramModalLoading] = useState(false);

  // Loading & Alert States
  const [loadingData, setLoadingData] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Populate form with company object
  const applyCompanyToForm = (comp: any) => {
    if (!comp) return;
    setSavedCompanyData(comp);
    setName(comp.name || "");
    setBizRegNo(comp.bizRegNo || "");
    setIndustry(comp.industry || "");
    setRegion(comp.region || "서울특별시");
    setFoundedDate(comp.foundedDate ? comp.foundedDate.substring(0, 10) : "");
    setRevenue(comp.revenue !== null && comp.revenue !== undefined ? String(comp.revenue) : "");
    setEmployeeCount(comp.employeeCount || 1);
    setHasPatents(comp.hasPatents || false);
    setHasCertifications(comp.hasCertifications || false);
    setIsExporting(comp.isExporting || false);
    setCoreItemSummary(comp.coreItemSummary || "");
  };

  // 1. Auth Guard & Initial Load
  useEffect(() => {
    const initAuth = async () => {
      setAuthChecking(true);
      const jwt = await getJwtToken();
      if (!jwt) {
        router.replace("/login");
        return;
      }
      setToken(jwt);

      const localUserStr = typeof window !== "undefined" ? localStorage.getItem("ziwon_auth_user") : null;
      if (localUserStr) {
        try {
          setUser(JSON.parse(localUserStr));
        } catch {}
      }

      await loadAllData(jwt);
      setAuthChecking(false);
    };

    initAuth();
  }, [router]);

  const loadAllData = async (authToken: string) => {
    setLoadingData(true);
    setErrorMsg(null);
    try {
      const [compRes, plansRes, bookmarksRes] = await Promise.allSettled([
        fetchMyCompany(authToken),
        fetchMyPlans(authToken),
        fetchMyBookmarks(authToken),
      ]);

      if (compRes.status === "fulfilled" && compRes.value) {
        applyCompanyToForm(compRes.value);
        // If user already has a company registered, stay in read-only view mode
        setIsEditingCompany(false);
      } else {
        // If brand new user with no company data, open edit mode by default
        setIsEditingCompany(true);
      }

      if (plansRes.status === "fulfilled") {
        setPlans(plansRes.value || []);
      }

      if (bookmarksRes.status === "fulfilled") {
        setBookmarks(bookmarksRes.value || []);
      }
    } catch (err: any) {
      console.warn("MyPage data loading warning:", err);
    } finally {
      setLoadingData(false);
    }
  };

  // Cancel edit and rollback to saved data
  const handleCancelEdit = () => {
    if (savedCompanyData) {
      applyCompanyToForm(savedCompanyData);
      setIsEditingCompany(false);
    } else {
      setIsEditingCompany(false);
    }
    setErrorMsg(null);
  };

  // 2. Save Company Profile Handler
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("기업명(또는 예비창업자명)을 입력해주세요.");
      return;
    }

    setSavingCompany(true);
    setErrorMsg(null);
    setSaveSuccessMsg(null);

    try {
      const activeToken = token || (await getJwtToken());
      if (!activeToken) throw new Error("로그인 세션이 만료되었습니다.");

      const updated = await saveMyCompany(
        {
          name: name.trim(),
          bizRegNo: bizRegNo.trim() || undefined,
          industry: industry.trim() || undefined,
          region,
          foundedDate: foundedDate ? `${foundedDate}T00:00:00` : undefined,
          revenue: revenue ? parseFloat(revenue) : undefined,
          employeeCount: Number(employeeCount),
          hasPatents,
          hasCertifications,
          isExporting,
          coreItemSummary: coreItemSummary.trim() || undefined,
        },
        activeToken
      );

      applyCompanyToForm(updated);
      setIsEditingCompany(false); // Lock back to safe read-only view mode!
      setSaveSuccessMsg("기업 프로필이 안전하게 저장되었습니다!");
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    } catch (err: any) {
      setErrorMsg(err.message || "기업 정보 저장 중 오류가 발생했습니다.");
    } finally {
      setSavingCompany(false);
    }
  };

  // 3. Delete Plan Handler
  const handleDeletePlan = async (planId: string) => {
    if (!confirm("정말 이 사업계획서를 삭제하시겠습니까?")) return;
    try {
      const activeToken = token || (await getJwtToken());
      if (!activeToken) return;
      await deletePlanFromBackend(planId, activeToken);
      setPlans((prev) => prev.filter((p) => p.id !== planId));
    } catch (err: any) {
      alert("삭제 실패: " + err.message);
    }
  };

  // 4. Remove Bookmark Handler
  const handleRemoveBookmark = async (programId: string) => {
    try {
      const activeToken = token || (await getJwtToken());
      if (!activeToken) return;
      await toggleBookmarkOnBackend(programId, activeToken);
      setBookmarks((prev) => prev.filter((b) => b.supportProgramId !== programId));
    } catch (err: any) {
      alert("관심 공고 해제 실패: " + err.message);
    }
  };

  // 5. Open Plan in Main PSST Workspace via Query Param
  const handleOpenPlanInWorkspace = (plan: any) => {
    router.push(`/?tab=psst&planId=${plan.id}`);
  };

  // 6. Open Program Detail Page DIRECTLY
  const handleOpenProgramDetail = (programId: string) => {
    router.push(`/programs/${programId}`);
  };

  // Calculations
  const currentCompanyObj = {
    name,
    bizRegNo,
    industry,
    region,
    foundedDate,
    revenue,
    coreItemSummary,
    hasPatents,
    hasCertifications,
    isExporting,
  };
  const { score: completionRate, missingItems } = getProfileCompletionDetail(currentCompanyObj);
  const stageTrack = getStartupStageTrack(foundedDate);
  const formattedRevenue = formatKoreanCurrency(revenue);

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        <span className="text-xs font-semibold">기업 프로필 대시보드를 불러오는 중...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col text-slate-100 bg-slate-950">
      {/* Top Header */}
      <Header
        activeNavTab="notices"
        setActiveNavTab={(tab) => router.push(tab === "psst" ? "/?tab=psst" : "/")}
        mainPortalMode="bizinfo"
        setMainPortalMode={() => router.push("/")}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* 1. Top Enterprise Summary Hero Dashboard */}
        <section className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
            {/* Left: Enterprise Badge Card */}
            <div className="flex items-start space-x-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white text-xl sm:text-2xl font-black shadow-lg shadow-blue-500/20 flex-shrink-0 border border-white/20">
                {name ? name.substring(0, 1) : "Z"}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[11px] font-bold">
                    {bizRegNo ? "공식 등록 기업" : "예비 창업 단계"}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${stageTrack.badgeColor}`}>
                    {stageTrack.trackName}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-semibold">
                    {region}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center space-x-2">
                  <span>{name || "기업명을 등록해주세요"}</span>
                </h1>

                <p className="text-xs text-slate-400 flex items-center space-x-2 flex-wrap">
                  <span>{user?.email || "이메일 연동됨"}</span>
                  {industry && (
                    <>
                      <span>•</span>
                      <span className="text-indigo-300 font-semibold">{industry}</span>
                    </>
                  )}
                  {formattedRevenue && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-400 font-semibold">연매출 {formattedRevenue}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Right: Quick Stat Cards */}
            <div className="grid grid-cols-3 gap-3 w-full lg:w-auto">
              <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl text-center min-w-[100px] sm:min-w-[125px]">
                <span className="text-[10px] text-slate-400 font-medium block">프로필 완성도</span>
                <div className="text-lg sm:text-xl font-extrabold text-blue-400 mt-0.5">
                  {completionRate}%
                </div>
                <div className="w-full bg-slate-800 h-1 rounded-full mt-1.5 overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full transition-all duration-700" style={{ width: `${completionRate}%` }} />
                </div>
              </div>

              <div
                onClick={() => setActiveTab("plans")}
                className="bg-slate-950/80 border border-slate-800 hover:border-purple-500/40 p-3.5 rounded-2xl text-center min-w-[100px] sm:min-w-[125px] cursor-pointer transition-all"
              >
                <span className="text-[10px] text-slate-400 font-medium block">작성 계획서</span>
                <div className="text-lg sm:text-xl font-extrabold text-purple-400 mt-0.5">
                  {plans.length}건
                </div>
                <span className="text-[9px] text-purple-300 font-semibold block mt-1">이력 확인 ➔</span>
              </div>

              <div
                onClick={() => setActiveTab("bookmarks")}
                className="bg-slate-950/80 border border-slate-800 hover:border-indigo-500/40 p-3.5 rounded-2xl text-center min-w-[100px] sm:min-w-[125px] cursor-pointer transition-all"
              >
                <span className="text-[10px] text-slate-400 font-medium block">관심 지원사업</span>
                <div className="text-lg sm:text-xl font-extrabold text-indigo-400 mt-0.5">
                  {bookmarks.length}건
                </div>
                <span className="text-[9px] text-indigo-300 font-semibold block mt-1">스크랩 목록 ➔</span>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Main Tab Navigation */}
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab("company")}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === "company"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>기업 프로필 종합 관리</span>
          </button>

          <button
            onClick={() => setActiveTab("plans")}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === "plans"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>작성된 사업계획서 ({plans.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("bookmarks")}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === "bookmarks"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>관심 지원사업 스크랩 ({bookmarks.length})</span>
          </button>

          <button
            onClick={() => token && loadAllData(token)}
            disabled={loadingData}
            className="ml-auto p-2 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="새로고침"
          >
            <RefreshCw className={`w-4 h-4 ${loadingData ? "animate-spin text-purple-400" : ""}`} />
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {saveSuccessMsg && (
          <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* 3. TAB 1: Enterprise Profile Management (View Mode vs Safe Edit Mode) */}
        {activeTab === "company" && (
          <div className="space-y-6">
            {/* Header Control Bar with Edit Toggle */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 flex items-center justify-between flex-wrap gap-4 shadow-xl">
              <div className="flex items-center space-x-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  isEditingCompany ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                }`}>
                  {isEditingCompany ? <Edit3 className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-white">
                      {isEditingCompany ? "기업 정보 수정 모드 (입력 중)" : "내 기업 공인 프로필 (조회 모드)"}
                    </h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                      isEditingCompany ? "bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    }`}>
                      {isEditingCompany ? "수정 가능" : "안전 잠금됨 (조회 전용)"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isEditingCompany
                      ? "기업 정보를 변경한 후 하단의 [변경사항 저장] 버튼을 눌러주세요."
                      : "실수로 인한 정보 훼손을 방지하기 위해 평상시에는 안전하게 잠겨 있습니다."}
                  </p>
                </div>
              </div>

              {/* Action Button: Edit Toggle / Cancel */}
              <div className="flex items-center space-x-2">
                {isEditingCompany ? (
                  <>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={savingCompany}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>수정 취소</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveCompany}
                      disabled={savingCompany}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/30 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {savingCompany ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>저장 중...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>변경사항 저장</span>
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingCompany(true)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/30 flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>기업 정보 수정하기</span>
                  </button>
                )}
              </div>
            </div>

            {/* ----------------- VIEW 1: READ-ONLY SAFE VIEW MODE ----------------- */}
            {!isEditingCompany && (
              <div className="space-y-6">
                {/* 1. Basic Info Card */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center space-x-1.5">
                      <Building2 className="w-4 h-4" />
                      <span>1. 기본 식별 정보</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                    <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80 space-y-1">
                      <span className="text-slate-500 text-[11px] block">기업명 / 예비창업자명</span>
                      <span className="font-bold text-sm text-white">{name || "미등록"}</span>
                    </div>

                    <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80 space-y-1">
                      <span className="text-slate-500 text-[11px] block">사업자등록번호</span>
                      <span className="font-semibold text-slate-200">{bizRegNo || "미등록 (예비창업)"}</span>
                    </div>

                    <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80 space-y-1">
                      <span className="text-slate-500 text-[11px] block">주력 산업 분야 / 업종</span>
                      <span className="font-semibold text-blue-300">{industry || "미등록"}</span>
                    </div>

                    <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80 space-y-1">
                      <span className="text-slate-500 text-[11px] block">사업장 소재지</span>
                      <span className="font-semibold text-slate-200">{region}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Age, Financial & Scale Metrics Card */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <span className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center space-x-1.5">
                      <TrendingUp className="w-4 h-4" />
                      <span>2. 업력 및 재무·규모 지표</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80 space-y-1">
                      <span className="text-slate-500 text-[11px] block">설립연월일 및 업력 단계</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-white">{foundedDate ? `${foundedDate}` : "미등록"}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${stageTrack.badgeColor}`}>
                          {stageTrack.trackName}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 pt-0.5">{stageTrack.description}</p>
                    </div>

                    <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80 space-y-1">
                      <span className="text-slate-500 text-[11px] block">최근 연간 매출액</span>
                      <span className="font-bold text-sm text-emerald-400">
                        {formattedRevenue ? `${formattedRevenue} (${Number(revenue).toLocaleString()}원)` : "0원 (또는 미등록)"}
                      </span>
                    </div>

                    <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80 space-y-1">
                      <span className="text-slate-500 text-[11px] block">상시 근로자 수</span>
                      <span className="font-bold text-sm text-slate-200">{employeeCount}명 (대표자 포함)</span>
                    </div>
                  </div>
                </div>

                {/* 3. Priority Certifications & Patents */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
                      <Award className="w-4 h-4" />
                      <span>3. 정부 공통 우대 가점 및 특화 자격</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className={`p-4 rounded-2xl border flex items-center space-x-3 ${
                      hasPatents ? "bg-amber-950/30 border-amber-500/40 text-amber-200" : "bg-slate-950/40 border-slate-800/60 text-slate-500"
                    }`}>
                      <BadgeCheck className={`w-5 h-5 ${hasPatents ? "text-amber-400" : "text-slate-600"}`} />
                      <div>
                        <span className="font-bold text-slate-200 block">특허 / IP 지식재산권</span>
                        <span className="text-[11px]">{hasPatents ? "보유 (기술성 가점 충족 🟢)" : "미보유"}</span>
                      </div>
                    </div>

                    <div className={`p-4 rounded-2xl border flex items-center space-x-3 ${
                      hasCertifications ? "bg-amber-950/30 border-amber-500/40 text-amber-200" : "bg-slate-950/40 border-slate-800/60 text-slate-500"
                    }`}>
                      <BadgeCheck className={`w-5 h-5 ${hasCertifications ? "text-amber-400" : "text-slate-600"}`} />
                      <div>
                        <span className="font-bold text-slate-200 block">벤처기업 / 이노비즈 인증</span>
                        <span className="text-[11px]">{hasCertifications ? "보유 (공식 인증 충족 🟢)" : "미보유"}</span>
                      </div>
                    </div>

                    <div className={`p-4 rounded-2xl border flex items-center space-x-3 ${
                      isExporting ? "bg-amber-950/30 border-amber-500/40 text-amber-200" : "bg-slate-950/40 border-slate-800/60 text-slate-500"
                    }`}>
                      <BadgeCheck className={`w-5 h-5 ${isExporting ? "text-amber-400" : "text-slate-600"}`} />
                      <div>
                        <span className="font-bold text-slate-200 block">글로벌 수출 실적</span>
                        <span className="text-[11px]">{isExporting ? "보유 (글로벌 바우처 우대 🟢)" : "미보유"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Core Item & BM Summary */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-3 shadow-xl">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center space-x-1.5 border-b border-slate-800/80 pb-3">
                    <Sparkles className="w-4 h-4" />
                    <span>4. 핵심 창업 아이템 및 비즈니스 모델(BM) 설명</span>
                  </span>

                  {coreItemSummary ? (
                    <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {coreItemSummary}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-500">
                      등록된 아이템 설명이 없습니다. [기업 정보 수정하기]를 눌러 제품/서비스 설명을 작성해 보세요.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ----------------- VIEW 2: ACTIVE EDIT MODE ----------------- */}
            {isEditingCompany && (
              <form onSubmit={handleSaveCompany} className="space-y-6 animate-in fade-in duration-200">
                {/* Card 1: Basic Identity & Registration */}
                <div className="bg-slate-900/90 border border-blue-500/40 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-white">1. 기업 기본 식별 정보 수정</h3>
                        <p className="text-[11px] text-slate-400">기업체 공식 명칭 및 사업자등록 정보를 입력합니다.</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Company Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                        <span>기업명 (또는 예비창업자명) *</span>
                        <span className="text-[10px] text-rose-400 font-normal">필수</span>
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="예: (주)지윈에이아이"
                          className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl py-2.5 pl-10 pr-3 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    {/* Biz Reg No */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                        <span>사업자등록번호</span>
                        <span className="text-[10px] text-slate-500">예비창업자 생략</span>
                      </label>
                      <input
                        type="text"
                        value={bizRegNo}
                        onChange={(e) => setBizRegNo(e.target.value)}
                        placeholder="예: 123-45-67890"
                        className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl py-2.5 px-3 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none transition-colors"
                      />
                    </div>

                    {/* Region */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">사업장 소재지 지역 *</label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                        <select
                          value={region}
                          onChange={(e) => setRegion(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl py-2.5 pl-10 pr-3 text-xs text-slate-100 focus:outline-none transition-colors"
                        >
                          <option value="서울특별시">서울특별시</option>
                          <option value="경기도">경기도</option>
                          <option value="인천광역시">인천광역시</option>
                          <option value="대전광역시">대전광역시</option>
                          <option value="대구광역시">대구광역시</option>
                          <option value="부산광역시">부산광역시</option>
                          <option value="광주광역시">광주광역시</option>
                          <option value="세종특별자치시">세종특별자치시</option>
                          <option value="전라남도">전라남도</option>
                          <option value="전라북도">전라북도</option>
                          <option value="충청남도">충청남도</option>
                          <option value="충청북도">충청북도</option>
                          <option value="경상남도">경상남도</option>
                          <option value="경상북도">경상북도</option>
                          <option value="강원특별자치도">강원특별자치도</option>
                          <option value="제주특별자치도">제주특별자치도</option>
                          <option value="전국">전국 / 기타</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Industry & Quick Tags */}
                  <div className="space-y-2 pt-1">
                    <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span>주력 산업 분야 / 업종 *</span>
                      <span className="text-[10px] text-blue-400">지원사업 매칭 핵심 기준</span>
                    </label>
                    <div className="relative">
                      <Briefcase className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        placeholder="직접 입력하거나 아래 추천 키워드를 클릭하세요"
                        className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl py-2.5 pl-10 pr-3 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none transition-colors"
                      />
                    </div>

                    {/* Quick Tags */}
                    <div className="flex items-center flex-wrap gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-500 mr-1">추천 태그:</span>
                      {POPULAR_INDUSTRIES.map((ind, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setIndustry(ind)}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                            industry === ind
                              ? "bg-blue-600 text-white border-blue-500 font-bold"
                              : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
                          }`}
                        >
                          {ind}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card 2: Scale, Age & Financial Metrics */}
                <div className="bg-slate-900/90 border border-purple-500/40 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-white">2. 업력 · 기업 규모 및 재무 역량 수정</h3>
                        <p className="text-[11px] text-slate-400">지원 자격 심사(초기창업, 도약, R&D 규모 요건)에 자동 판정됩니다.</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Founded Date */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                        <span>설립연월일 (창업일)</span>
                        <span className="text-[10px] text-emerald-400 font-semibold">{stageTrack.trackName}</span>
                      </label>
                      <div className="relative">
                        <Calendar className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                        <input
                          type="date"
                          value={foundedDate}
                          onChange={(e) => setFoundedDate(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 focus:border-purple-500 rounded-xl py-2.5 pl-10 pr-3 text-xs text-slate-100 focus:outline-none transition-colors"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 pt-0.5">{stageTrack.description}</p>
                    </div>

                    {/* Employees */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">상시 근로자 수 (대표자 포함)</label>
                      <div className="relative">
                        <Users className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                        <input
                          type="number"
                          min="1"
                          value={employeeCount}
                          onChange={(e) => setEmployeeCount(parseInt(e.target.value) || 1)}
                          className="w-full bg-slate-950 border border-slate-700 focus:border-purple-500 rounded-xl py-2.5 pl-10 pr-3 text-xs text-slate-100 focus:outline-none transition-colors"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 pt-0.5">고용 인원 기준 지원 요건에 활용</p>
                    </div>

                    {/* Revenue */}
                    <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                      <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                        <span>최근 연간 매출액 (원)</span>
                        {formattedRevenue && <span className="text-[10px] text-emerald-400 font-bold">{formattedRevenue}</span>}
                      </label>
                      <div className="relative">
                        <DollarSign className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                        <input
                          type="number"
                          value={revenue}
                          onChange={(e) => setRevenue(e.target.value)}
                          placeholder="예: 150000000 (1억 5천만원, 예비창업자 0)"
                          className="w-full bg-slate-950 border border-slate-700 focus:border-purple-500 rounded-xl py-2.5 pl-10 pr-3 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none transition-colors"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 pt-0.5">매출 규모 기준 R&D 및 수출 바우처 매칭</p>
                    </div>
                  </div>
                </div>

                {/* Card 3: Priority Extra Points & Certifications */}
                <div className="bg-slate-900/90 border border-amber-500/40 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-white">3. 정부 공통 우대 가점 및 특화 자격</h3>
                        <p className="text-[11px] text-slate-400">공고 심사 시 서류 통과율을 높여주는 핵심 가점 항목입니다.</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start space-x-3 ${
                      hasPatents ? "bg-amber-950/30 border-amber-500/40 text-amber-200" : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}>
                      <input
                        type="checkbox"
                        checked={hasPatents}
                        onChange={(e) => setHasPatents(e.target.checked)}
                        className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0 mt-0.5 cursor-pointer"
                      />
                      <div className="space-y-1">
                        <span className="font-bold text-xs text-white block">특허 / 지식재산권(IP)</span>
                        <p className="text-[11px] text-slate-400">출원 또는 등록 특허 보유 (기술성 가점)</p>
                      </div>
                    </label>

                    <label className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start space-x-3 ${
                      hasCertifications ? "bg-amber-950/30 border-amber-500/40 text-amber-200" : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}>
                      <input
                        type="checkbox"
                        checked={hasCertifications}
                        onChange={(e) => setHasCertifications(e.target.checked)}
                        className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0 mt-0.5 cursor-pointer"
                      />
                      <div className="space-y-1">
                        <span className="font-bold text-xs text-white block">벤처기업 / 이노비즈 인증</span>
                        <p className="text-[11px] text-slate-400">정부 공인 벤처기업/연구소 인증 보유</p>
                      </div>
                    </label>

                    <label className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start space-x-3 ${
                      isExporting ? "bg-amber-950/30 border-amber-500/40 text-amber-200" : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}>
                      <input
                        type="checkbox"
                        checked={isExporting}
                        onChange={(e) => setIsExporting(e.target.checked)}
                        className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0 mt-0.5 cursor-pointer"
                      />
                      <div className="space-y-1">
                        <span className="font-bold text-xs text-white block">수출 실적 보유</span>
                        <p className="text-[11px] text-slate-400">글로벌 진출 및 직접/간접 수출 실적</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Card 4: Core Item & Business Model */}
                <div className="bg-slate-900/90 border border-indigo-500/40 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-white">4. 핵심 창업 아이템 및 비즈니스 모델(BM)</h3>
                        <p className="text-[11px] text-slate-400">PSST 사업계획서의 문제인식(P)과 해결방안(S) 섹션에 자동 인용됩니다.</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <textarea
                      rows={5}
                      value={coreItemSummary}
                      onChange={(e) => setCoreItemSummary(e.target.value)}
                      placeholder="[작성 가이드라인]&#10;1. 우리 제품/서비스가 해결하는 기존 시장의 핵심 문제점&#10;2. 경쟁사 대비 독창적인 핵심 기술 및 차별화 강점&#10;3. 주요 타겟 고객층 및 수익 창출 모델(BM)을 요약하여 작성해 주세요."
                      className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-2xl p-4 text-xs sm:text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none transition-colors leading-relaxed font-sans"
                    />
                    <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                      <span>최소 10자 이상 입력 시 AI 정밀 사업계획서 작성이 활성화됩니다.</span>
                      <span className={`${coreItemSummary.length >= 10 ? "text-indigo-400 font-bold" : "text-slate-600"}`}>
                        {coreItemSummary.length}자 입력됨
                      </span>
                    </div>
                  </div>
                </div>

                {/* Floating Bottom Submit Bar */}
                <div className="sticky bottom-4 z-30 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-4 flex items-center justify-between shadow-2xl">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={savingCompany}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                  >
                    수정 취소
                  </button>

                  <button
                    type="submit"
                    disabled={savingCompany}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs sm:text-sm font-bold transition-all shadow-lg shadow-blue-600/30 flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    {savingCompany ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>DB 저장 중...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>기업 프로필 저장 및 안전 잠금</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: Saved PSST Business Plans */}
        {activeTab === "plans" && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-purple-400" />
                  <span>내가 작성한 PSST 사업계획서 이력</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  저장된 사업계획서를 불러와 재편집하거나, 추가 첨삭을 진행할 수 있습니다.
                </p>
              </div>

              <Link
                href="/?tab=psst"
                className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-md shadow-purple-600/30 flex items-center space-x-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>새 사업계획서 작성</span>
              </Link>
            </div>

            {plans.length === 0 ? (
              <div className="py-20 text-center text-slate-500 text-xs space-y-3">
                <FileText className="w-12 h-12 mx-auto text-slate-600" />
                <p className="text-sm font-semibold text-slate-400">아직 저장된 사업계획서가 없습니다.</p>
                <p className="text-slate-500">AI 사업계획서 작성기에서 표준 PSST 계획서를 생성해 보세요.</p>
                <Link
                  href="/?tab=psst"
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30 font-bold text-xs hover:bg-purple-600/30 transition-all mt-2"
                >
                  <span>사업계획서 만들러 가기</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {plans.map((p, idx) => (
                  <div
                    key={p.id ? `${p.id}-${idx}` : idx}
                    className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-purple-500/40 transition-all flex flex-col justify-between space-y-4 group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {p.targetProgramTitle || "표준 PSST 서식"}
                        </span>
                        {p.grade && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                            <Award className="w-3 h-3" />
                            <span>{p.grade}등급 ({p.score}점)</span>
                          </span>
                        )}
                      </div>

                      <h4 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-2">
                        {p.title}
                      </h4>

                      {p.score && (
                        <div className="pt-1">
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>심사위원 평가 점수</span>
                            <span className="font-bold text-purple-300">{p.score} / 100점</span>
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1 overflow-hidden">
                            <div className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full" style={{ width: `${p.score}%` }} />
                          </div>
                        </div>
                      )}

                      <span className="text-[11px] text-slate-500 flex items-center space-x-1 pt-1">
                        <Calendar className="w-3 h-3" />
                        <span>최근 수정: {new Date(p.updatedAt).toLocaleDateString("ko-KR")}</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                      <button
                        onClick={() => handleDeletePlan(p.id)}
                        className="p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                        title="사업계획서 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleOpenPlanInWorkspace(p)}
                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-md shadow-purple-600/30 flex items-center space-x-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>열기 & 재편집</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Bookmarked Programs */}
        {activeTab === "bookmarks" && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Bookmark className="w-5 h-5 text-indigo-400" />
                  <span>관심 지원사업 스크랩 목록</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  찜해둔 지원사업을 한눈에 확인하고, <b>공고 상세 보기</b>나 <b>AI 맞춤 적합도 진단</b>을 바로 진행할 수 있습니다.
                </p>
              </div>

              <Link
                href="/"
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-md shadow-indigo-600/30 flex items-center space-x-1"
              >
                <span>전체 공고 탐색</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {bookmarks.length === 0 ? (
              <div className="py-20 text-center text-slate-500 text-xs space-y-3">
                <Bookmark className="w-12 h-12 mx-auto text-slate-600" />
                <p className="text-sm font-semibold text-slate-400">찜한 관심 지원사업이 없습니다.</p>
                <p className="text-slate-500">공고 탐색에서 관심 있는 지원사업의 북마크를 눌러보세요.</p>
                <Link
                  href="/"
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-bold text-xs hover:bg-indigo-600/30 transition-all mt-2"
                >
                  <span>공고 둘러보기</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {bookmarks.map((b, idx) => (
                  <div
                    key={b.id ? `${b.id}-${idx}` : idx}
                    className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-indigo-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2 text-[10px] text-slate-400">
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-500/20">
                          {b.organizer}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-800">{b.category}</span>
                        <span>•</span>
                        <span>{b.region}</span>
                        {b.endDate && (
                          <span className="flex items-center space-x-1 text-amber-400 font-medium ml-1">
                            <Calendar className="w-3 h-3" />
                            <span>마감일: ~{new Date(b.endDate).toLocaleDateString("ko-KR")}</span>
                          </span>
                        )}
                      </div>

                      <h4 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                        {b.programTitle}
                      </h4>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <button
                        onClick={() => handleRemoveBookmark(b.supportProgramId)}
                        className="p-2.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                        title="관심 공고 해제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleOpenProgramDetail(b.supportProgramId)}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-md shadow-indigo-600/30 flex items-center space-x-1.5 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>공고 상세 & AI 진단</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* In-Page Program Detail Modal for Seamless Inspection & AI Diagnosis */}
      {selectedProgramForModal && (
        <ProgramDetailModal
          selectedProgram={selectedProgramForModal}
          onClose={() => setSelectedProgramForModal(null)}
          onCreatePsstPlan={(title) => {
            router.push(`/?tab=psst&targetProgram=${encodeURIComponent(title)}`);
          }}
        />
      )}

      <Footer />
    </div>
  );
}
