"use client";

import React from "react";
import { ExternalLink } from "lucide-react";
import { SupportProgram } from "../ProgramCard";
import { cleanHtml, formatNoticeDate, renderConditionChips } from "./detail-helpers";

interface ProgramSummaryCardProps {
  program: SupportProgram;
  isKst: boolean;
  ddayInfo: { text: string; isUrgent: boolean; isClosed: boolean };
  kst: (keys: string[]) => string | null;
  biz: (keys: string[]) => string | null;
}

export const ProgramSummaryCard: React.FC<ProgramSummaryCardProps> = ({
  program,
  isKst,
  ddayInfo,
  kst,
  biz,
}) => {
  if (isKst) {
    return (
      <div className="bg-white border border-amber-200/90 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex items-start justify-between flex-wrap gap-3 border-b border-amber-100 pb-4">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold text-xs border border-amber-200">
                🚀 K-Startup 창업 지원사업
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
                {program.category || "일반창업"}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${
                  ddayInfo.isClosed
                    ? "bg-slate-100 text-slate-500 border-slate-200"
                    : ddayInfo.isUrgent
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                }`}
              >
                {ddayInfo.text}
              </span>
            </div>
            <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 break-words leading-snug">
              {cleanHtml(kst(["biz_pbanc_nm", "intg_pbanc_biz_nm", "공고명"])) || program.title}
            </h1>
          </div>

          {kst(["aply_mthd_onli_rcpt_istc", "detl_pg_url"])?.startsWith("http") && (
            <a
              href={kst(["aply_mthd_onli_rcpt_istc", "detl_pg_url"])!}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold flex items-center space-x-1.5 transition-colors flex-shrink-0 shadow-2xs"
            >
              <span>K-Startup 온라인 접수처</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* 4 Key Condition Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-100 space-y-1.5 flex flex-col justify-start">
            <span className="text-[11px] text-amber-800 font-bold block">창업 업력 조건</span>
            <div className="flex-1">{renderConditionChips(kst(["biz_enyy", "창업업력"]), "공고문 참조", "amber")}</div>
          </div>
          <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-100 space-y-1.5 flex flex-col justify-start">
            <span className="text-[11px] text-amber-800 font-bold block">대상 연령</span>
            <div className="flex-1">{renderConditionChips(kst(["aply_trgt_age", "대상연령"]), "공고문 참조", "amber")}</div>
          </div>
          <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-100 space-y-1.5 flex flex-col justify-start">
            <span className="text-[11px] text-amber-800 font-bold block">지원 지역</span>
            <div className="flex-1">{renderConditionChips(kst(["supt_regin", "지역"]) || program.region, "전국", "blue")}</div>
          </div>
          <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-100 space-y-1.5 flex flex-col justify-start">
            <span className="text-[11px] text-amber-800 font-bold block">접수 기간</span>
            <span className="font-semibold text-slate-800 text-xs break-words leading-relaxed block">
              {kst(["pbanc_rcpt_bgng_dt"]) && kst(["pbanc_rcpt_end_dt"])
                ? `${formatNoticeDate(kst(["pbanc_rcpt_bgng_dt"]))} ~ ${formatNoticeDate(kst(["pbanc_rcpt_end_dt"]))}`
                : "공고문 참조"}
            </span>
          </div>
        </div>

        {/* Extended Detail Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          {cleanHtml(kst(["aply_trgt_ctnt", "신청대상"])) && (
            <div className="text-xs bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-700 leading-relaxed space-y-1">
              <strong className="text-emerald-700 font-bold block text-[11px]">🎯 신청 대상 상세</strong>
              <p className="text-slate-800 whitespace-pre-wrap">{cleanHtml(kst(["aply_trgt_ctnt", "신청대상"]))}</p>
            </div>
          )}
          {cleanHtml(kst(["aply_excl_trgt_ctnt", "제외대상"])) && (
            <div className="text-xs bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-700 leading-relaxed space-y-1">
              <strong className="text-rose-700 font-bold block text-[11px]">🚫 신청 제외 대상</strong>
              <p className="text-slate-800 whitespace-pre-wrap">{cleanHtml(kst(["aply_excl_trgt_ctnt", "제외대상"]))}</p>
            </div>
          )}
        </div>

        {/* Agency and Contact Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <span className="text-slate-500 font-bold block text-[11px]">소관/주관기관</span>
            <span className="text-slate-800 font-semibold">{cleanHtml(kst(["pbanc_ntrp_nm", "소관기관"])) || program.organizer || "공고문 참조"}</span>
          </div>
          <div>
            <span className="text-slate-500 font-bold block text-[11px]">수행/운영기관</span>
            <span className="text-slate-800 font-semibold">{cleanHtml(kst(["exct_istt_nm", "수행기관"])) || program.executingAgency || "창업진흥원"}</span>
          </div>
          <div>
            <span className="text-amber-800 font-bold block text-[11px]">문의처</span>
            <span className="text-slate-800 font-semibold">{cleanHtml(kst(["tel_no", "cntct_no", "문의처"])) || "공고문 참조"}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-blue-200/90 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
      <div className="flex items-start justify-between flex-wrap gap-3 border-b border-blue-100 pb-4">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200">
              🏢 기업마당 정책 지원사업
            </span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
              {program.category || "중소기업지원"}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${
                ddayInfo.isClosed
                  ? "bg-slate-100 text-slate-500 border-slate-200"
                  : ddayInfo.isUrgent
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}
            >
              {ddayInfo.text}
            </span>
          </div>
          <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 break-words leading-snug">
            {cleanHtml(biz(["pblancNm", "사업명"])) || program.title}
          </h1>
        </div>

        {biz(["pblancUrl"])?.startsWith("http") && (
          <a
            href={biz(["pblancUrl"])!}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center space-x-1.5 transition-colors flex-shrink-0 shadow-2xs"
          >
            <span>기업마당 공고 원문</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* 2-Column Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="bg-blue-50/40 p-4 rounded-xl border border-blue-100 space-y-2">
          <span className="text-[11px] text-blue-800 font-bold block">🎯 지원대상</span>
          <p className="font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">
            {cleanHtml(biz(["trgetNm", "지원대상"])) || program.targetDescription || "공고문 참조"}
          </p>
        </div>
        <div className="bg-blue-50/40 p-4 rounded-xl border border-blue-100 space-y-2">
          <span className="text-[11px] text-blue-800 font-bold block">📋 사업 개요</span>
          <div className="font-medium text-slate-800 leading-relaxed whitespace-pre-wrap max-h-[140px] overflow-y-auto custom-scrollbar">
            {cleanHtml(biz(["bsnsSumryCn", "사업요약"])) || "공고문 전문을 참조해 주세요."}
          </div>
        </div>
      </div>

      {/* Agency and Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div>
          <span className="text-slate-500 font-bold block text-[11px]">소관기관</span>
          <span className="text-slate-800 font-semibold">{cleanHtml(biz(["jnsmAgencyNm", "소관기관"])) || program.organizer}</span>
        </div>
        <div>
          <span className="text-slate-500 font-bold block text-[11px]">신청기간</span>
          <span className="text-slate-800 font-semibold">{cleanHtml(biz(["reqstBeginEndDe", "신청기간"])) || "공고문 참조"}</span>
        </div>
        <div>
          <span className="text-blue-700 font-bold block text-[11px]">신청방법</span>
          <span className="text-slate-800 font-semibold">{cleanHtml(biz(["reqstMthPapersCn", "신청방법"])) || "온라인/공고문 참조"}</span>
        </div>
      </div>
    </div>
  );
};
