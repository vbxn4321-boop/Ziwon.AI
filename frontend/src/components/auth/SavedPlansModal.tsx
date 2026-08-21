"use client";

import React, { useState, useEffect } from "react";
import { X, FolderHeart, FileText, Bookmark, Trash2, Calendar, Award, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { fetchMyPlans, deletePlanFromBackend, fetchMyBookmarks, toggleBookmarkOnBackend } from "@/lib/backend-client";
import { getJwtToken } from "@/lib/supabase-client";

interface SavedPlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan?: (planData: any) => void;
}

export default function SavedPlansModal({ isOpen, onClose, onSelectPlan }: SavedPlansModalProps) {
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

      if (activeTab === "plans") {
        const data = await fetchMyPlans(token);
        setPlans(data || []);
      } else {
        const data = await fetchMyBookmarks(token);
        setBookmarks(data || []);
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
  }, [isOpen, activeTab]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden text-slate-100 max-h-[85vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="border-b border-slate-800 pb-4 mb-4">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold mb-2">
            <FolderHeart className="w-3.5 h-3.5" />
            <span>내 개인 보관함 (FastAPI DB 연동)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">저장된 내역 & 관심 공고</h2>
        </div>

        {/* Tab Switcher */}
        <div className="flex space-x-2 border-b border-slate-800 pb-3 mb-4">
          <button
            onClick={() => setActiveTab("plans")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === "plans"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                : "bg-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>저장된 PSST 사업계획서 ({plans.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("bookmarks")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === "bookmarks"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "bg-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>관심 지원사업 스크랩 ({bookmarks.length})</span>
          </button>
        </div>

        {/* Content Body */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-500/30 text-red-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            <span className="text-xs">데이터를 불러오는 중...</span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-1 space-y-3">
            {activeTab === "plans" ? (
              plans.length === 0 ? (
                <div className="py-16 text-center text-slate-500 text-xs space-y-2">
                  <FileText className="w-10 h-10 mx-auto text-slate-600" />
                  <p>아직 저장된 PSST 사업계획서가 없습니다.</p>
                  <p className="text-[11px] text-slate-600">AI 사업계획서 탭에서 생성 후 [보관함 저장]을 눌러보세요.</p>
                </div>
              ) : (
                plans.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {p.targetProgramTitle || "표준 PSST"}
                        </span>
                        {p.score && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 flex items-center space-x-1">
                            <Award className="w-3 h-3" />
                            <span>{p.score}점 ({p.grade || "A"}등급)</span>
                          </span>
                        )}
                        <span className="text-[11px] text-slate-500">
                          {new Date(p.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-100 truncate">{p.title}</h4>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleDeletePlan(p.id)}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-xl transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )
            ) : bookmarks.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs space-y-2">
                <Bookmark className="w-10 h-10 mx-auto text-slate-600" />
                <p>찜한 관심 지원사업이 없습니다.</p>
              </div>
            ) : (
              bookmarks.map((b) => (
                <div
                  key={b.id}
                  className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between gap-4"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                      <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                        {b.organizer}
                      </span>
                      <span>{b.category}</span>
                      <span>•</span>
                      <span>{b.region}</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-100 truncate">{b.programTitle}</h4>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleRemoveBookmark(b.supportProgramId)}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-xl transition-colors"
                      title="관심 공고 해제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
