"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  FolderHeart,
  FileText,
  Bookmark,
  Trash2,
  Calendar,
  Award,
  ExternalLink,
  Loader2,
  AlertCircle,
  Eye,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import {
  fetchMyPlans,
  deletePlanFromBackend,
  fetchMyBookmarks,
  toggleBookmarkOnBackend,
} from "@/lib/backend-client";
import { getJwtToken } from "@/lib/supabase-client";

interface SavedPlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan?: (planData: any) => void;
  onOpenBookmarkedProgram?: (programId: string) => void;
}

function ScoreBar({ score, maxScore }: { score: number; maxScore: number }) {
  const pct = Math.min(100, Math.round((score / maxScore) * 100));
  const color =
    pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-blue-500" : pct >= 40 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="flex items-center space-x-2 mt-1">
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-bold text-slate-700 w-8 text-right">{score}점</span>
    </div>
  );
}

export default function SavedPlansModal({
  isOpen,
  onClose,
  onSelectPlan,
  onOpenBookmarkedProgram,
}: SavedPlansModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"plans" | "bookmarks">("plans");
  const [plans, setPlans] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const token = await getJwtToken();
      if (!token) return;

      const [plansRes, bookmarksRes] = await Promise.allSettled([
        fetchMyPlans(token),
        fetchMyBookmarks(token),
      ]);

      if (plansRes.status === "fulfilled") {
        setPlans(plansRes.value || []);
      }
      if (bookmarksRes.status === "fulfilled") {
        setBookmarks(bookmarksRes.value || []);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "보관함 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDeletePlan = async (planId: string) => {
    if (!confirm("정말 이 사업계획서를 삭제하시겠습니까?")) return;
    try {
      const token = await getJwtToken();
      if (!token) return;
      await deletePlanFromBackend(planId, token);
      setPlans((prev) => prev.filter((p) => p.id !== planId));
    } catch (err: any) {
      alert("삭제 실패: " + err.message);
    }
  };

  const handleRemoveBookmark = async (programId: string) => {
    try {
      const token = await getJwtToken();
      if (!token) return;
      await toggleBookmarkOnBackend(programId, token);
      setBookmarks((prev) => prev.filter((b) => b.supportProgramId !== programId));
    } catch (err: any) {
      alert("관심 공고 해제 실패: " + err.message);
    }
  };

  const handleOpenPlan = (plan: any) => {
    if (onSelectPlan) {
      try {
        const planJson =
          typeof plan.planJson === "string" ? JSON.parse(plan.planJson) : plan.planJson;
        onSelectPlan({ ...plan, planJson });
        onClose();
      } catch {
        alert("사업계획서 데이터를 불러오는 중 오류가 발생했습니다.");
      }
    } else {
      router.push(`/consultant?planId=${plan.id}`);
      onClose();
    }
  };

  const getGradeColor = (grade?: string) => {
    if (!grade) return "text-slate-700 bg-slate-100";
    if (grade === "S") return "text-amber-800 bg-amber-50 border-amber-200";
    if (grade === "A") return "text-emerald-800 bg-emerald-50 border-emerald-200";
    if (grade === "B") return "text-blue-800 bg-blue-50 border-blue-200";
    return "text-slate-700 bg-slate-100 border-slate-200";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden text-slate-900 max-h-[85vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="border-b border-slate-100 pb-4 mb-4">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold mb-2">
            <FolderHeart className="w-3.5 h-3.5" />
            <span>내 개인 보관함</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">저장된 내역 & 관심 공고</h2>
          <p className="text-xs text-slate-500 mt-1">저장된 PSST 사업계획서를 불러와 재편집하거나, 관심 공고를 바로 열 수 있습니다.</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex space-x-2 border-b border-slate-100 pb-3 mb-4">
          <button
            onClick={() => setActiveTab("plans")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === "plans"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>저장된 PSST 계획서 ({plans.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("bookmarks")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === "bookmarks"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:text-slate-900"
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>관심 지원사업 ({bookmarks.length})</span>
          </button>

          <button
            onClick={loadData}
            disabled={loading}
            className="ml-auto p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="새로 고침"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Error */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Content Body */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="text-xs">데이터를 불러오는 중...</span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-1 space-y-3">
            {activeTab === "plans" ? (
              plans.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs space-y-2">
                  <FileText className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-slate-600 font-medium">아직 저장된 PSST 사업계획서가 없습니다.</p>
                  <p className="text-[11px] text-slate-400">AI 사업계획서 탭에서 생성 후 [내 보관함 저장]을 눌러보세요.</p>
                </div>
              ) : (
                plans.map((p, idx) => (
                  <div
                    key={p.id ? `${p.id}-${idx}` : idx}
                    className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-400 transition-all group shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            {p.targetProgramTitle || "표준 PSST"}
                          </span>
                          {p.grade && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border flex items-center space-x-1 ${getGradeColor(p.grade)}`}>
                              <Award className="w-3 h-3" />
                              <span>{p.grade}등급</span>
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{new Date(p.updatedAt).toLocaleDateString("ko-KR")}</span>
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 truncate">{p.title}</h4>

                        {/* Score gauge bar */}
                        {p.score && (
                          <div className="flex items-center space-x-2">
                            <TrendingUp className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <div className="flex-1">
                              <ScoreBar score={p.score} maxScore={100} />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-1.5 flex-shrink-0">
                        {onSelectPlan && (
                          <button
                            onClick={() => handleOpenPlan(p)}
                            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center space-x-1.5 shadow-xs cursor-pointer"
                            title="이 계획서를 PSST 편집 화면에서 열기"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>열기</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDeletePlan(p.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )
            ) : bookmarks.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs space-y-2">
                <Bookmark className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-slate-600 font-medium">찜한 관심 지원사업이 없습니다.</p>
                <p className="text-[11px] text-slate-400">공고 상세 보기에서 북마크 버튼을 눌러보세요.</p>
              </div>
            ) : (
              bookmarks.map((b, bIdx) => (
                <div
                  key={b.id ? `${b.id}-${bIdx}` : bIdx}
                  className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-400 transition-all shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2 text-[10px] text-slate-500">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                          {b.organizer}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">{b.category}</span>
                        <span>{b.region}</span>
                        {b.endDate && (
                          <span className="flex items-center space-x-1 text-amber-700 font-bold">
                            <Calendar className="w-3 h-3 text-amber-600" />
                            <span>~{new Date(b.endDate).toLocaleDateString("ko-KR")}</span>
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 truncate">{b.programTitle}</h4>
                    </div>

                    <div className="flex items-center space-x-1.5 flex-shrink-0">
                      <button
                        onClick={() => {
                          if (onOpenBookmarkedProgram) {
                            onOpenBookmarkedProgram(b.supportProgramId);
                          } else {
                            router.push(`/programs/${b.supportProgramId}`);
                          }
                          onClose();
                        }}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center space-x-1.5 shadow-xs cursor-pointer"
                        title="공고 상세 보기"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>공고 열기</span>
                      </button>
                      <button
                        onClick={() => handleRemoveBookmark(b.supportProgramId)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        title="관심 공고 해제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
