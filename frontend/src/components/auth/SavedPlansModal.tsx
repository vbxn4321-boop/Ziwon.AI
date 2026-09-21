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
  Download,
  FileStack,
} from "lucide-react";
import {
  fetchMyPlans,
  fetchPlanDetail,
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
  const [activeTab, setActiveTab] = useState<"plans" | "bookmarks" | "documents">("plans");
  const [plans, setPlans] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  // rhwp 에디터에서 "저장"으로 만든 원본 HWP/HWPX 바이트 문서. 위 plans(텍스트
  // 기반 PSST 계획서 JSON)와는 완전히 별개의 저장소라 별도 탭으로 둔다.
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [documentActionError, setDocumentActionError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const token = await getJwtToken();
      if (!token) return;

      const [plansRes, bookmarksRes, documentsRes] = await Promise.allSettled([
        fetchMyPlans(token),
        fetchMyBookmarks(token),
        fetch("/api/documents", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      ]);

      if (plansRes.status === "fulfilled") {
        setPlans(plansRes.value || []);
      }
      if (bookmarksRes.status === "fulfilled") {
        setBookmarks(bookmarksRes.value || []);
      }
      if (documentsRes.status === "fulfilled" && documentsRes.value?.success) {
        setDocuments(documentsRes.value.documents || []);
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

  const handleDownloadDocument = async (doc: any) => {
    setDocumentActionError(null);
    try {
      const token = await getJwtToken();
      if (!token) return;
      const res = await fetch(`/api/documents/${doc.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`다운로드 실패 (HTTP ${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setDocumentActionError(err.message || "다운로드하지 못했습니다.");
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm("정말 이 문서를 삭제하시겠습니까?")) return;
    setDocumentActionError(null);
    try {
      const token = await getJwtToken();
      if (!token) return;
      const res = await fetch(`/api/documents/${docId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.error || `삭제 실패 (HTTP ${res.status})`);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err: any) {
      setDocumentActionError(err.message || "삭제하지 못했습니다.");
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

  const handleOpenPlan = async (plan: any) => {
    try {
      const token = await getJwtToken();
      let targetPlan = plan;
      // If planJson is not present (e.g. from list view), fetch full detail
      if (!targetPlan.planJson && token) {
        try {
          const detailed = await fetchPlanDetail(plan.id, token);
          if (detailed) {
            targetPlan = detailed;
          }
        } catch (fetchErr) {
          console.warn("Failed to fetch full plan detail, falling back:", fetchErr);
        }
      }

      const rawJson = targetPlan.planJson || targetPlan;
      const planJson = typeof rawJson === "string" ? JSON.parse(rawJson) : rawJson;

      if (onSelectPlan) {
        onSelectPlan({ ...targetPlan, planJson });
        onClose();
      } else {
        router.push(`/consultant?planId=${plan.id}`);
        onClose();
      }
    } catch (err: any) {
      console.error("Error opening plan:", err);
      if (onSelectPlan) {
        onSelectPlan(plan);
      } else {
        router.push(`/consultant?planId=${plan.id}`);
      }
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
            onClick={() => setActiveTab("documents")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === "documents"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileStack className="w-4 h-4" />
            <span>저장한 문서 ({documents.length})</span>
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
        {documentActionError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{documentActionError}</span>
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
            ) : activeTab === "documents" ? (
              documents.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs space-y-2">
                  <FileStack className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-slate-600 font-medium">아직 저장한 문서가 없습니다.</p>
                  <p className="text-[11px] text-slate-400">
                    사업계획서 에디터에서 [저장]을 누르면 원본 HWP/HWPX 파일이 여기 쌓입니다. (위 &quot;저장된 PSST
                    계획서&quot;와는 다른, 별도 저장소입니다.)
                  </p>
                </div>
              ) : (
                documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-400 transition-all shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                            {doc.format}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {(doc.fileSize / 1024).toFixed(0)}KB
                          </span>
                          <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{new Date(doc.updatedAt).toLocaleDateString("ko-KR")}</span>
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 truncate">{doc.fileName}</h4>
                      </div>

                      <div className="flex items-center space-x-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleDownloadDocument(doc)}
                          className="px-3 py-1.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center space-x-1.5 shadow-xs cursor-pointer"
                          title="다운로드"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>다운로드</span>
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
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
