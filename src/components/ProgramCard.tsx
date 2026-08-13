"use client";

import React from "react";
import { ChevronRight } from "lucide-react";

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
  sources: { id: string; sourceType: string; sourceUrl: string; rawTitle: string }[];
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 3600 * 24));
    if (diffDays < 0) return "마감됨";
    if (diffDays === 0) return "D-Day";
    return `마감 ${diffDays}일전`;
  };

  const dday = getDDay(prog.endDate);
  const isUrgent = dday.includes("마감") && parseInt(dday.replace(/[^0-9]/g, "") || "99") <= 7;
  const isClosed = dday === "마감됨";

  return (
    <div
      onClick={onClick}
      className={`glass-card rounded-2xl p-5 cursor-pointer flex flex-col justify-between space-y-4 group relative overflow-hidden transition-all ${
        isClosed ? "opacity-60 bg-slate-950/40" : ""
      }`}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
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

      <div className="flex items-center justify-between text-xs text-blue-400 font-medium pt-1">
        <span>공고 상세보기</span>
        <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );
};
