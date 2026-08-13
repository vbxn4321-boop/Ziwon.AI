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
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "ai" && (
            <div className="bg-indigo-950/30 border border-indigo-500/20 p-5 rounded-2xl space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span className="font-semibold text-indigo-200">On-Demand Gemini AI 공고 분석 캐시</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                  비용 최적화 캐싱 적용
                </span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                사용자 클릭 시점에 공고문 전체 파싱 후 자격요건, 혜택, 필수 제출 서류 및 평가 가점 항목을 자동 구조화합니다.
              </p>
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
