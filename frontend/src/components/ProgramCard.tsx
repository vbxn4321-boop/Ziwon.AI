import React from "react";
import Link from "next/link";
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
  daysLeft?: number;
  sources: { id: string; sourceType: string; sourceUrl: string; rawTitle: string; rawData?: string }[];
  documents: { id: string; fileName: string; fileUrl: string; fileType: string; extractedText?: string; status?: string }[];
  analyses: any[];
}

interface ProgramCardProps {
  prog: SupportProgram;
  onClick?: () => void;
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

  const cardContent = (
    <div
      onClick={onClick}
      className={`bg-white border border-slate-200/90 rounded-2xl p-5 cursor-pointer flex flex-col justify-between space-y-4 group relative overflow-hidden transition-all duration-200 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/8 h-full ${
        isClosed ? "opacity-60 bg-slate-50/80" : ""
      }`}
    >
      {/* Visual Accent Glow for NEW Items */}
      {isNew && (
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-500/10 via-indigo-500/5 to-transparent rounded-bl-full pointer-events-none" />
      )}

      {/* Top Section */}
      <div className="space-y-3 relative z-10">
        {/* Badge Row (Protected against awkward line breaks) */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
            {isNew && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-600 text-white shadow-2xs flex items-center space-x-1 whitespace-nowrap flex-shrink-0">
                <Sparkles className="w-3 h-3 animate-spin-slow" />
                <span>NEW</span>
              </span>
            )}
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap truncate max-w-[90px]">
              {prog.region}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 whitespace-nowrap truncate max-w-[120px]">
              {prog.category}
            </span>
          </div>

          {/* D-Day Badge (Protected against vertical wrapping) */}
          <span
            className={`whitespace-nowrap flex-shrink-0 inline-flex items-center justify-center font-extrabold text-[11px] px-2.5 py-1 rounded-full border shadow-2xs leading-none ${
              isClosed
                ? "bg-slate-100 text-slate-500 border-slate-200"
                : isUrgent
                ? "bg-rose-50 text-rose-600 border border-rose-200 ring-2 ring-rose-500/10"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
            }`}
          >
            {dday}
          </span>
        </div>

        {/* Title: 2-line clamp with fixed minimum height for equal alignment across all cards */}
        <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 min-h-[2.65rem] leading-snug break-keep">
          {prog.title}
        </h3>
      </div>

      {/* Bottom Section */}
      <div className="space-y-3 relative z-10 border-t border-slate-100 pt-3">
        <div className="space-y-1.5 text-xs text-slate-600">
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-400 whitespace-nowrap flex-shrink-0">주관기관:</span>
            <span className="text-slate-800 font-semibold truncate text-right max-w-[160px]">{prog.organizer}</span>
          </div>
          {prog.budget && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400 whitespace-nowrap flex-shrink-0">지원규모:</span>
              <span className="text-blue-600 font-bold truncate text-right max-w-[160px]">{prog.budget}</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-400 whitespace-nowrap flex-shrink-0">수집 출처:</span>
            <div className="flex items-center space-x-1.5 overflow-hidden justify-end">
              {createdBadgeText && (
                <span className="text-[10px] text-slate-400 flex items-center space-x-0.5 whitespace-nowrap">
                  <Clock className="w-3 h-3 text-blue-500 mr-0.5" />
                  <span>{createdBadgeText}</span>
                </span>
              )}
              {prog.sources.map((src, sIdx) => (
                <span
                  key={src.id ? `${src.id}-${sIdx}` : sIdx}
                  className={`px-1.5 py-0.5 text-[10px] font-semibold rounded whitespace-nowrap ${
                    src.sourceType === "K_STARTUP"
                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                      : "bg-teal-50 text-teal-700 border border-teal-200"
                  }`}
                >
                  {src.sourceType === "K_STARTUP" ? "K-Startup" : "기업마당"}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Action Link */}
        <div className="flex items-center justify-between text-xs text-blue-600 font-bold pt-0.5">
          <span>공고 상세 보기</span>
          <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </div>
  );

  if (onClick) {
    return cardContent;
  }

  return (
    <Link href={`/programs/${prog.id}`} className="block h-full">
      {cardContent}
    </Link>
  );
};

