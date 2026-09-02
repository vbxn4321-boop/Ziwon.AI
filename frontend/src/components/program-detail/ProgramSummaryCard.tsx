"use client";

import React from "react";
import { ExternalLink, Mail } from "lucide-react";
import { SupportProgram } from "../ProgramCard";
import { cleanHtml, formatNoticeDate, renderConditionChips } from "./detail-helpers";

interface ProgramSummaryCardProps {
  program: SupportProgram;
  isKst: boolean;
  ddayInfo: { text: string; isUrgent: boolean; isClosed: boolean };
  kst: (keys: string[]) => string | null;
  biz: (keys: string[]) => string | null;
}

/**
 * Automatically converts URLs (http/https/www) and emails into clickable, styled hyperlinks
 */
export const renderAutoLinkedText = (rawText: string | null | undefined) => {
  if (!rawText) return null;
  const text = cleanHtml(rawText) || rawText;

  // Regex to split by URLs and email addresses
  const urlOrEmailRegex =
    /((?:https?:\/\/|www\.)[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;

  const parts = text.split(urlOrEmailRegex);

  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;

        // 1. External Web URL
        if (/^(?:https?:\/\/|www\.)/i.test(part)) {
          const href = part.startsWith("http") ? part : `https://${part}`;
          return (
            <a
              key={i}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-0.5 text-blue-600 hover:text-blue-800 underline underline-offset-2 font-bold transition-colors break-all mx-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              <span>{part}</span>
              <ExternalLink className="w-3 h-3 ml-0.5 inline-block text-blue-500 flex-shrink-0" />
            </a>
          );
        }

        // 2. Email Address
        if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i.test(part)) {
          return (
            <a
              key={i}
              href={`mailto:${part}`}
              className="inline-flex items-center space-x-0.5 text-blue-600 hover:text-blue-800 underline underline-offset-2 font-bold transition-colors break-all mx-0.5"
              title="이메일 바로 보내기"
              onClick={(e) => e.stopPropagation()}
            >
              <span>{part}</span>
              <Mail className="w-3 h-3 ml-0.5 inline-block text-blue-500 flex-shrink-0" />
            </a>
          );
        }

        // 3. Regular Text
        return <span key={i}>{part}</span>;
      })}
    </>
  );
};

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
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-xs border border-amber-300">
                🚀 K-Startup 창업 지원사업
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200">
                {program.category || "일반창업"}
              </span>
              {kst(["pbanc_sn", "prch_cnpl_no"]) && (
                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[11px] font-semibold border border-amber-200">
                  #공고 {kst(["pbanc_sn", "prch_cnpl_no"])}
                </span>
              )}
              <span
                className={`px-2.5 py-0.5 rounded-md text-xs font-extrabold border ${
                  ddayInfo.isClosed
                    ? "bg-slate-100 text-slate-600 border-slate-300"
                    : ddayInfo.isUrgent
                    ? "bg-rose-100 text-rose-800 border-rose-300"
                    : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                }`}
              >
                {ddayInfo.text}
              </span>
            </div>
            <h1 className="text-lg sm:text-2xl font-black text-slate-900 break-words leading-snug tracking-tight">
              {cleanHtml(kst(["biz_pbanc_nm", "intg_pbanc_biz_nm", "공고명"])) || program.title}
            </h1>
          </div>

          {kst(["aply_mthd_onli_rcpt_istc", "detl_pg_url"])?.startsWith("http") && (
            <a
              href={kst(["detl_pg_url", "aply_mthd_onli_rcpt_istc"]) || "#"}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs flex items-center space-x-1.5 transition-all flex-shrink-0 shadow-md shadow-amber-500/25"
            >
              <span>K-Startup 온라인 접수처</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* 4 Key Condition Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200/80 space-y-1.5 flex flex-col justify-start">
            <span className="text-xs text-amber-950 font-extrabold block">창업 업력 조건</span>
            <div className="flex-1">{renderConditionChips(kst(["biz_enyy", "창업업력"]), "공고문 참조", "amber")}</div>
          </div>
          <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200/80 space-y-1.5 flex flex-col justify-start">
            <span className="text-xs text-amber-950 font-extrabold block">대상 연령</span>
            <div className="flex-1">{renderConditionChips(kst(["aply_trgt_age", "대상연령"]), "공고문 참조", "amber")}</div>
          </div>
          <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200/80 space-y-1.5 flex flex-col justify-start">
            <span className="text-xs text-amber-950 font-extrabold block">지원 지역</span>
            <div className="flex-1">{renderConditionChips(kst(["supt_regin", "지역"]) || program.region, "전국", "blue")}</div>
          </div>
          <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200/80 space-y-1.5 flex flex-col justify-start">
            <span className="text-xs text-amber-950 font-extrabold block">접수 기간</span>
            <span className="font-bold text-slate-900 text-xs break-words leading-relaxed block">
              {kst(["pbanc_rcpt_bgng_dt"]) && kst(["pbanc_rcpt_end_dt"])
                ? `${formatNoticeDate(kst(["pbanc_rcpt_bgng_dt"]))} ~ ${formatNoticeDate(kst(["pbanc_rcpt_end_dt"]))}`
                : "공고문 참조"}
            </span>
          </div>
        </div>

        {/* Notice Intro / Purpose Statement */}
        {cleanHtml(kst(["공고소개", "사업개요"])) && (
          <div className="text-xs bg-amber-50/40 p-4 rounded-xl border border-amber-200/70 text-slate-800 leading-relaxed space-y-1">
            <strong className="text-amber-950 font-extrabold block text-xs flex items-center space-x-1">
              <span>💡 공고 개요 및 추진 배경</span>
            </strong>
            <p className="text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
              {renderAutoLinkedText(kst(["공고소개", "사업개요"]))}
            </p>
          </div>
        )}

        {/* Support Scale & Content Card */}
        {(cleanHtml(kst(["지원내용", "supt_amt", "supt_scale", "지원규모"])) || program.budget) && (
          <div className="text-xs bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/70 text-slate-800 leading-relaxed space-y-1.5">
            <strong className="text-emerald-900 font-extrabold block text-xs flex items-center space-x-1">
              <span>💰 지원 내용 및 선발 혜택</span>
            </strong>
            <p className="text-slate-800 font-semibold whitespace-pre-wrap leading-relaxed">
              {renderAutoLinkedText(cleanHtml(kst(["지원내용", "supt_amt", "supt_scale", "지원규모"])) || program.budget)}
            </p>
          </div>
        )}

        {/* Extended Detail Cards: Eligibility & Exclusion */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
          {cleanHtml(kst(["aply_trgt_ctnt", "신청대상", "지원대상"])) && (
            <div className="text-xs bg-slate-50/80 p-4 rounded-xl border border-slate-200 text-slate-800 leading-relaxed space-y-1.5">
              <strong className="text-emerald-800 font-extrabold block text-xs flex items-center space-x-1">
                <span>🎯 신청 대상 상세</span>
              </strong>
              <p className="text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
                {renderAutoLinkedText(kst(["aply_trgt_ctnt", "신청대상", "지원대상"]))}
              </p>
            </div>
          )}
          {cleanHtml(kst(["aply_excl_trgt_ctnt", "excl_trgt_ctnt", "제외대상", "결격요건"])) && (
            <div className="text-xs bg-slate-50/80 p-4 rounded-xl border border-slate-200 text-slate-800 leading-relaxed space-y-1.5">
              <strong className="text-rose-800 font-extrabold block text-xs flex items-center space-x-1">
                <span>🚫 신청 제외 대상 (결격 요건)</span>
              </strong>
              <p className="text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
                {renderAutoLinkedText(kst(["aply_excl_trgt_ctnt", "excl_trgt_ctnt", "제외대상", "결격요건"]))}
              </p>
            </div>
          )}
        </div>

        {/* Submission Documents Checklist (Crucial for applicants!) */}
        {cleanHtml(kst(["제출서류", "제출서류목록"])) && (
          <div className="text-xs bg-blue-50/60 p-4 rounded-xl border border-blue-200/80 text-slate-800 leading-relaxed space-y-1.5">
            <strong className="text-blue-900 font-extrabold block text-xs flex items-center space-x-1">
              <span>📋 필수 제출 서류 목록 (체크리스트)</span>
            </strong>
            <p className="text-slate-800 font-medium whitespace-pre-wrap leading-relaxed font-sans">
              {renderAutoLinkedText(kst(["제출서류", "제출서류목록"]))}
            </p>
          </div>
        )}

        {/* Selection Process & Application Instructions (Key K-Startup Detail Fields) */}
        {(cleanHtml(kst(["slctn_mthd_ctnt", "선정절차", "평가방법"])) || cleanHtml(kst(["aply_mthd_onli_rcpt_istc", "신청방법"]))) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {cleanHtml(kst(["slctn_mthd_ctnt", "선정절차", "평가방법"])) && (
              <div className="text-xs bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 text-slate-800 leading-relaxed space-y-1.5">
                <strong className="text-indigo-900 font-extrabold block text-xs flex items-center space-x-1">
                  <span>⚖️ 선정 절차 및 평가 일정</span>
                </strong>
                <p className="text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
                  {renderAutoLinkedText(kst(["slctn_mthd_ctnt", "선정절차", "평가방법"]))}
                </p>
              </div>
            )}
            {cleanHtml(kst(["aply_mthd_onli_rcpt_istc", "신청방법"])) && (
              <div className="text-xs bg-amber-50/50 p-4 rounded-xl border border-amber-200/70 text-slate-800 leading-relaxed space-y-1.5">
                <strong className="text-amber-900 font-extrabold block text-xs flex items-center space-x-1">
                  <span>📮 신청 방법 및 접수처 안내</span>
                </strong>
                <p className="text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
                  {renderAutoLinkedText(kst(["aply_mthd_onli_rcpt_istc", "신청방법"]))}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Agency and Contact Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50/80 p-4 rounded-xl border border-slate-200">
          <div>
            <span className="text-slate-600 font-bold block text-[11px]">소관/주관기관</span>
            <span className="text-slate-900 font-bold text-xs">
              {renderAutoLinkedText(cleanHtml(kst(["pbanc_ntrp_nm", "소관기관"])) || program.organizer || "공고문 참조")}
            </span>
          </div>
          <div>
            <span className="text-slate-600 font-bold block text-[11px]">수행/운영기관</span>
            <span className="text-slate-900 font-bold text-xs">
              {renderAutoLinkedText(cleanHtml(kst(["exct_istt_nm", "수행기관"])) || program.executingAgency || "창업진흥원")}
            </span>
          </div>
          <div>
            <span className="text-slate-600 font-bold block text-[11px]">문의처</span>
            <span className="text-slate-900 font-bold text-xs flex items-center space-x-1">
              <span>{cleanHtml(kst(["tel_no", "cntct_no", "문의처"])) || "공고문 참조"}</span>
            </span>
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
            {renderAutoLinkedText(cleanHtml(biz(["trgetNm", "지원대상"])) || program.targetDescription || "공고문 참조")}
          </p>
        </div>
        <div className="bg-blue-50/40 p-4 rounded-xl border border-blue-100 space-y-2">
          <span className="text-[11px] text-blue-800 font-bold block">📋 사업 개요</span>
          <div className="font-medium text-slate-800 leading-relaxed whitespace-pre-wrap max-h-[140px] overflow-y-auto custom-scrollbar">
            {renderAutoLinkedText(cleanHtml(biz(["bsnsSumryCn", "사업요약"])) || "공고문 전문을 참조해 주세요.")}
          </div>
        </div>
      </div>

      {/* Agency and Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div>
          <span className="text-slate-500 font-bold block text-[11px]">소관기관</span>
          <span className="text-slate-800 font-semibold">{renderAutoLinkedText(cleanHtml(biz(["jnsmAgencyNm", "소관기관"])) || program.organizer)}</span>
        </div>
        <div>
          <span className="text-slate-500 font-bold block text-[11px]">신청기간</span>
          <span className="text-slate-800 font-semibold">{renderAutoLinkedText(cleanHtml(biz(["reqstBeginEndDe", "신청기간"])) || "공고문 참조")}</span>
        </div>
        <div>
          <span className="text-blue-700 font-bold block text-[11px]">신청방법 및 접수처</span>
          <span className="text-slate-800 font-semibold">{renderAutoLinkedText(cleanHtml(biz(["reqstMthPapersCn", "신청방법"])) || "온라인/공고문 참조")}</span>
        </div>
      </div>
    </div>
  );
};
