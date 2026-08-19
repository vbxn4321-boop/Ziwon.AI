"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  ExternalLink,
  FileText,
  Sparkles,
  Download,
  CheckCircle2,
  RefreshCw,
  Scale,
  Award,
  AlertOctagon,
  Calendar,
  Layers,
  AlertTriangle,
  FileCheck,
  Eye,
  Search,
  Copy,
  Check,
  FileCode,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { SupportProgram } from "./ProgramCard";

interface ProgramDetailModalProps {
  selectedProgram: SupportProgram;
  onClose: () => void;
  onAnalysisComplete?: (programId: string, updatedAnalysis: any) => void;
}

export const ProgramDetailModal: React.FC<ProgramDetailModalProps> = ({
  selectedProgram,
  onClose,
  onAnalysisComplete,
}) => {
  // Main tabs: AI Analysis ("ai"), Document Viewer ("viewer"), Attachments ("docs"), Official Sources ("sources")
  const [activeTab, setActiveTab] = useState<"ai" | "viewer" | "docs" | "sources">("ai");
  const [isMaximized, setIsMaximized] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [programDocs, setProgramDocs] = useState<any[]>(selectedProgram.documents || []);
  const [selectedDocIndex, setSelectedDocIndex] = useState<number>(0);
  const [showHwpText, setShowHwpText] = useState(false);
  const [viewerSearchQuery, setViewerSearchQuery] = useState<string>("");
  const [isCopied, setIsCopied] = useState(false);
  const [liveAnalysis, setLiveAnalysis] = useState<any>(
    selectedProgram.analyses && selectedProgram.analyses.length > 0 ? selectedProgram.analyses[0] : null
  );

  // Parse structured AI Data safely
  const aiData = useMemo(() => {
    if (!liveAnalysis) return null;
    try {
      return typeof liveAnalysis.resultJson === "string"
        ? JSON.parse(liveAnalysis.resultJson)
        : liveAnalysis.resultJson;
    } catch {
      return null;
    }
  }, [liveAnalysis]);

  // Prioritize PDF documents first so PDF is shown by default in the viewer
  const sortedDocs = useMemo(() => {
    return [...programDocs].sort((a, b) => {
      const aIsPdf = a.fileType?.toUpperCase() === "PDF" || a.fileName?.toLowerCase().endsWith(".pdf");
      const bIsPdf = b.fileType?.toUpperCase() === "PDF" || b.fileName?.toLowerCase().endsWith(".pdf");
      if (aIsPdf && !bIsPdf) return -1;
      if (!aIsPdf && bIsPdf) return 1;
      return 0;
    });
  }, [programDocs]);

  // Current selected document in viewer
  const currentDoc = sortedDocs[selectedDocIndex] || sortedDocs[0] || null;
  const isCurrentPdf =
    currentDoc?.fileType?.toUpperCase() === "PDF" || currentDoc?.fileName?.toLowerCase().endsWith(".pdf");

  // First PDF document index in sortedDocs (which is always 0 if any PDF exists)
  const firstPdfIndex = sortedDocs.findIndex(
    (d) => d.fileType?.toUpperCase() === "PDF" || d.fileName?.toLowerCase().endsWith(".pdf")
  );

  // Fetch updated direct download links when modal opens
  useEffect(() => {
    fetchLatestProgramDetails();
  }, [selectedProgram.id]);

  const fetchLatestProgramDetails = async () => {
    try {
      setIsLoadingDocs(true);
      const res = await fetch(`/api/support-programs/${selectedProgram.id}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          if (json.data.documents) {
            setProgramDocs(json.data.documents);
          }
          if (json.data.analyses && json.data.analyses.length > 0) {
            setLiveAnalysis(json.data.analyses[0]);
          }
        }
      }
    } catch (err) {
      console.warn("Failed to fetch latest program details:", err);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const handleRunLiveAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const res = await fetch(`/api/support-programs/${selectedProgram.id}/analyze`, {
        method: "POST",
      });

      const rawText = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(rawText);
      } catch {
        json = null;
      }

      if (json && json.success && json.analysis) {
        setLiveAnalysis(json.analysis);
        setAnalysisError(null);
        if (onAnalysisComplete) {
          onAnalysisComplete(selectedProgram.id, json.analysis);
        }
        fetchLatestProgramDetails();
      } else {
        const errMsg = json?.error || "AI 분석 서버와의 통신에 실패했습니다. 잠시 후 다시 시도해 주세요.";
        setAnalysisError(errMsg);
      }
    } catch (err: any) {
      setAnalysisError("AI 분석 서버와의 통신에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopyText = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md transition-all">
      <div
        className={`glass-panel w-full transition-all duration-200 overflow-hidden flex flex-col border border-slate-700/80 shadow-2xl ${
          isMaximized
            ? "max-w-[98vw] h-[96vh] rounded-2xl"
            : "max-w-4xl max-h-[90vh] rounded-3xl"
        }`}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-start justify-between gap-4 flex-shrink-0">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {selectedProgram.region}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                {selectedProgram.category}
              </span>
              {aiData && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center space-x-1">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  <span>AI 심층 분석 완료</span>
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-100">{selectedProgram.title}</h2>
            <p className="text-xs text-slate-400">주관기관: {selectedProgram.organizer}</p>
          </div>

          <div className="flex items-center space-x-1.5 flex-shrink-0">
            {/* Maximize / Minimize Toggle Button */}
            <button
              onClick={() => setIsMaximized((prev) => !prev)}
              className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition-colors"
              title={isMaximized ? "기본 크기로 축소" : "전체화면으로 크게 보기"}
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Tab Nav - AI Analysis & Notice Viewer as Main Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/60 px-6 text-xs font-medium space-x-6 overflow-x-auto flex-shrink-0">
          <button
            onClick={() => setActiveTab("ai")}
            className={`py-3 border-b-2 transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === "ai"
                ? "border-indigo-500 text-indigo-400 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>AI 공고 심층 분석</span>
          </button>
          <button
            onClick={() => setActiveTab("viewer")}
            className={`py-3 border-b-2 transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === "viewer"
                ? "border-blue-500 text-blue-400 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {isLoadingDocs ? (
              <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
            ) : (
              <Eye className="w-3.5 h-3.5 text-blue-400" />
            )}
            <span>공고문 뷰어 {isLoadingDocs ? "(가져오는 중...)" : `(${sortedDocs.length})`}</span>
          </button>
          <button
            onClick={() => setActiveTab("docs")}
            className={`py-3 border-b-2 transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === "docs"
                ? "border-blue-500 text-blue-400 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {isLoadingDocs ? (
              <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5" />
            )}
            <span>첨부 서류 {isLoadingDocs ? "(가져오는 중...)" : `(${sortedDocs.length})`}</span>
          </button>
          <button
            onClick={() => setActiveTab("sources")}
            className={`py-3 border-b-2 transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === "sources"
                ? "border-blue-500 text-blue-400 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>원문 출처 ({selectedProgram.sources.length})</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-sm flex-1 flex flex-col">
          {/* 1. Main Tab: AI Deep Analysis */}
          {activeTab === "ai" && (
            <div className="space-y-4 text-xs flex-1">
              {/* Error Notice Banner if any */}
              {analysisError && (
                <div className="bg-rose-950/40 border border-rose-500/40 p-4 rounded-2xl flex items-center justify-between gap-3 text-rose-300">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <span>{analysisError}</span>
                  </div>
                  <button
                    onClick={handleRunLiveAnalysis}
                    disabled={isAnalyzing}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors flex-shrink-0"
                  >
                    다시 시도
                  </button>
                </div>
              )}

              {aiData ? (
                <div className="space-y-4">
                  {/* Top Header Control Card */}
                  <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900 p-4 rounded-2xl border border-indigo-500/30 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-5 h-5 text-indigo-400" />
                      <div>
                        <h3 className="font-bold text-sm text-indigo-200">
                          Gemini AI 공고 구조화 분석 결과
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          공고문 전문 및 첨부 문서를 정밀 분석한 구조화 리포트입니다.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setActiveTab("viewer")}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all flex items-center space-x-1.5"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-400" />
                        <span>공고문 원문 보기</span>
                      </button>
                      <button
                        onClick={handleRunLiveAnalysis}
                        disabled={isAnalyzing}
                        className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-md shadow-indigo-600/30 flex items-center space-x-1.5 disabled:opacity-50"
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? "animate-spin" : ""}`} />
                        <span>{isAnalyzing ? "실시간 분석 중..." : "AI 재분석 실행"}</span>
                      </button>
                    </div>
                  </div>

                  {/* 3 Sentences Executive Summary */}
                  {aiData.summaryReport && Array.isArray(aiData.summaryReport) && (
                    <div className="space-y-2">
                      <h4 className="font-bold text-xs text-indigo-300 uppercase tracking-wider flex items-center space-x-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span>핵심 요약 (3문장 브리핑)</span>
                      </h4>
                      <div className="bg-indigo-950/20 p-4 rounded-xl border border-indigo-500/20 space-y-2">
                        {aiData.summaryReport.map((sentence: string, idx: number) => (
                          <div key={idx} className="flex items-start space-x-2 text-slate-200">
                            <span className="font-bold text-indigo-400 text-xs mt-0.5">{idx + 1}.</span>
                            <p className="leading-relaxed">{sentence}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Key Specs Grid (2 Cards) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-1.5">
                      <span className="text-slate-400 font-semibold flex items-center space-x-1">
                        <span>🎯</span>
                        <span>지원 자격 요건</span>
                      </span>
                      <p className="text-slate-200 text-xs leading-relaxed">
                        {aiData.targetEligibility?.summary || selectedProgram.targetDescription || "공고문 참조"}
                      </p>
                    </div>

                    <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-1.5">
                      <span className="text-slate-400 font-semibold flex items-center space-x-1">
                        <span>💰</span>
                        <span>지원 규모 및 자부담 비율</span>
                      </span>
                      <p className="text-blue-300 font-semibold text-xs leading-relaxed">
                        {aiData.budgetAndAmount?.summary || selectedProgram.budget || "공고문 참조"}
                      </p>
                    </div>
                  </div>

                  {/* Evaluation & Review Criteria Section */}
                  <div className="bg-gradient-to-br from-slate-900 via-indigo-950/20 to-slate-900 p-4 rounded-2xl border border-indigo-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-indigo-300 font-bold text-xs flex items-center space-x-1.5">
                        <Scale className="w-4 h-4 text-indigo-400" />
                        <span>심사 및 검토·평가 기준</span>
                      </span>
                      {aiData.evaluationCriteria?.summary && (
                        <span className="text-[11px] text-slate-400">
                          {aiData.evaluationCriteria.summary}
                        </span>
                      )}
                    </div>

                    {/* Steps flow */}
                    {aiData.evaluationCriteria?.steps && aiData.evaluationCriteria.steps.length > 0 && (
                      <div className="flex items-center flex-wrap gap-2 pt-1 pb-1">
                        {aiData.evaluationCriteria.steps.map((step: string, idx: number) => (
                          <div key={idx} className="flex items-center space-x-1.5">
                            <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-semibold text-[11px] flex items-center space-x-1">
                              <Layers className="w-3 h-3 text-indigo-400" />
                              <span>{step}</span>
                            </span>
                            {idx < aiData.evaluationCriteria.steps.length - 1 && (
                              <span className="text-slate-600 text-xs">➔</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Detailed evaluation items */}
                    {aiData.evaluationCriteria?.items && aiData.evaluationCriteria.items.length > 0 ? (
                      <ul className="list-disc list-inside space-y-1 text-slate-200 text-xs bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                        {aiData.evaluationCriteria.items.map((item: string, idx: number) => (
                          <li key={idx} className="leading-relaxed">
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-slate-400 text-xs">
                        {aiData.evaluationCriteria?.summary || "공고문 내 평가 세부 기준표 참조"}
                      </p>
                    )}
                  </div>

                  {/* Extra Points / Priority Selection & Exclusions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-emerald-950/20 p-4 rounded-xl border border-emerald-500/20 space-y-2">
                      <div className="flex items-center space-x-1.5">
                        <Award className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400 font-bold text-xs">가점 및 우선선정·우대 요건</span>
                      </div>
                      {aiData.extraPoints?.items && aiData.extraPoints.items.length > 0 ? (
                        <ul className="list-disc list-inside space-y-1 text-emerald-200/90 text-xs">
                          {aiData.extraPoints.items.map((pt: string, idx: number) => (
                            <li key={idx} className="leading-relaxed">
                              {pt}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-slate-400 text-xs">
                          {aiData.extraPoints?.summary || "별도 가점/우대 항목 없음"}
                        </p>
                      )}
                      {aiData.extraPoints?.summary && aiData.extraPoints.items?.length > 0 && (
                        <p className="text-[11px] text-emerald-400/80 border-t border-emerald-500/20 pt-1.5">
                          💡 {aiData.extraPoints.summary}
                        </p>
                      )}
                    </div>

                    <div className="bg-rose-950/20 p-4 rounded-xl border border-rose-500/20 space-y-2">
                      <div className="flex items-center space-x-1.5">
                        <AlertOctagon className="w-4 h-4 text-rose-400" />
                        <span className="text-rose-400 font-bold text-xs">지원 제외 및 결격 요건</span>
                      </div>
                      {aiData.excludedConditions?.items && aiData.excludedConditions.items.length > 0 ? (
                        <ul className="list-disc list-inside space-y-1 text-rose-200/90 text-xs">
                          {aiData.excludedConditions.items.map((cond: string, idx: number) => (
                            <li key={idx} className="leading-relaxed">
                              {cond}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-slate-400 text-xs">
                          {aiData.excludedConditions?.summary || "공고문 세부 유의사항 참조"}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Schedule & Documents */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-1.5">
                      <span className="text-slate-400 font-semibold flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                        <span>접수 일정 및 방법</span>
                      </span>
                      <p className="text-slate-200 text-xs leading-relaxed">
                        {aiData.keySchedule?.summary ||
                          (selectedProgram.startDate
                            ? `${new Date(selectedProgram.startDate).toLocaleDateString()} ~ ${
                                selectedProgram.endDate
                                  ? new Date(selectedProgram.endDate).toLocaleDateString()
                                  : "상시"
                              }`
                            : "공고문 참조")}
                      </p>
                    </div>

                    <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-1.5">
                      <span className="text-slate-400 font-semibold flex items-center space-x-1">
                        <FileCheck className="w-3.5 h-3.5 text-blue-400" />
                        <span>필수 제출 서류</span>
                      </span>
                      {aiData.requiredDocuments && aiData.requiredDocuments.length > 0 ? (
                        <ul className="list-disc list-inside space-y-1 text-slate-300 text-xs">
                          {aiData.requiredDocuments.map((doc: string, idx: number) => (
                            <li key={idx} className="truncate">
                              {doc}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-slate-400 text-xs">공고문 참조</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Unanalyzed Program Empty State */
                <div className="space-y-4">
                  {/* Basic Notice Summary Card */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-1">
                      <span className="text-slate-500 font-medium">지원금액 / 규모</span>
                      <p className="text-blue-300 font-semibold text-xs">{selectedProgram.budget || "공고문 참조"}</p>
                    </div>
                    <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-1">
                      <span className="text-slate-500 font-medium">접수기간</span>
                      <p className="text-slate-200 font-semibold text-xs">
                        {selectedProgram.startDate
                          ? `${new Date(selectedProgram.startDate).toLocaleDateString()} ~ ${
                              selectedProgram.endDate
                                ? new Date(selectedProgram.endDate).toLocaleDateString()
                                : "상시"
                            }`
                          : "공고문 참조"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">지원대상 요약</h4>
                    <p className="text-slate-200 bg-slate-900/50 p-4 rounded-xl border border-slate-800 text-xs leading-relaxed">
                      {selectedProgram.targetDescription || "세부 자격 요건은 원문 공고문을 확인하세요."}
                    </p>
                  </div>

                  {/* Document Fetching / Ready Status Banner */}
                  {isLoadingDocs ? (
                    <div className="bg-gradient-to-r from-blue-950/50 via-slate-900 to-blue-950/30 border border-blue-500/30 p-3.5 rounded-2xl flex items-center justify-between text-xs text-blue-300 shadow-md">
                      <div className="flex items-center space-x-2.5">
                        <RefreshCw className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-slate-100">원문 공고 웹페이지에서 공식 첨부서류를 가져오는 중입니다...</p>
                          <p className="text-[11px] text-blue-400/80">공고문(PDF/HWP) 서류를 실시간으로 동기화하고 있습니다.</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 font-bold text-[10px] border border-blue-500/30 hidden sm:inline">
                        서류 가져오는 중
                      </span>
                    </div>
                  ) : sortedDocs.length > 0 ? (
                    <div className="bg-emerald-950/20 border border-emerald-500/20 p-3 rounded-2xl flex items-center justify-between text-xs text-emerald-300">
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>공식 첨부서류 ({sortedDocs.length}개) 준비 완료 — 원문 공고문 기반 정밀 AI 분석이 가능합니다.</span>
                      </div>
                      <button
                        onClick={() => setActiveTab("viewer")}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-2 flex items-center space-x-1 flex-shrink-0"
                      >
                        <Eye className="w-3 h-3" />
                        <span>서류 확인</span>
                      </button>
                    </div>
                  ) : null}

                  {/* AI Analysis CTA */}
                  <div className="bg-gradient-to-br from-indigo-950/40 via-purple-950/30 to-slate-900 p-6 rounded-2xl border border-indigo-500/30 text-center space-y-4">
                    <Sparkles className="w-8 h-8 text-indigo-400 mx-auto" />
                    <div className="space-y-1">
                      <h3 className="font-bold text-slate-100 text-sm">아직 AI 정밀 분석이 실행되지 않았습니다</h3>
                      <p className="text-slate-400 text-xs max-w-md mx-auto leading-relaxed">
                        공고문 전문과 첨부파일을 Gemini AI로 정밀 분석하여 심사·평가기준, 우선선정/가점표, 필수 제출서류를 즉시 구조화합니다.
                      </p>
                    </div>

                    {isAnalyzing ? (
                      <div className="max-w-md mx-auto bg-slate-950/60 p-4 rounded-2xl border border-indigo-500/30 space-y-2.5">
                        <div className="flex items-center justify-center space-x-2 text-indigo-300 font-bold text-xs">
                          <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" />
                          <span>Gemini AI 심층 분석 진행 중...</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 h-full w-full animate-pulse rounded-full" />
                        </div>
                        <p className="text-[11px] text-slate-400">
                          공고문 전문 및 첨부 서식에서 핵심 심사 기준표를 도출하고 있습니다.
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={handleRunLiveAnalysis}
                        disabled={isAnalyzing}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-lg shadow-indigo-600/30 inline-flex items-center space-x-2 disabled:opacity-50"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Google Gemini AI 분석 시작</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. Notice Document Viewer (Prioritizes PDF, Direct Download for HWP) */}
          {activeTab === "viewer" && (
            <div className="space-y-3 flex flex-col flex-1 min-h-[480px]">
              {sortedDocs.length === 0 ? (
                isLoadingDocs ? (
                  /* Loading State when documents are being fetched */
                  <div className="bg-slate-900/60 p-10 rounded-2xl border border-blue-500/20 text-center space-y-4 my-auto">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto text-blue-400 shadow-lg shadow-blue-500/10">
                      <RefreshCw className="w-6 h-6 animate-spin" />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-sm font-bold text-slate-100">공식 첨부서류 및 공고문을 가져오는 중입니다...</p>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                        원문 공고 웹페이지에 연결하여 최신 공고문(PDF)과 신청 서식 파일을 실시간으로 동기화하고 있습니다. 잠시만 기다려주세요.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900/60 p-8 rounded-2xl border border-slate-800 text-center space-y-3 my-auto">
                    <FileText className="w-8 h-8 text-slate-500 mx-auto" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-300">열람 가능한 첨부 문서가 없습니다.</p>
                      <p className="text-xs text-slate-500">본 공고의 첨부파일 링크를 동기화해 보세요.</p>
                    </div>
                    <button
                      onClick={fetchLatestProgramDetails}
                      className="px-3.5 py-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors inline-flex items-center space-x-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>첨부파일 검색 및 동기화</span>
                    </button>
                  </div>
                )
              ) : (
                <>
                  {/* File Selector Tabs (PDF listed first) */}
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-1 flex-shrink-0">
                    <div className="flex items-center space-x-1.5 overflow-x-auto max-w-full pb-1">
                      {sortedDocs.map((doc, idx) => {
                        const isSelected = selectedDocIndex === idx;
                        const isPdf =
                          doc.fileType?.toUpperCase() === "PDF" || doc.fileName?.toLowerCase().endsWith(".pdf");
                        return (
                          <button
                            key={doc.id || idx}
                            onClick={() => {
                              setSelectedDocIndex(idx);
                              setShowHwpText(false);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                              isSelected
                                ? isPdf
                                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                                  : "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                                : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
                            }`}
                          >
                            <span
                              className={`text-[10px] px-1 py-0.2 rounded font-bold ${
                                isPdf ? "bg-blue-900/60 text-blue-200" : "bg-purple-900/60 text-purple-200"
                              }`}
                            >
                              {isPdf ? "PDF 공고문" : "HWP 서식"}
                            </span>
                            <span className="truncate max-w-[180px]">{doc.fileName}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Viewer Controls Toolbar */}
                    {currentDoc && (
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        {isCurrentPdf && (
                          <a
                            href={`/api/download?url=${encodeURIComponent(
                              currentDoc.fileUrl
                            )}&filename=${encodeURIComponent(currentDoc.fileName)}&view=true`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors flex items-center space-x-1 text-xs"
                            title="새 창으로 크게 열기"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                            <span className="text-[11px] hidden sm:inline">새 창 열기</span>
                          </a>
                        )}

                        <a
                          href={`/api/download?url=${encodeURIComponent(currentDoc.fileUrl)}&filename=${encodeURIComponent(
                            currentDoc.fileName
                          )}`}
                          download={currentDoc.fileName}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors flex items-center space-x-1.5 shadow-md shadow-blue-600/20"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span className="text-[11px]">다운로드</span>
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Viewer Content Area */}
                  {currentDoc && (
                    <div className="flex-1 bg-slate-950/70 rounded-2xl border border-slate-800 overflow-hidden flex flex-col min-h-[480px]">
                      {isCurrentPdf ? (
                        /* 1. PDF Documents: Full Viewport PDF Viewer */
                        <div className="w-full h-full flex-1 flex flex-col min-h-[520px]">
                          <iframe
                            src={`/api/download?url=${encodeURIComponent(
                              currentDoc.fileUrl
                            )}&filename=${encodeURIComponent(currentDoc.fileName)}&view=true`}
                            className="w-full h-full flex-1 border-0 rounded-2xl bg-slate-900 min-h-[520px]"
                            title={currentDoc.fileName}
                          />
                        </div>
                      ) : (
                        /* 2. HWP / HWPX / Other Forms: Download-First Action Card */
                        <div className="flex flex-col flex-1 p-6 sm:p-8 items-center justify-center text-center space-y-5 my-auto">
                          <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 shadow-xl shadow-purple-500/10">
                            <FileCode className="w-12 h-12" />
                          </div>

                          <div className="space-y-1.5 max-w-md">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              {currentDoc.fileType || "HWP"} 신청 서식 파일
                            </span>
                            <h3 className="text-base font-bold text-slate-100 break-all pt-1">
                              {currentDoc.fileName}
                            </h3>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              한글(HWP/HWPX) 파일은 직접 작성하고 편집하는 공식 제출 서식입니다.
                              아래 다운로드 버튼을 눌러 원본 파일을 작성하세요.
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                            <a
                              href={`/api/download?url=${encodeURIComponent(
                                currentDoc.fileUrl
                              )}&filename=${encodeURIComponent(currentDoc.fileName)}`}
                              download={currentDoc.fileName}
                              className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-lg shadow-purple-600/30 flex items-center space-x-2"
                            >
                              <Download className="w-4 h-4" />
                              <span>{currentDoc.fileType || "한글"} 서식 파일 다운로드</span>
                            </a>

                            {firstPdfIndex !== -1 && (
                              <button
                                onClick={() => setSelectedDocIndex(firstPdfIndex)}
                                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition-colors flex items-center space-x-1.5"
                              >
                                <Eye className="w-4 h-4 text-blue-400" />
                                <span>공고문(PDF) 원본 보기</span>
                              </button>
                            )}
                          </div>

                          {/* Optional parsed text preview accordion */}
                          {currentDoc.extractedText && currentDoc.extractedText.length > 50 && (
                            <div className="w-full max-w-2xl pt-4 border-t border-slate-800/80 text-left">
                              <button
                                onClick={() => setShowHwpText((prev) => !prev)}
                                className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 p-2 rounded-lg bg-slate-900/60 border border-slate-800 transition-colors"
                              >
                                <span className="flex items-center space-x-1.5">
                                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                                  <span>파싱된 서식 텍스트 미리보기 ({currentDoc.extractedText.length.toLocaleString()}자)</span>
                                </span>
                                {showHwpText ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>

                              {showHwpText && (
                                <div className="mt-2 p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-slate-500">서식 텍스트 내용</span>
                                    <button
                                      onClick={() => handleCopyText(currentDoc.extractedText)}
                                      className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                                    >
                                      {isCopied ? (
                                        <>
                                          <Check className="w-3 h-3 text-emerald-400" />
                                          <span className="text-emerald-400">복사됨!</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3 h-3" />
                                          <span>텍스트 복사</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                  <div className="max-h-48 overflow-y-auto font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap select-text">
                                    {currentDoc.extractedText}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* 3. Documents & Download Tab */}
          {activeTab === "docs" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  공고에 첨부된 신청서식 및 공고문 파일을 직접 다운로드할 수 있습니다:
                </p>
                {isLoadingDocs && (
                  <span className="text-[11px] text-blue-400 flex items-center space-x-1">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>다운로드 링크 동기화 중...</span>
                  </span>
                )}
              </div>

              {sortedDocs.length === 0 ? (
                isLoadingDocs ? (
                  <div className="bg-slate-900/60 p-10 rounded-2xl border border-blue-500/20 text-center space-y-4 my-auto">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto text-blue-400 shadow-lg shadow-blue-500/10">
                      <RefreshCw className="w-6 h-6 animate-spin" />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-sm font-bold text-slate-100">공식 첨부서류를 가져오는 중입니다...</p>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                        공고 원문 페이지에서 첨부 서류(신청서식, 공고문) 다운로드 링크를 추출하고 있습니다. 잠시만 기다려주세요.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 text-center space-y-2">
                    <p className="text-xs text-slate-400">등록된 첨부 문서 파일이 아직 없습니다.</p>
                    <button
                      onClick={fetchLatestProgramDetails}
                      className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors inline-flex items-center space-x-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>첨부파일 검색 및 동기화</span>
                    </button>
                  </div>
                )
              ) : (
                sortedDocs.map((doc, idx) => {
                  const isDirectDownload =
                    doc.fileUrl &&
                    (doc.fileUrl.includes("fileDown.do") ||
                      doc.fileUrl.includes("FileDown.do") ||
                      doc.fileUrl.match(/\.(pdf|hwp|hwpx|docx|zip)$/i));

                  const downloadHref = isDirectDownload
                    ? `/api/download?url=${encodeURIComponent(doc.fileUrl)}&filename=${encodeURIComponent(
                        doc.fileName
                      )}`
                    : doc.fileUrl;

                  const isPdf =
                    doc.fileType?.toUpperCase() === "PDF" || doc.fileName?.toLowerCase().endsWith(".pdf");

                  return (
                    <div
                      key={doc.id || idx}
                      className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex items-center justify-between text-xs gap-3"
                    >
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <div
                          className={`p-2 rounded-lg border flex-shrink-0 ${
                            isPdf
                              ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
                              : "bg-purple-500/10 border-purple-500/20 text-purple-400"
                          }`}
                        >
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5 truncate">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-slate-200 truncate">{doc.fileName}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                isPdf ? "bg-blue-900/60 text-blue-300" : "bg-purple-900/60 text-purple-300"
                              }`}
                            >
                              {doc.fileType || (isPdf ? "PDF" : "HWP")}
                            </span>
                          </div>
                          {doc.extractedText && doc.extractedText.length > 50 && (
                            <div className="flex items-center space-x-1 text-[10px] text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>AI 텍스트 분석 완료 ({doc.extractedText.length.toLocaleString()}자)</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0">
                        {isPdf && (
                          <button
                            onClick={() => {
                              setSelectedDocIndex(idx);
                              setActiveTab("viewer");
                            }}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center space-x-1"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-400" />
                            <span>뷰어로 보기</span>
                          </button>
                        )}

                        {isDirectDownload ? (
                          <a
                            href={downloadHref}
                            download={doc.fileName}
                            className={`px-3.5 py-1.5 rounded-lg text-white font-bold transition-all shadow-md flex items-center space-x-1.5 ${
                              isPdf
                                ? "bg-blue-600 hover:bg-blue-500 shadow-blue-600/20"
                                : "bg-purple-600 hover:bg-purple-500 shadow-purple-600/20"
                            }`}
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>다운로드</span>
                          </a>
                        ) : (
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center space-x-1.5"
                          >
                            <span>공고 링크</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* 4. Official Source Portals Tab */}
          {activeTab === "sources" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                본 공고는 아래 공식 기관 포털에서 수집 및 정규화되었습니다:
              </p>
              {selectedProgram.sources.map((src) => (
                <div
                  key={src.id}
                  className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="space-y-1">
                    <span className="font-semibold text-slate-200">
                      [{src.sourceType}] {src.rawTitle}
                    </span>
                    <p className="text-[11px] text-slate-500 truncate max-w-md">{src.sourceUrl}</p>
                  </div>
                  <a
                    href={src.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 transition-colors flex items-center space-x-1"
                  >
                    <span>원문 보기</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
