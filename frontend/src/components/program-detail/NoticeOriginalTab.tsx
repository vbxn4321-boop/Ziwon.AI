"use client";

import React, { useState } from "react";
import {
  FileText,
  RefreshCw,
  ExternalLink,
  Download,
  Maximize2,
  Minimize2,
  ZoomIn,
} from "lucide-react";

interface NoticeOriginalTabProps {
  sortedDocs: any[];
  selectedDocIndex: number;
  setSelectedDocIndex: (idx: number) => void;
  onRefresh: () => void;
}

export const NoticeOriginalTab: React.FC<NoticeOriginalTabProps> = ({
  sortedDocs,
  selectedDocIndex,
  setSelectedDocIndex,
  onRefresh,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const currentDoc = sortedDocs[selectedDocIndex] || sortedDocs[0] || null;
  const isCurrentPdf =
    currentDoc?.fileType?.toUpperCase() === "PDF" || currentDoc?.fileName?.toLowerCase().endsWith(".pdf");

  if (sortedDocs.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4 shadow-xs">
        <FileText className="w-12 h-12 text-slate-400 mx-auto" />
        <div className="space-y-1">
          <h3 className="font-bold text-slate-900 text-sm">열람 가능한 첨부 문서가 아직 동기화되지 않았습니다</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            원문 공고 웹페이지에 연결하여 최신 공고문(PDF)과 신청 서식 파일을 실시간으로 검색하고 동기화합니다.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center space-x-2 shadow-xs cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>공식 첨부 서류 실시간 동기화</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Document Selector Pills (PDF listed first) */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-1">
        <div className="flex items-center space-x-2 overflow-x-auto max-w-full pb-1">
          {sortedDocs.map((doc, idx) => {
            const isPdf = doc.fileType?.toUpperCase() === "PDF" || doc.fileName?.toLowerCase().endsWith(".pdf");
            const isSelected = idx === selectedDocIndex;
            return (
              <button
                key={doc.id || idx}
                onClick={() => setSelectedDocIndex(idx)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 whitespace-nowrap flex-shrink-0 cursor-pointer border shadow-2xs ${
                  isSelected
                    ? isPdf
                      ? "bg-blue-600 text-white border-blue-600 font-bold"
                      : "bg-indigo-600 text-white border-indigo-600 font-bold"
                    : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200"
                }`}
              >
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-extrabold ${
                    isPdf ? "bg-white/20 text-white" : "bg-white/20 text-white"
                  }`}
                >
                  {isPdf ? "PDF 공고문" : "HWP 서식"}
                </span>
                <span className="truncate max-w-[220px]">{doc.fileName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Viewer Canvas */}
      {currentDoc && (
        <div
          className={`bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col transition-all duration-200 ${
            isExpanded ? "min-h-[1150px] h-[95vh]" : "min-h-[900px] h-[85vh]"
          }`}
        >
          {/* Viewer Header */}
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center space-x-2 min-w-0">
              <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="font-bold text-slate-800 truncate max-w-md">{currentDoc.fileName}</span>
            </div>
            <div className="flex items-center space-x-2">
              {isCurrentPdf && (
                <>
                  {/* Height Toggle (A4 Large / Standard) */}
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors flex items-center space-x-1 font-semibold shadow-2xs cursor-pointer"
                    title={isExpanded ? "표준 높이로 축소" : "A4 세로 확장 보기"}
                  >
                    {isExpanded ? <Minimize2 className="w-3.5 h-3.5 text-slate-600" /> : <Maximize2 className="w-3.5 h-3.5 text-blue-600" />}
                    <span>{isExpanded ? "표준 크기" : "A4 세로 크게보기"}</span>
                  </button>

                  <a
                    href={`/api/download?url=${encodeURIComponent(
                      currentDoc.fileUrl
                    )}&filename=${encodeURIComponent(currentDoc.fileName)}&view=true#view=FitH`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors flex items-center space-x-1 font-semibold shadow-2xs"
                    title="새 창으로 크게 보기"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                    <span>새 창 열기</span>
                  </a>
                </>
              )}

              <a
                href={`/api/download?url=${encodeURIComponent(
                  currentDoc.fileUrl
                )}&filename=${encodeURIComponent(currentDoc.fileName)}`}
                download={currentDoc.fileName}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors flex items-center space-x-1.5 shadow-sm shadow-blue-600/20 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isCurrentPdf ? "PDF 원본 다운로드" : "한글(HWP) 서식 다운로드"}</span>
              </a>
            </div>
          </div>

          {/* Viewer Body */}
          <div className="flex-1 bg-[#2b2b2b] p-0 flex flex-col h-full">
            {isCurrentPdf ? (
              <iframe
                src={`/api/download?url=${encodeURIComponent(
                  currentDoc.fileUrl
                )}&filename=${encodeURIComponent(currentDoc.fileName)}&view=true#view=FitH&toolbar=1&navpanes=0`}
                className="w-full flex-1 h-full border-0 bg-white"
                style={{ minHeight: isExpanded ? "1100px" : "850px" }}
                title={currentDoc.fileName}
              />
            ) : (
              <div className="flex-1 p-6 text-slate-800 space-y-4 max-h-[850px] overflow-y-auto custom-scrollbar bg-slate-50">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-xs text-blue-800 flex items-center justify-between">
                  <span>💡 한글(HWP) 파일 텍스트 추출본입니다. 표/서식 작성은 상단 [한글 서식 다운로드] 후 한글 오피스에서 직접 진행해 주세요.</span>
                </div>
                <div className="font-mono text-xs whitespace-pre-wrap leading-relaxed select-text bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
                  {currentDoc.extractedText || "문서 텍스트를 불러올 수 없습니다. 상단 [원본 다운로드] 버튼을 눌러 확인해 주세요."}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
