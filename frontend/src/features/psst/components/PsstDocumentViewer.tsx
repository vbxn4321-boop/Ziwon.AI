"use client";

import React, { useState } from "react";
import { Sparkles, Loader2, FileStack, ExternalLink } from "lucide-react";
import { PsstBusinessPlanResult } from "@/lib/ai/psst-generator";
import { CanvasTheme, PsstFormData, PsstSectionKey } from "../types";
import { SECTION_LABELS } from "../constants";
import { PsstEvaluationCard } from "./PsstEvaluationCard";
import { RhwpEditorPanel } from "./RhwpEditorPanel";
import { PdfFormFiller } from "./PdfFormFiller";
import { getJwtToken } from "@/lib/supabase-client";
import { buildDownloadUrl } from "@/lib/documents/download";

const isPdfFile = (fileName: string) => /\.pdf$/i.test(fileName);

type FormDocumentCandidate = {
  fileName: string;
  fileUrl: string;
  entryPath?: string | null;
  extractedText?: string | null;
};

interface PsstDocumentViewerProps {
  canvasTheme: CanvasTheme;
  activeSection: PsstSectionKey;
  generatedResult: PsstBusinessPlanResult | null;
  formData: PsstFormData;
  isGenerating?: boolean;
  docScrollRef: React.RefObject<HTMLDivElement | null>;
  sectionRefs: Record<PsstSectionKey, React.RefObject<HTMLDivElement | null>>;
  onScrollToSection: (sec: PsstSectionKey) => void;
  /** 지금 에디터에 열려 있는 첨부 원문. */
  formDocument?: FormDocumentCandidate | null;
  /**
   * 이 공고에서 서식/신청서로 보이는 첨부 전체. 2개 이상이면 화면에 선택
   * 목록을 띄운다 — 예전엔 첫 번째 것만 골라 나머지를 조용히 버렸는데,
   * 세부 사업별로 신청서가 완전히 다른 공고(실측 129건)에서 필요한 서식이
   * 안 보이는 것처럼 보이는 버그였다.
   */
  formDocuments?: FormDocumentCandidate[];
  /** 선택 목록에서 다른 첨부를 고르면 호출된다. */
  onSelectFormDocument?: (doc: FormDocumentCandidate) => void;
  /** 첨부 서식 조회가 아직 진행 중인가. "못 찾음"과 "조회 중"을 구분하는 데 쓴다. */
  isFormSchemaLoading?: boolean;
  /**
   * PDF/DOCX 등 편집기(rhwp)가 못 여는 첨부. formDocuments 와 한 선택 목록에
   * 같이 뜬다 — PDF를 고르면 편집기 대신 PdfFormFiller(직접 입력 화면)를 연다.
   */
  unopenableDocuments?: FormDocumentCandidate[];
}

/** 사업계획서 목차. 사이드바에 있던 '페이지' 목록을 문서 영역으로 옮긴 것이다. */
const DOCUMENT_OUTLINE: [PsstSectionKey, string][] = [
  ["overview", "기업·아이템 개요"],
  ["problem", "문제 인식"],
  ["solution", "해결 방안"],
  ["scaleUp", "사업화 전략"],
  ["team", "팀 구성"],
  ["evaluation", "평가 리포트"],
];

export const PsstDocumentViewer: React.FC<PsstDocumentViewerProps> = ({
  canvasTheme,
  activeSection,
  generatedResult,
  formData,
  isGenerating = false,
  docScrollRef,
  sectionRefs,
  onScrollToSection,
  formDocument = null,
  formDocuments = [],
  onSelectFormDocument,
  isFormSchemaLoading = false,
  unopenableDocuments = [],
}) => {
  const [viewMode, setViewMode] = useState<"a4" | "cards">("a4");
  // rhwp 에디터에서 "저장"을 한 번이라도 누르면 그 문서의 Storage 객체 id를 여기 담아둔다.
  // 같은 문서를 다시 저장할 때 새로 만들지 않고 같은 자리에 덮어쓰기 위해서다.
  const [savedDocumentId, setSavedDocumentId] = useState<string | null>(null);
  // PDF 서식은 rhwp가 못 여니, 이 값이 채워지면 편집기 대신 PDF 오버레이
  // 입력기(PdfFormFiller)를 그 자리에 대신 렌더링한다.
  const [pdfFillTarget, setPdfFillTarget] = useState<FormDocumentCandidate | null>(null);

  const hasValidPlan = !!(generatedResult && generatedResult.overview && generatedResult.overview.title);

  return (
    <div
      id="psst-document-canvas"
      className={`flex-1 min-w-0 flex flex-col min-h-[70vh] md:min-h-0 md:h-full overflow-hidden relative transition-colors ${
        canvasTheme === "dark" ? "bg-slate-950 text-slate-100" : "bg-[#f7f6f3] text-slate-800"
      }`}
    >
      {/* Sheet Sub-Header */}
      <div
        className={`h-12 px-6 flex items-center justify-between flex-shrink-0 border-b ${
          canvasTheme === "dark"
            ? "bg-slate-900/90 border-slate-800 text-slate-200"
            : "bg-white border-slate-200 text-slate-800"
        }`}
      >
        <div className="flex items-center space-x-3">
          <span className="text-slate-700 font-semibold text-xs">
            {SECTION_LABELS[activeSection] || "창업아이템 개요(요약)"}
          </span>
          {hasValidPlan && generatedResult?.evaluationReport && (
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
              (점수: {generatedResult.evaluationReport.score}점 · {generatedResult.evaluationReport.grade})
            </span>
          )}
        </div>

        {hasValidPlan && (
          <div className="flex items-center space-x-2">
            {/* 문서 편집(rhwp 실제 문서) vs 요약 카드(읽기 전용 미리보기) */}
            <div className="flex items-center gap-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewMode("a4")}
                className={`px-3 py-1 rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer ${
                  viewMode === "a4"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>문서 편집</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`px-3 py-1 rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer ${
                  viewMode === "cards"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>요약 카드</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 문서 내 이동용 목차. 대화의 목차(어느 칸을 채우는 중인가)와 역할이 달라서
          이건 생성된 문서를 훑는 스크롤 내비게이션이다. 요약 카드(읽기 전용
          미리보기)에만 있는 섹션 앵커라 그 모드일 때만 띄운다 — 문서 편집
          모드는 rhwp 가 자기 안에서 스크롤을 관리한다. */}
      {hasValidPlan && viewMode === "cards" && (
      <nav
        aria-label="사업계획서 목차"
        className={`flex-shrink-0 px-4 py-2 flex items-center gap-1.5 overflow-x-auto border-b ${
          canvasTheme === "dark" ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200"
        }`}
      >
        <span className="text-[10px] font-bold tracking-wider text-slate-400 flex-shrink-0 pr-1">문서</span>
        {DOCUMENT_OUTLINE.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => onScrollToSection(key)}
            className={`px-2.5 py-1 rounded-lg text-[11px] whitespace-nowrap transition-colors cursor-pointer border ${
              activeSection === key
                ? "bg-stone-100 text-slate-900 border-stone-300 font-semibold"
                : "bg-transparent text-slate-500 border-transparent hover:bg-stone-50 hover:text-slate-900"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>
      )}

      {/* Main Viewport Content
          - 생성 중: 로딩 애니메이션
          - 계획서 완성 + 요약 카드 모드: 읽기 전용 미리보기(빠르게 훑어볼 때)
          - 그 외(문서 편집 모드, 또는 아직 계획서가 없을 때): 실제 문서를 rhwp 로 연다.
            계획서가 있으면 /api/export/hwpx 가 조립한 HWPX 를, 없으면 공고 첨부
            원문을 그대로 연다. 두 경우 다 같은 RhwpEditorPanel 하나가 처리한다 —
            예전에는 여기가 contentEditable div(A4DocumentEditor)와 서식 칸
            textarea 나열, 두 개의 서로 다른 "가짜" 에디터로 나뉘어 있었다. */}
      {isGenerating ? (
        <div ref={docScrollRef as any} className="flex-1 p-4 sm:p-8 overflow-y-auto space-y-6 flex flex-col">
          {/* Real-time AI Generation Loading View */}
          <div className="max-w-2xl mx-auto rounded-2xl border border-slate-200 bg-white p-8 sm:p-12 text-center space-y-6 my-auto shadow-sm w-full">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
              <Sparkles className="w-8 h-8 animate-spin text-amber-300" />
            </div>
            <div className="space-y-2 max-w-md mx-auto">
              <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-bold inline-block">
                ⚡ Gemini 3.7 AI 엔진 실시간 작성 중
              </span>
              <h3 className="text-lg sm:text-xl font-black text-slate-900">
                공고 맞춤형 PSST 사업계획서를 작성하고 있습니다
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                주관기관 심사 기준과 배점표를 반영하여 문제인식, 실현기술, 비즈니스 모델, 예산표, 100점 심사역 리포트를 정밀 도출 중입니다. (약 10~15초 소요)
              </p>
            </div>

            <div className="space-y-2 text-left max-w-md mx-auto text-xs text-slate-600 bg-slate-50 border border-slate-200 p-4 rounded-xl">
              <div className="flex items-center space-x-2 text-blue-400 font-bold">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>1. 공고 배점표 & 주관기관 성격 분석 반영 중...</span>
              </div>
              <div className="flex items-center space-x-2 text-indigo-400 font-bold">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>2. 문제인식(P) & 실현가능성(S) 핵심 기술 작성 중...</span>
              </div>
              <div className="flex items-center space-x-2 text-purple-400 font-bold">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>3. 성장전략(S) BM & 소요 예산 집행표 도출 중...</span>
              </div>
              <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>4. 팀구성(T) 역량 & 심사위원 100점 평가 리포트 채점 중...</span>
              </div>
            </div>
          </div>
        </div>
      ) : hasValidPlan && generatedResult && viewMode === "cards" ? (
        <div ref={docScrollRef as any} className="flex-1 p-4 sm:p-8 overflow-y-auto space-y-6 flex flex-col">
            <div
              className={`max-w-3xl mx-auto rounded-3xl p-8 sm:p-10 shadow-2xl space-y-8 transition-colors w-full ${
                canvasTheme === "dark"
                  ? "bg-slate-900/90 border border-slate-800 text-slate-200"
                  : "bg-white border border-slate-200 text-slate-900"
              }`}
            >
              {/* ── 1. Overview Section ── */}

            {generatedResult.overview && (
              <div
                ref={sectionRefs.overview as any}
                className={`space-y-5 border-b pb-8 ${
                  canvasTheme === "dark" ? "border-slate-800" : "border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-extrabold text-blue-400 border-l-4 border-blue-500 pl-3">
                    창업아이템 개요(요약)
                  </h2>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    🏛️ {formData.targetProgramTitle || "중소벤처기업부 표준 PSST"}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-indigo-300">명칭</h3>
                  <p className="text-xs font-semibold pl-1">
                    <b>{generatedResult.overview.title}</b>
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-indigo-300">산업 분야</h3>
                  <p className="text-xs pl-1 text-slate-300">
                    <b>{generatedResult.overview.industry}</b>
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-indigo-300">아이템 핵심 개요</h3>
                  <p className="text-xs leading-relaxed pl-1 whitespace-pre-line text-slate-300">
                    {generatedResult.overview.itemSummary}
                  </p>
                </div>

              {/* Government Standard 2-Column Summary Table */}
              {generatedResult.overview.summaryTable && (
                <div className="space-y-2 pt-1">
                  <h3 className="text-sm font-bold text-indigo-300">📋 사업 요약 규격표</h3>
                  <div className="overflow-x-auto rounded-xl border border-indigo-500/30 bg-slate-950/70">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-indigo-950/60 text-indigo-200 border-b border-indigo-500/20 font-bold">
                        <tr>
                          <th className="p-2.5 w-28">항목 구분</th>
                          <th className="p-2.5">공식 등록 내용</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300 text-[11px]">
                        <tr>
                          <td className="p-2.5 font-bold text-indigo-400 bg-slate-900/60">아이템 범주</td>
                          <td className="p-2.5">{generatedResult.overview.summaryTable.itemCategory}</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-indigo-400 bg-slate-900/60">주요 타겟</td>
                          <td className="p-2.5">{generatedResult.overview.summaryTable.targetUsers}</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-indigo-400 bg-slate-900/60">핵심 기능</td>
                          <td className="p-2.5">{generatedResult.overview.summaryTable.coreFeature}</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-indigo-400 bg-slate-900/60">수익 모델</td>
                          <td className="p-2.5">{generatedResult.overview.summaryTable.monetization}</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-indigo-400 bg-slate-900/60">신청 예산</td>
                          <td className="p-2.5 font-semibold text-emerald-400">
                            {generatedResult.overview.summaryTable.targetBudget}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="space-y-1.5 pt-1">
                <h3 className="text-sm font-bold text-indigo-300">개발 배경 및 시급성</h3>
                <p className="text-xs leading-relaxed pl-1 whitespace-pre-line text-slate-300">
                  {generatedResult.problem?.developmentNecessity}
                </p>
              </div>
            </div>
          )}

            {/* ── 2. Problem Section ── */}
            {generatedResult.problem && (
              <div
                ref={sectionRefs.problem as any}
                className={`space-y-5 border-b pb-8 ${
                  canvasTheme === "dark" ? "border-slate-800" : "border-slate-200"
                }`}
              >
                <h2 className="text-xl font-extrabold text-rose-400 border-l-4 border-rose-500 pl-3">
                  {generatedResult.problem.title || "1. 문제인식 (Problem)"}
                </h2>

                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-slate-300">1-1. 시장 및 고객의 문제점</h3>
                  <p className="text-xs leading-relaxed pl-1 whitespace-pre-line text-slate-300">
                    {generatedResult.problem.marketPainPoint}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-slate-300">1-2. 타겟 고객의 핵심 페인포인트</h3>
                  <p className="text-xs leading-relaxed pl-1 whitespace-pre-line text-slate-300">
                    {generatedResult.problem.targetCustomerProblem}
                  </p>
                </div>

                {/* TAM - SAM - SOM Market Size Diagram Card */}
                {generatedResult.problem.tamSamSom && (
                  <div className="space-y-2 pt-1">
                    <h3 className="text-sm font-bold text-rose-300">📊 타겟 시장 규모 (TAM - SAM - SOM)</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                        <div className="text-[11px] font-bold text-blue-400">TAM (전체 시장)</div>
                        <div className="text-xs font-semibold text-slate-200 leading-relaxed">
                          {generatedResult.problem.tamSamSom.tam}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                        <div className="text-[11px] font-bold text-purple-400">SAM (유효 시장)</div>
                        <div className="text-xs font-semibold text-slate-200 leading-relaxed">
                          {generatedResult.problem.tamSamSom.sam}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                        <div className="text-[11px] font-bold text-emerald-400">SOM (수익 시장)</div>
                        <div className="text-xs font-semibold text-slate-200 leading-relaxed">
                          {generatedResult.problem.tamSamSom.som}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-slate-300">1-3. 개발 및 사업화의 필요성과 시급성</h3>
                  <p className="text-xs leading-relaxed pl-1 whitespace-pre-line text-slate-300">
                    {generatedResult.problem.developmentNecessity}
                  </p>
                </div>
              </div>
            )}

            {/* ── 3. Solution Section ── */}
            {generatedResult.solution && (
              <div
                ref={sectionRefs.solution as any}
                className={`space-y-5 border-b pb-8 ${
                  canvasTheme === "dark" ? "border-slate-800" : "border-slate-200"
                }`}
              >
                <h2 className="text-xl font-extrabold text-blue-400 border-l-4 border-blue-500 pl-3">
                  {generatedResult.solution.title || "2. 실현가능성 (Solution)"}
                </h2>

                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-slate-300">2-1. 핵심 기술 및 해결 방안</h3>
                  <p className="text-xs leading-relaxed pl-1 whitespace-pre-line text-slate-300">
                    {generatedResult.solution.coreTechnologyAndFeatures}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-slate-300">2-2. 경쟁사 대비 차별화 요소 (기술적 해자)</h3>
                  <p className="text-xs leading-relaxed pl-1 whitespace-pre-line text-slate-300">
                    {generatedResult.solution.competitorDifferentiation}
                  </p>
                </div>

                {/* Competitor Comparative Matrix Table */}
                {generatedResult.solution.competitorTable && generatedResult.solution.competitorTable.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h3 className="text-sm font-bold text-blue-300">⚔️ 경쟁 제품/대체재 비교 분석표</h3>
                    <div className="overflow-x-auto rounded-xl border border-blue-500/20 bg-slate-950/70">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-blue-950/60 text-blue-200 border-b border-blue-500/20 font-bold">
                          <tr>
                            <th className="p-2.5">비교 구분</th>
                            <th className="p-2.5 text-emerald-400 font-extrabold bg-emerald-950/30">
                              당사 솔루션 (Ziwon)
                            </th>
                            <th className="p-2.5 text-slate-300">경쟁사 A (기존 외산)</th>
                            <th className="p-2.5 text-slate-300">대체재 B</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300 text-[11px]">
                          {generatedResult.solution.competitorTable.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-900/50">
                              <td className="p-2.5 font-bold text-blue-400 bg-slate-900/50">{row.category}</td>
                              <td className="p-2.5 font-semibold text-emerald-300 bg-emerald-950/15">{row.ourItem}</td>
                              <td className="p-2.5 text-slate-400">{row.competitorA}</td>
                              <td className="p-2.5 text-slate-400">{row.competitorB}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5 pt-2">
                  <h3 className="text-sm font-bold text-slate-300">2-3. 개발 및 사업화 로드맵</h3>
                  <p className="text-xs leading-relaxed pl-1 whitespace-pre-line text-slate-300">
                    {generatedResult.solution.implementationPlan}
                  </p>
                </div>

                {/* Q1~Q4 Development Roadmap Milestone Table */}
                {generatedResult.solution.roadmapTable && generatedResult.solution.roadmapTable.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h3 className="text-sm font-bold text-blue-300">🗓️ 협약 기간 내 개발 및 사업화 마일스톤 로드맵</h3>
                    <div className="overflow-x-auto rounded-xl border border-blue-500/20 bg-slate-950/70">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-blue-950/60 text-blue-200 border-b border-blue-500/20 font-bold">
                          <tr>
                            <th className="p-2.5 w-32">추진 기간</th>
                            <th className="p-2.5">목표 마일스톤</th>
                            <th className="p-2.5">주요 개발/실증 활동</th>
                            <th className="p-2.5 text-emerald-400">최종 산출물</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300 text-[11px]">
                          {generatedResult.solution.roadmapTable.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-900/50">
                              <td className="p-2.5 font-bold text-blue-400 bg-slate-900/50">{row.quarter}</td>
                              <td className="p-2.5 font-semibold text-slate-200">{row.milestone}</td>
                              <td className="p-2.5 text-slate-400">{row.keyActivities}</td>
                              <td className="p-2.5 font-semibold text-emerald-300">{row.output}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── 4. Scale-up Section ── */}
            {generatedResult.scaleUp && (
              <div
                ref={sectionRefs.scaleUp as any}
                className={`space-y-5 border-b pb-8 ${
                  canvasTheme === "dark" ? "border-slate-800" : "border-slate-200"
                }`}
              >
                <h2 className="text-xl font-extrabold text-purple-400 border-l-4 border-purple-500 pl-3">
                  {generatedResult.scaleUp.title || "3. 성장전략 (Scale-up)"}
                </h2>

                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-slate-300">3-1. 비즈니스 모델(BM) 및 수익 구조</h3>
                  <p className="text-xs leading-relaxed pl-1 whitespace-pre-line text-slate-300">
                    {generatedResult.scaleUp.businessModelAndRevenue}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-slate-300">3-2. 초기 시장 진입 및 마케팅 전략</h3>
                  <p className="text-xs leading-relaxed pl-1 whitespace-pre-line text-slate-300">
                    {generatedResult.scaleUp.marketEntryAndMarketing}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-slate-300">3-3. 자금 조달 및 예산 집행 계획</h3>
                  <p className="text-xs leading-relaxed pl-1 whitespace-pre-line text-slate-300">
                    {generatedResult.scaleUp.fundingAndBudgetPlan}
                  </p>
                </div>

                {/* Government Subsidy / Non-cash Space Allocation Table */}
                {generatedResult.scaleUp.budgetTable && generatedResult.scaleUp.budgetTable.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h3 className="text-sm font-bold text-purple-300">
                      {generatedResult.overview.summaryTable?.targetBudget?.includes("비현금성") ||
                      generatedResult.scaleUp.fundingAndBudgetPlan?.includes("입주")
                        ? "🏢 입주 공간 활용 및 연계 지원 / 자체 자금 로드맵"
                        : "💰 정부지원금 비목별 소요 예산 집행 계획표"}
                    </h3>
                    <div className="overflow-x-auto rounded-xl border border-purple-500/20 bg-slate-950/70">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-purple-950/60 text-purple-200 border-b border-purple-500/20 font-bold">
                          <tr>
                            <th className="p-2.5">
                              {generatedResult.overview.summaryTable?.targetBudget?.includes("비현금성")
                                ? "추진 구분"
                                : "비목 구분"}
                            </th>
                            <th className="p-2.5 text-right">
                              {generatedResult.overview.summaryTable?.targetBudget?.includes("비현금성")
                                ? "소요/확보액"
                                : "집행 금액 (원)"}
                            </th>
                            <th className="p-2.5 text-center">비중</th>
                            <th className="p-2.5">
                              {generatedResult.overview.summaryTable?.targetBudget?.includes("비현금성")
                                ? "세부 추진 내용 및 연계 방안"
                                : "세부 산출 근거 및 내역"}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300 text-[11px]">
                          {generatedResult.scaleUp.budgetTable.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-900/50">
                              <td className="p-2.5 font-bold text-purple-300 bg-slate-900/50">{row.category}</td>
                              <td className="p-2.5 font-semibold text-right text-emerald-400">{row.amount}</td>
                              <td className="p-2.5 text-center font-bold text-purple-400">{row.ratio}%</td>
                              <td className="p-2.5 text-slate-400">{row.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── 5. Team Section ── */}
            {generatedResult.team && (
              <div
                ref={sectionRefs.team as any}
                className={`space-y-5 border-b pb-8 ${
                  canvasTheme === "dark" ? "border-slate-800" : "border-slate-200"
                }`}
              >
                <h2 className="text-xl font-extrabold text-emerald-400 border-l-4 border-emerald-500 pl-3">
                  {generatedResult.team.title || "4. 팀 구성 (Team)"}
                </h2>

                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-slate-300">4-1. 대표자 및 핵심 팀원 보유 역량</h3>
                  <p className="text-xs leading-relaxed pl-1 whitespace-pre-line text-slate-300">
                    {generatedResult.team.founderAndTeamCompetency || (generatedResult.team as any).founderCompetence}
                  </p>
                </div>

              {/* Team Personnel R&R Matrix Table */}
              {generatedResult.team.memberList && generatedResult.team.memberList.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h3 className="text-sm font-bold text-emerald-300">👥 핵심 인력 구성 및 업무 분장 (R&R)</h3>
                  <div className="overflow-x-auto rounded-xl border border-emerald-500/20 bg-slate-950/70">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-emerald-950/60 text-emerald-200 border-b border-emerald-500/20 font-bold">
                        <tr>
                          <th className="p-2.5 w-28">직책 / 역할</th>
                          <th className="p-2.5 w-28">성명 / 구분</th>
                          <th className="p-2.5">주요 역량 및 실무 경력</th>
                          <th className="p-2.5">담당 주요 업무</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300 text-[11px]">
                        {generatedResult.team.memberList.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/50">
                            <td className="p-2.5 font-bold text-emerald-400 bg-slate-900/50">{row.role}</td>
                            <td className="p-2.5 font-semibold text-slate-200">{row.nameOrAlias}</td>
                            <td className="p-2.5 text-slate-300">{row.competency}</td>
                            <td className="p-2.5 text-slate-400">{row.mainTask}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="space-y-1.5 pt-2">
                <h3 className="text-sm font-bold text-slate-300">4-2. 역할 분장 및 조직 구성</h3>
                <p className="text-xs leading-relaxed pl-1 whitespace-pre-line text-slate-300">
                  {generatedResult.team.rolesAndResponsibilities}
                </p>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-slate-300">4-3. 외부 협력 네트워크</h3>
                <p className="text-xs leading-relaxed pl-1 whitespace-pre-line text-slate-300">
                  {generatedResult.team.collaborationNetwork}
                </p>
              </div>
            </div>
          )}

            {/* ── 5. Official Notice Form Custom Sections ── */}
            {generatedResult.formSections && generatedResult.formSections.length > 0 && (
              <div
                className={`space-y-5 border-b pb-8 ${
                  canvasTheme === "dark" ? "border-slate-800" : "border-slate-200"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-extrabold text-cyan-400 border-l-4 border-cyan-500 pl-3">
                    5. 공고 공식 서식 항목별 작성문
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[10px] font-bold">
                    공고 공식 HWPX 서식 연동
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  ※ 해당 지원사업 공고의 공식 첨부 서식(HWPX) 항목 및 주관기관 지침에 맞추어 생성된 전문입니다.
                </p>

                <div className="space-y-4">
                  {generatedResult.formSections.map((sec, idx) => (
                    <div
                      key={sec.id || idx}
                      className="p-4 rounded-xl border border-cyan-500/20 bg-slate-950/60 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-bold text-cyan-200">
                          {idx + 1}. [{sec.sectionTitle || "맞춤 서식"}] {sec.label}
                        </h3>
                        {sec.type && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-white text-slate-500 border border-stone-200">
                            {sec.type}
                          </span>
                        )}
                      </div>
                      {sec.guidance && (
                        <div className="text-[11px] text-slate-400 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                          <span className="text-amber-400 font-semibold">※ 주관기관 작성지침:</span> {sec.guidance}
                        </div>
                      )}
                      <p className="text-xs leading-relaxed whitespace-pre-line text-slate-200 pt-1">
                        {sec.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── 6. Evaluation Report Section ── */}
            <PsstEvaluationCard
              evaluationReport={generatedResult.evaluationReport}
              canvasTheme={canvasTheme}
              sectionRef={sectionRefs.evaluation}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col">
          {/* 첨부 전체(HWP·PDF 등)를 한 목록에서 고른다. 예전엔 HWP 선택 드롭다운과
              PDF 원문 줄을 따로(위아래로) 그렸는데, 한 공고 안에서 "어떤 첨부로
              작업할지"는 형식과 무관하게 하나의 선택이라 같은 줄에 합쳤다. HWP를
              고르면 에디터가, PDF를 고르면 PDF 직접 입력 화면이 열린다. */}
          {!hasValidPlan && (formDocuments.length > 1 || unopenableDocuments.length > 0) && (
            <div className="flex-shrink-0 px-4 py-2 border-b border-stone-200 bg-amber-50/60 flex items-center gap-2 overflow-x-auto">
              <FileStack className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
              <span className="text-[11px] font-semibold text-amber-700 flex-shrink-0">
                첨부 {formDocuments.length + unopenableDocuments.length}개 중 작업할 문서
              </span>
              <select
                className="text-[11px] bg-white border border-amber-200 rounded-lg px-2 py-1 text-slate-700 max-w-xs truncate cursor-pointer focus:outline-none focus:border-amber-400"
                value={pdfFillTarget?.fileName || formDocument?.fileName || ""}
                onChange={(e) => {
                  const hwpDoc = formDocuments.find((d) => d.fileName === e.target.value);
                  if (hwpDoc) {
                    setPdfFillTarget(null);
                    onSelectFormDocument?.(hwpDoc);
                    return;
                  }
                  const otherDoc = unopenableDocuments.find((d) => d.fileName === e.target.value);
                  if (!otherDoc) return;
                  if (isPdfFile(otherDoc.fileName)) {
                    setPdfFillTarget(otherDoc);
                  } else {
                    window.open(buildDownloadUrl(otherDoc, { view: true }), "_blank", "noopener,noreferrer");
                  }
                }}
              >
                {formDocuments.map((doc) => (
                  <option key={doc.fileName} value={doc.fileName}>
                    [HWP] {doc.fileName}
                  </option>
                ))}
                {unopenableDocuments.map((doc) => (
                  <option key={doc.fileName} value={doc.fileName}>
                    [{isPdfFile(doc.fileName) ? "PDF" : "원문"}] {doc.fileName}
                  </option>
                ))}
              </select>
              {(pdfFillTarget || formDocument) && (
                <a
                  href={buildDownloadUrl(pdfFillTarget || formDocument!, { view: true })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded-md cursor-pointer"
                  title="새 탭에서 원문 보기"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}

          {pdfFillTarget ? (
            <PdfFormFiller
              fileUrl={pdfFillTarget.fileUrl}
              entryPath={pdfFillTarget.entryPath}
              fileName={pdfFillTarget.fileName}
              supportProgramId={formData.programId}
              onClose={() => setPdfFillTarget(null)}
              getAuthToken={getJwtToken}
            />
          ) : (
            <RhwpEditorPanel
              source={
                hasValidPlan && generatedResult
                  ? {
                      kind: "generated",
                      plan: generatedResult,
                      programTitle: formData.targetProgramTitle,
                      programId: formData.programId,
                    }
                  : formDocument
                  ? {
                      kind: "attachment",
                      fileName: formDocument.fileName,
                      fileUrl: formDocument.fileUrl,
                      entryPath: formDocument.entryPath,
                    }
                  : null
              }
              isLookingUpSource={!hasValidPlan && isFormSchemaLoading}
              programTitle={formData.targetProgramTitle}
              programId={formData.programId}
              savedDocumentId={savedDocumentId}
              onSaved={setSavedDocumentId}
              getAuthToken={getJwtToken}
            />
          )}
        </div>
      )}

      {/* ── Floating Right Index Anchor Nav (Cards View only) ── */}
      {hasValidPlan && viewMode === "cards" && (
        <div className="absolute right-3 top-16 flex flex-col space-y-1.5 z-20">
          <button
            type="button"
            onClick={() => onScrollToSection("overview")}
            className="w-7 h-7 rounded-full bg-slate-900 text-white font-bold text-[9px] shadow-sm flex items-center justify-center hover:scale-110 transition-transform cursor-pointer"
            title="창업아이템 개요"
          >
            개요
          </button>
          <button
            type="button"
            onClick={() => onScrollToSection("problem")}
            className="w-7 h-7 rounded-full bg-white text-slate-500 border border-stone-200 hover:bg-rose-600 hover:text-white font-bold text-[10px] shadow-md flex items-center justify-center hover:scale-110 transition-all cursor-pointer"
            title="P: 문제인식"
          >
            P
          </button>
          <button
            type="button"
            onClick={() => onScrollToSection("solution")}
            className="w-7 h-7 rounded-full bg-white text-slate-500 border border-stone-200 hover:bg-blue-600 hover:text-white font-bold text-[10px] shadow-md flex items-center justify-center hover:scale-110 transition-all cursor-pointer"
            title="S: 실현가능성"
          >
            S
          </button>
          <button
            type="button"
            onClick={() => onScrollToSection("scaleUp")}
            className="w-7 h-7 rounded-full bg-white text-slate-500 border border-stone-200 hover:bg-purple-600 hover:text-white font-bold text-[10px] shadow-md flex items-center justify-center hover:scale-110 transition-all cursor-pointer"
            title="S: 성장전략"
          >
            S
          </button>
          <button
            type="button"
            onClick={() => onScrollToSection("team")}
            className="w-7 h-7 rounded-full bg-white text-slate-500 border border-stone-200 hover:bg-emerald-600 hover:text-white font-bold text-[10px] shadow-md flex items-center justify-center hover:scale-110 transition-all cursor-pointer"
            title="T: 팀구성"
          >
            T
          </button>
          <button
            type="button"
            onClick={() => onScrollToSection("evaluation")}
            className="w-7 h-7 rounded-full bg-slate-800 text-amber-400 border border-slate-700 hover:bg-amber-500 hover:text-white font-bold text-[9px] shadow-md flex items-center justify-center hover:scale-110 transition-all cursor-pointer"
            title="평가리포트"
          >
            평가
          </button>
        </div>
      )}
    </div>
  );
};
