"use client";

import React from "react";
import { ChevronRight, Sparkles, Clock, Calendar } from "lucide-react";

export interface SupportProgram {
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
  createdAt?: string;
  sources: { id: string; sourceType: string; sourceUrl: string; rawTitle: string; rawData?: string }[];
  documents: { id: string; fileName: string; fileUrl: string; fileType: string }[];
  analyses: any[];
}

interface ProgramCardProps {
  prog: SupportProgram;
  onClick: () => void;
}

export const ProgramCard: React.FC<ProgramCardProps> = ({ prog, onClick }) => {
  const getDDay = (endDateStr?: string) => {
    if (!endDateStr) return "상시모집";
    const end = new Date(endDateStr);
    end.setHours(23, 59, 59, 999);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((end.getTime() - today.getTime()) / (1000 * 3600 * 24));
    if (diffDays < 0) return "마감완료";
    if (diffDays === 0) return "D-Day";
    return `D-${diffDays}`;
  };

  // Check if notice is newly added (e.g., created within 48 hours)
  const isNew = (() => {
    if (!prog.createdAt) return false;
    const createdDate = new Date(prog.createdAt);
    const now = new Date();
    const diffHours = (now.getTime() - createdDate.getTime()) / (1000 * 3600);
    return diffHours <= 72; // Within 3 days
  })();

  const formatCreatedTime = (createdAtStr?: string) => {
    if (!createdAtStr) return null;
    const created = new Date(createdAtStr);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - created.getTime()) / (1000 * 3600));

    if (diffHours < 1) return "방금 전 등록";
    if (diffHours < 24) return `${diffHours}시간 전`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays <= 7) return `${diffDays}일 전`;
    return created.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  };

  const dday = getDDay(prog.endDate);
  const isClosed = dday === "마감완료";
  const isUrgent = !isClosed && dday.includes("D-") && parseInt(dday.replace(/[^0-9]/g, "") || "99") <= 7;
  const createdBadgeText = formatCreatedTime(prog.createdAt);

  return (
    <div
      onClick={onClick}
      className={`glass-card rounded-2xl p-5 cursor-pointer flex flex-col justify-between space-y-4 group relative overflow-hidden transition-all duration-300 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10 ${
        isClosed ? "opacity-60 bg-slate-950/40" : ""
      }`}
    >
      {/* Visual Accent Glow for NEW Items */}
      {isNew && (
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-500/20 via-indigo-500/10 to-transparent rounded-bl-full pointer-events-none" />
      )}

      <div className="space-y-3 relative z-10">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
            {isNew && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-sm flex items-center space-x-1">
                <Sparkles className="w-3 h-3 animate-spin-slow" />
                <span>NEW</span>
              </span>
            )}
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {prog.region}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
              {prog.category}
            </span>
          </div>

          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              isClosed
                ? "bg-slate-800 text-slate-400 border border-slate-700"
                : isUrgent
                ? "bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse"
                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            }`}
          >
            {dday}
          </span>
        </div>

        <h3 className="font-bold text-sm text-slate-100 group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
          {prog.title}
        </h3>
      </div>

      <div className="space-y-2 text-xs text-slate-400 border-t border-slate-800/80 pt-3 relative z-10">
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
          <div className="flex items-center space-x-1.5">
            {createdBadgeText && (
              <span className="text-[10px] text-slate-400 flex items-center space-x-1 mr-1">
                <Clock className="w-3 h-3 text-blue-400" />
                <span>{createdBadgeText}</span>
              </span>
            )}
            {prog.sources.map((src, sIdx) => (
              <span
                key={src.id ? `${src.id}-${sIdx}` : sIdx}
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

      <div className="flex items-center justify-between text-xs text-blue-400 font-medium pt-1 relative z-10">
        <span>공고 상세 리포트</span>
        <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );
};

