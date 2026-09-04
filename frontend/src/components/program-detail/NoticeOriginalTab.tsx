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
  ZoomOut,
  RotateCcw,
  Image as ImageIcon,
  Copy,
  Check,
  FileCode,
} from "lucide-react";
import {
  getDocCategory,
  getDocBadgeText,
  getDocDownloadText,
  DocCategory,
} from "./detail-helpers";
import { HwpExtractedTextViewer } from "./HwpExtractedTextViewer";

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
  const [imageZoom, setImageZoom] = useState(1);
  const [copied, setCopied] = useState(false);

  const currentDoc = sortedDocs[selectedDocIndex] || sortedDocs[0] || null;
  const currentCategory: DocCategory = getDocCategory(currentDoc);

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (sortedDocs.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4 shadow-xs">
        <FileText className="w-12 h-12 text-slate-400 mx-auto" />
        <div className="space-y-1">
          <h3 className="font-bold text-slate-900 text-sm">열람 가능한 첨부 문서가 아직 동기화되지 않았습니다</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            원문 공고 웹페이지에 연결하여 최신 공고문(PDF/이미지)과 신청 서식 파일을 실시간으로 검색하고 동기화합니다.
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
      {/* Document Selector Pills */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-1">
        <div className="flex items-center space-x-2 overflow-x-auto max-w-full pb-1">
          {sortedDocs.map((doc, idx) => {
            const cat = getDocCategory(doc);
            const badgeLabel = getDocBadgeText(cat);
            const isSelected = idx === selectedDocIndex;

            // Pill badge styling based on category
            const getBadgeClass = () => {
              if (isSelected) {
                if (cat === "pdf") return "bg-blue-600 text-white border-blue-600 font-bold";
                if (cat === "image") return "bg-emerald-600 text-white border-emerald-600 font-bold";
                if (cat === "hwp") return "bg-indigo-600 text-white border-indigo-600 font-bold";
                return "bg-slate-800 text-white border-slate-800 font-bold";
              }
              return "bg-white text-slate-700 hover:bg-slate-50 border-slate-200";
            };

            return (
              <button
                key={doc.id || idx}
                onClick={() => {
                  setSelectedDocIndex(idx);
                  setImageZoom(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 whitespace-nowrap flex-shrink-0 cursor-pointer border shadow-2xs ${getBadgeClass()}`}
              >
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-extrabold ${
                    isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {badgeLabel}
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
            isExpanded ? "min-h-[1150px] h-[95vh]" : "min-h-[850px] h-[85vh]"
          }`}
        >
          {/* Viewer Header Toolbar */}
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center space-x-2 min-w-0">
              {currentCategory === "image" ? (
                <ImageIcon className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : currentCategory === "pdf" ? (
                <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
              ) : (
                <FileCode className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              )}
              <span className="font-bold text-slate-800 truncate max-w-md">{currentDoc.fileName}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-slate-200 text-slate-700 hidden sm:inline">
                {getDocBadgeText(currentCategory)}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {/* PDF Toolbar Controls */}
              {currentCategory === "pdf" && (
                <>
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

              {/* Image Toolbar Controls */}
              {currentCategory === "image" && (
                <>
                  <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                    <button
                      onClick={() => setImageZoom((prev) => Math.max(0.5, prev - 0.25))}
                      className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
                      title="축소"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] font-bold text-slate-600 px-1 min-w-[42px] text-center">
                      {Math.round(imageZoom * 100)}%
                    </span>
                    <button
                      onClick={() => setImageZoom((prev) => Math.min(3, prev + 0.25))}
                      className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
                      title="확대"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setImageZoom(1)}
                      className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 cursor-pointer"
                      title="원본 크기 초기화"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>

                  <a
                    href={`/api/download?url=${encodeURIComponent(
                      currentDoc.fileUrl
                    )}&filename=${encodeURIComponent(currentDoc.fileName)}&view=true`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors flex items-center space-x-1 font-semibold shadow-2xs"
                    title="이미지 새 탭으로 크게 보기"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                    <span>새 창 열기</span>
                  </a>
                </>
              )}

              {/* HWP / Text Copy Control */}
              {(currentCategory === "hwp" || currentCategory === "docx" || currentCategory === "etc") &&
                currentDoc.extractedText && (
                  <button
                    onClick={() => handleCopyText(currentDoc.extractedText)}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors flex items-center space-x-1 font-semibold shadow-2xs cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">복사 완료!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-600" />
                        <span>텍스트 복사</span>
                      </>
                    )}
                  </button>
                )}

              {/* Universal Download Action */}
              <a
                href={`/api/download?url=${encodeURIComponent(
                  currentDoc.fileUrl
                )}&filename=${encodeURIComponent(currentDoc.fileName)}`}
                download={currentDoc.fileName}
                className={`px-3.5 py-1.5 rounded-lg font-bold transition-colors flex items-center space-x-1.5 shadow-sm text-white cursor-pointer ${
                  currentCategory === "image"
                    ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                    : currentCategory === "hwp"
                    ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20"
                    : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>{getDocDownloadText(currentCategory)}</span>
              </a>
            </div>
          </div>

          {/* Viewer Body Canvas */}
          <div className="flex-1 min-h-0 bg-slate-900 p-0 flex flex-col h-full overflow-hidden">
            {/* 1. PDF Viewer */}
            {currentCategory === "pdf" && (
              <iframe
                src={`/api/download?url=${encodeURIComponent(
                  currentDoc.fileUrl
                )}&filename=${encodeURIComponent(currentDoc.fileName)}&view=true#view=FitH&toolbar=1&navpanes=0`}
                className="w-full flex-1 h-full border-0 bg-white"
                style={{ minHeight: isExpanded ? "1100px" : "800px" }}
                title={currentDoc.fileName}
              />
            )}

            {/* 2. Image Poster Viewer */}
            {currentCategory === "image" && (
              <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center bg-slate-950/90 custom-scrollbar">
                <div
                  className="transition-transform duration-150 ease-out flex items-center justify-center max-w-full"
                  style={{ transform: `scale(${imageZoom})`, transformOrigin: "top center" }}
                >
                  <img
                    src={`/api/download?url=${encodeURIComponent(
                      currentDoc.fileUrl
                    )}&filename=${encodeURIComponent(currentDoc.fileName)}&view=true`}
                    alt={currentDoc.fileName}
                    className="max-w-full h-auto rounded-xl shadow-2xl border border-slate-800 object-contain select-none"
                    loading="eager"
                  />
                </div>
              </div>
            )}

            {/* 3. HWP / DOCX / Text Form Viewer */}
            {currentCategory !== "pdf" && currentCategory !== "image" && (
              currentDoc.extractedText ? (
                <HwpExtractedTextViewer
                  fileName={currentDoc.fileName}
                  fileUrl={currentDoc.fileUrl}
                  extractedText={currentDoc.extractedText}
                  onRefresh={onRefresh}
                />
              ) : (
                <div className="flex-1 p-6 text-slate-800 space-y-4 max-h-[850px] overflow-y-auto custom-scrollbar bg-slate-50">
                  <div className="p-12 text-center bg-white rounded-xl border border-slate-200 space-y-4">
                    <FileCode className="w-12 h-12 text-indigo-400 mx-auto" />
                    <div className="space-y-1">
                      <p className="font-bold text-slate-800 text-sm">
                        서식 텍스트가 아직 파싱되지 않았거나 바이너리 서식 파일입니다.
                      </p>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        아래 버튼을 눌러 공고문 문서를 실시간으로 재동기화하거나 상단의 다운로드 버튼으로 한컴오피스에서 바로 확인하세요.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <button
                        onClick={onRefresh}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center space-x-1.5 shadow-xs cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>서식 실시간 재파싱</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};
