"use client";

import React, { useState } from "react";
import { X, Info, ExternalLink, FileText, Sparkles, Download } from "lucide-react";
import { SupportProgram } from "./ProgramCard";

interface ProgramDetailModalProps {
  selectedProgram: SupportProgram;
  onClose: () => void;
}

export const ProgramDetailModal: React.FC<ProgramDetailModalProps> = ({ selectedProgram, onClose }) => {
  const [activeTab, setActiveTab] = useState<"overview" | "sources" | "docs" | "ai">("overview");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [liveAnalysis, setLiveAnalysis] = useState<any>(
    selectedProgram.analyses && selectedProgram.analyses.length > 0 ? selectedProgram.analyses[0] : null
  );

  const handleRunLiveAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch(`/api/support-programs/${selectedProgram.id}/analyze`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success && json.analysis) {
        setLiveAnalysis(json.analysis);
      }
    } catch (err) {
      console.error("Live AI analysis failed:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="glass-panel w-full max-w-3xl max-h-[85vh] rounded-3xl overflow-hidden flex flex-col border border-slate-700/80 shadow-2xl">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {selectedProgram.region}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                {selectedProgram.category}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-100">{selectedProgram.title}</h2>
            <p className="text-xs text-slate-400">주관기관: {selectedProgram.organizer}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tab Nav */}
        <div className="flex border-b border-slate-800 bg-slate-900/60 px-6 text-xs font-medium space-x-6">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-3 border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === "overview"
                ? "border-blue-500 text-blue-400 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>공고 개요</span>
          </button>
          <button
            onClick={() => setActiveTab("sources")}
            className={`py-3 border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === "sources"
                ? "border-blue-500 text-blue-400 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>원문 출처 ({selectedProgram.sources.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("docs")}
            className={`py-3 border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === "docs"
                ? "border-blue-500 text-blue-400 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>첨부 서류 ({selectedProgram.documents.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            className={`py-3 border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === "ai"
                ? "border-blue-500 text-blue-400 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>AI 공고 분석 캐시</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-sm flex-1">
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-500 font-medium">지원금액 / 규모</span>
                  <p className="text-blue-300 font-semibold text-sm">{selectedProgram.budget || "공고문 참조"}</p>
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
            </div>
          )}

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

          {activeTab === "docs" && (
            <div className="space-y-3">
              {selectedProgram.documents.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">등록된 첨부 문서 파일이 없습니다.</p>
              ) : (
                selectedProgram.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-3">
                      <FileText className="w-4 h-4 text-blue-400" />
                      <span className="font-medium text-slate-200">{doc.fileName}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        {doc.fileType}
                      </span>
                    </div>
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 transition-colors flex items-center space-x-1.5"
                    >
                      <span>공고 페이지에서 파일 다운로드</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "ai" && (
            <div className="space-y-4 text-xs">
              {liveAnalysis ? (
                (() => {
                  let aiData: any = null;
                  try {
                    aiData = typeof liveAnalysis.resultJson === "string"
                      ? JSON.parse(liveAnalysis.resultJson)
                      : liveAnalysis.resultJson;
                  } catch (e) {
                    aiData = null;
                  }

                  if (!aiData) {
                    return (
                      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 text-slate-400">
                        Gemini AI 분석 데이터 형식을 파싱하는 중입니다...
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {/* Top Header Card */}
                      <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900 p-4 rounded-2xl border border-indigo-500/30 flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center space-x-2">
                          <Sparkles className="w-5 h-5 text-indigo-400" />
                          <div>
                            <h3 className="font-bold text-sm text-indigo-200">Gemini 3.6 Flash 공고 구조화 분석 결과</h3>
                            <p className="text-[11px] text-slate-400">AI가 공고문 원문을 요약 분석한 정규 리포트입니다.</p>
                          </div>
                        </div>

                        <button
                          onClick={handleRunLiveAnalysis}
                          disabled={isAnalyzing}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-md shadow-indigo-600/30 flex items-center space-x-1.5 disabled:opacity-50"
                        >
                          <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? "animate-spin" : ""}`} />
                          <span>{isAnalyzing ? "실시간 분석 요청 중..." : "AI 재분석 실행 (POST API)"}</span>
                        </button>
                      </div>

                      {/* 3-Line Summary Report */}
                      {aiData.summaryReport && (
                        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-2">
                          <h4 className="font-bold text-slate-300 flex items-center space-x-1.5 text-xs">
                            <span>💡 핵심 요약 리포트</span>
                          </h4>
                          <ul className="space-y-1.5 text-slate-300 pl-1">
                            {aiData.summaryReport.map((line: string, i: number) => (
                              <li key={i} className="flex items-start space-x-2">
                                <span className="text-indigo-400 font-bold">•</span>
                                <span className="leading-snug">{line}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Grid Sections */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Target Eligibility */}
                        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-2">
                          <h4 className="font-bold text-blue-300 flex items-center space-x-1.5 text-xs">
                            <span>🎯 지원자격 & 요건</span>
                          </h4>
                          <p className="text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded-xl border border-slate-850">
                            {aiData.targetEligibility?.summary || "공고문 참조"}
                          </p>
                        </div>

                        {/* Budget & Amount */}
                        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-2">
                          <h4 className="font-bold text-emerald-300 flex items-center space-x-1.5 text-xs">
                            <span>💰 지원규모 & 혜택</span>
                          </h4>
                          <p className="text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded-xl border border-slate-850">
                            {aiData.budgetAndAmount?.summary || selectedProgram.budget || "공고문 참조"}
                          </p>
                        </div>

                        {/* Extra Points */}
                        {aiData.extraPoints && (
                          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-2">
                            <h4 className="font-bold text-purple-300 flex items-center space-x-1.5 text-xs">
                              <span>⭐ 우대사항 & 가점 항목</span>
                            </h4>
                            <p className="text-slate-400 text-[11px]">{aiData.extraPoints.summary}</p>
                            {aiData.extraPoints.items && aiData.extraPoints.items.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {aiData.extraPoints.items.map((item: string, idx: number) => (
                                  <span key={idx} className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[11px]">
                                    + {item}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Excluded Conditions */}
                        {aiData.excludedConditions && (
                          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-2">
                            <h4 className="font-bold text-red-300 flex items-center space-x-1.5 text-xs">
                              <span>🚫 지원 제외 조건</span>
                            </h4>
                            <p className="text-slate-400 text-[11px]">{aiData.excludedConditions.summary}</p>
                            {aiData.excludedConditions.items && aiData.excludedConditions.items.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {aiData.excludedConditions.items.map((item: string, idx: number) => (
                                  <span key={idx} className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-300 border border-red-500/20 text-[11px]">
                                    ✕ {item}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Required Documents */}
                      {aiData.requiredDocuments && aiData.requiredDocuments.length > 0 && (
                        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-2">
                          <h4 className="font-bold text-amber-300 flex items-center space-x-1.5 text-xs">
                            <span>📝 필수 제출 서류 목록</span>
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {aiData.requiredDocuments.map((docItem: string, idx: number) => (
                              <div key={idx} className="bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-800 text-slate-300 text-xs flex items-center space-x-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                                <span>{docItem}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="bg-indigo-950/30 border border-indigo-500/20 p-6 rounded-2xl space-y-4 text-xs text-center">
                  <Sparkles className="w-8 h-8 text-indigo-400 mx-auto animate-pulse" />
                  <div className="space-y-1">
                    <span className="font-bold text-indigo-200 block text-sm">Gemini AI 실시간 분석 실행</span>
                    <p className="text-slate-400 max-w-md mx-auto leading-relaxed text-xs">
                      버튼을 누르면 브라우저에서 서버 API를 통해 Gemini AI가 첨부 공고문을 즉시 파싱 및 요약합니다.
                    </p>
                  </div>
                  <button
                    onClick={handleRunLiveAnalysis}
                    disabled={isAnalyzing}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all inline-flex items-center space-x-2 disabled:opacity-50"
                  >
                    <Sparkles className={`w-4 h-4 ${isAnalyzing ? "animate-spin" : ""}`} />
                    <span>{isAnalyzing ? "Gemini AI 분석 진행 중 (Network POST)..." : "✨ AI 실시간 요약 분석 실행 (Network POST)"}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs">
          <span className="text-slate-500">ID: {selectedProgram.id}</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
