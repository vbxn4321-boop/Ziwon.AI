"use client";

import React, { useState } from "react";
import { Edit3, FileText, Sparkles, Loader2, CheckCircle2, FileCode, Layers } from "lucide-react";
import { PsstBusinessPlanResult } from "@/lib/ai/psst-generator";
import { CanvasTheme, PsstFormData, PsstSectionKey } from "../types";
import type { FormSchema } from "@/lib/parser/form-schema-parser";
import { SECTION_LABELS } from "../constants";
import { PsstEvaluationCard } from "./PsstEvaluationCard";
import { A4DocumentEditor } from "./A4DocumentEditor";
import { RhwpPageViewer } from "@/components/viewer/RhwpPageViewer";

interface PsstDocumentViewerProps {
  canvasTheme: CanvasTheme;
  formSchema?: FormSchema | null;
  activeSection: PsstSectionKey;
  generatedResult: PsstBusinessPlanResult | null;
  formData: PsstFormData;
  isGenerating?: boolean;
  isDirectEditing: boolean;
  setIsDirectEditing: React.Dispatch<React.SetStateAction<boolean>>;
  docScrollRef: React.RefObject<HTMLDivElement | null>;
  sectionRefs: Record<PsstSectionKey, React.RefObject<HTMLDivElement | null>>;
  onScrollToSection: (sec: PsstSectionKey) => void;
  onImportedPlanText?: (text: string) => void;
  formDocumentNames?: string[];
  formDocument?: { fileName: string; fileUrl: string; entryPath?: string | null; extractedText?: string | null } | null;
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
  formSchema = null,
  activeSection,
  generatedResult,
  formData,
  isGenerating = false,
  isDirectEditing,
  setIsDirectEditing,
  docScrollRef,
  sectionRefs,
  onScrollToSection,
  onImportedPlanText,
  formDocumentNames = [],
  formDocument = null,
}) => {
  const [viewMode, setViewMode] = useState<"a4" | "cards">("a4");
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [importedText, setImportedText] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [formView, setFormView] = useState<"edit" | "source">("edit");
  const [rawDocumentText, setRawDocumentText] = useState("");

  const handleImportPlan = async (file: File) => {
    setIsImporting(true);
    setImportError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/ai/import-plan", { method: "POST", body });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "파일을 읽지 못했습니다.");
      const text = result.text || "";
      setImportedText(text);
      onImportedPlanText?.(text);

      // 기존 문서의 제목·소제목 주변 문단을 같은 서식 칸에 우선 채운다.
      // 매칭되지 않은 칸은 비워 두어 챗봇이 추가 질문할 대상으로 남긴다.
      if (formSchema?.fields?.length && text) {
        const paragraphs = text.split(/\n{1,2}|(?<=[.!?다요])\s{2,}/).map((p: string) => p.trim()).filter(Boolean);
        const nextValues: Record<string, string> = {};
        for (const field of formSchema.fields) {
          if (field.type === "PERSONAL" || field.type === "CONSENT" || !field.label) continue;
          const keywords = field.label.replace(/[^가-힣A-Za-z0-9 ]/g, " ").split(/\s+/).filter((word: string) => word.length >= 2);
          if (!keywords.length) continue;
          const match = paragraphs.find((paragraph: string) => {
            const normalized = paragraph.toLowerCase();
            return keywords.filter((word: string) => normalized.includes(word.toLowerCase())).length >= Math.min(2, keywords.length);
          });
          if (match) nextValues[field.id] = match.slice(0, 3000);
        }
        setFormValues((current) => ({ ...current, ...nextValues }));
      }
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "파일을 읽지 못했습니다.");
    } finally {
      setIsImporting(false);
    }
  };
  const hasValidPlan = !!(generatedResult && generatedResult.overview && generatedResult.overview.title);
  const displaySchema = formSchema;
  const aiFields = displaySchema?.fields.filter((field) => field.type !== "PERSONAL" && field.type !== "CONSENT") || [];
  const missingImportedFields = importedText
    ? aiFields.filter((field) => !formValues[field.id]?.trim()).length
    : 0;

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
            {/* View Mode Toggle: A4 Editor vs Cards View */}
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
                <span>A4 문서</span>
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

            {viewMode === "cards" && (
              <button
                type="button"
                onClick={() => setIsDirectEditing((prev) => !prev)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 border cursor-pointer ${
                  isDirectEditing
                    ? "bg-emerald-600 text-white border-emerald-500 shadow-md"
                    : canvasTheme === "dark"
                    ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                }`}
              >
                <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isDirectEditing ? "💾 편집 완료" : "✏️ 직접편집"}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 문서 내 이동용 목차. 대화의 목차(어느 칸을 채우는 중인가)와 역할이 달라서
          이건 생성된 문서를 훑는 스크롤 내비게이션이다. 문서가 없으면 쓸모가
          없으므로 초안이 나온 뒤에만 띄운다. */}
      {hasValidPlan && (
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

      {/* Main Viewport Content */}
      {hasValidPlan && generatedResult && viewMode === "a4" ? (
        <A4DocumentEditor
          plan={generatedResult}
          programTitle={formData.targetProgramTitle}
          programId={formData.programId}
          isDirectEditing={isDirectEditing}
          setIsDirectEditing={setIsDirectEditing}
          canvasTheme={canvasTheme}
        />
      ) : (
        <div ref={docScrollRef as any} className="flex-1 p-4 sm:p-8 overflow-y-auto space-y-6 flex flex-col">
          {isGenerating ? (
            /* Real-time AI Generation Loading View */
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
          ) : hasValidPlan && generatedResult ? (
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
        ) : (
          /* Show the actual attached form before AI generation. */
          displaySchema ? (
            <div className="w-full px-3 sm:px-5 py-4 sm:py-6">
              <div className="bg-white border border-stone-200 rounded-xl shadow-[0_2px_8px_rgba(15,23,42,0.04)] px-4 sm:px-6 py-5">
                <p className="text-[11px] font-semibold text-indigo-600 mb-2">공고 첨부 서식</p>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">{displaySchema.title || "사업계획서 서식"}</h1>
                <p className="text-sm text-slate-500 mb-8">첨부파일의 작성 항목을 직접 입력할 수 있습니다. AI 질문은 왼쪽에서 진행됩니다.</p>
                <div className="mb-5 flex items-center gap-2 border-b border-stone-200 pb-3">
                  <button type="button" onClick={() => setFormView("edit")} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${formView === "edit" ? "bg-indigo-600 text-white" : "bg-stone-100 text-slate-600"}`}>편집 에디터</button>
                  <button type="button" onClick={() => setFormView("source")} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${formView === "source" ? "bg-indigo-600 text-white" : "bg-stone-100 text-slate-600"}`}>원본 서식 보기</button>
                </div>
                {formDocument?.fileUrl && (
                  <div className={`${formView === "source" ? "" : "hidden"} mb-6 overflow-hidden rounded-xl border border-stone-200 bg-slate-950 min-h-[520px]`}>
                    <RhwpPageViewer
                      fileName={formDocument.fileName}
                      fileUrl={formDocument.fileUrl}
                      entryPath={formDocument.entryPath}
                      extractedText={formDocument.extractedText}
                    />
                  </div>
                )}
                <div className="mb-8 rounded-lg border border-dashed border-stone-300 bg-stone-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div><p className="text-sm font-semibold text-slate-700">기존 사업계획서 가져오기</p><p className="text-xs text-slate-400 mt-1">PDF·DOCX·HWPX 파일을 읽어 현재 서식과 비교합니다.</p></div>
                    <label className="shrink-0 cursor-pointer rounded-md bg-white border border-stone-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-indigo-300">
                      {isImporting ? "읽는 중…" : "파일 선택"}
                      <input type="file" accept=".pdf,.docx,.hwpx,.hwp,.txt" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleImportPlan(file); }} />
                    </label>
                  </div>
                  {importError && <p className="mt-2 text-xs text-rose-600">{importError}</p>}
                  {importedText && <p className="mt-3 max-h-20 overflow-hidden text-xs leading-relaxed text-emerald-700">기존 문서 내용을 서식 항목에 자동 매칭했습니다. {missingImportedFields > 0 ? `미매칭 항목 ${missingImportedFields}개는 왼쪽 AI가 추가로 질문합니다.` : "모든 작성 가능 항목이 채워졌습니다."}</p>}
                </div>
                <div className={`${formView === "edit" ? "" : "hidden"} space-y-5`}>
                  <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-700">이 영역에서 공고 서식 항목을 직접 작성하고 수정할 수 있습니다.</div>
                  {displaySchema.fields.map((field) => (
                    <label key={field.id} className="block">
                      <span className="block text-sm font-semibold text-slate-700 mb-1.5">{field.label}</span>
                      {field.guidance && <span className="block text-xs text-slate-400 mb-2">{field.guidance}</span>}
                      <textarea
                        value={formValues[field.id] || ""}
                        onChange={(event) => setFormValues((prev) => ({ ...prev, [field.id]: event.target.value }))}
                        className="w-full min-h-20 resize-y rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:bg-white"
                        placeholder="이 항목의 내용을 입력하세요."
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ) : (
          /* 실제 첨부 서식만 표시하며, 표준 템플릿으로 대체하지 않는다. */
          <div className="w-full px-3 sm:px-5 py-4 sm:py-6">
            <div className="min-h-[560px] bg-white border border-stone-200 rounded-xl shadow-[0_2px_8px_rgba(15,23,42,0.04)] px-8 sm:px-14 py-12">
              <FileText className="w-8 h-8 text-indigo-500 mb-6" />
              <p className="text-[11px] font-semibold text-indigo-600 mb-2">공고 첨부 서식</p>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 mb-4">{formDocument ? "첨부 서식 편집" : "실제 서식을 불러오는 중입니다"}</h1>
              <p className="text-sm text-slate-500 leading-relaxed max-w-lg">
                표준 템플릿으로 대체하지 않고 해당 공고의 첨부 서식만 표시합니다.
              </p>
              {formDocumentNames.length > 0 && <p className="mt-6 text-xs text-slate-400">확인 중인 첨부파일: {formDocumentNames.join(", ")}</p>}
              {formDocument?.fileUrl && (
                <div className="mt-8 overflow-hidden rounded-xl border border-stone-200">
                  <RhwpPageViewer fileName={formDocument.fileName} fileUrl={formDocument.fileUrl} entryPath={formDocument.entryPath} extractedText={formDocument.extractedText} />
                </div>
              )}
              {formDocument && (
                <div className="mt-6 rounded-xl border border-indigo-100 bg-white p-4 text-left">
                  <p className="mb-2 text-sm font-semibold text-slate-700">편집 에디터</p>
                  <p className="mb-3 text-xs text-slate-500">원본 서식이 지원되지 않는 형식이어도 추출된 내용을 직접 수정할 수 있습니다.</p>
                  <textarea
                    value={rawDocumentText || formDocument.extractedText || ""}
                    onChange={(event) => setRawDocumentText(event.target.value)}
                    className="min-h-[320px] w-full resize-y rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm leading-6 text-slate-800 outline-none focus:border-indigo-400 focus:bg-white"
                    placeholder="추출된 서식 내용을 입력하거나 수정하세요."
                  />
                </div>
              )}
            </div>
          </div>
          )
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
