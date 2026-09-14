"use client";

import { buildDownloadUrl, shouldProxyDownload } from "@/lib/documents/download";
import React, { useState } from "react";
import { FileText, Download, Eye, X, Copy, Check, ExternalLink, Image as ImageIcon, Layers, FileCode } from "lucide-react";
import { getDocCategory, getDocBadgeText } from "./detail-helpers";
import { HwpViewerModal } from "@/components/viewer/HwpViewerModal";

interface DocumentsTabProps {
  sortedDocs: any[];
  programTitle?: string;
}

export const DocumentsTab: React.FC<DocumentsTabProps> = ({ sortedDocs, programTitle }) => {
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);
  const [isHwpViewerOpen, setIsHwpViewerOpen] = useState(false);
  const [hwpViewerIndex, setHwpViewerIndex] = useState(0);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenHwpViewer = (index: number = 0) => {
    setHwpViewerIndex(index);
    setIsHwpViewerOpen(true);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm">공식 첨부 서류 다운로드 및 지능형 뷰어</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            💡 정부 표준 A4 규격 뷰어로 공고문과 서식을 한컴 한글(HWP) 스타일로 즉시 열람하고 검색할 수 있습니다.
          </p>
        </div>

        {sortedDocs.length > 0 && (
          <button
            onClick={() => handleOpenHwpViewer(0)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <Layers className="w-4 h-4" />
            <span>정부 규격 HWP 뷰어로 열기</span>
          </button>
        )}
      </div>

      {sortedDocs.length === 0 ? (
        <p className="text-xs text-slate-500">등록된 첨부 서류가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sortedDocs.map((doc, idx) => {
            const cat = getDocCategory(doc);
            const badgeText = getDocBadgeText(cat);
            const hasText = !!(doc.extractedText && doc.extractedText.trim().length > 0);
            const isImage = cat === "image";
            const isHwpOrText = cat === "hwp" || cat === "docx" || hasText;

            return (
              <div
                key={doc.id || idx}
                className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between text-xs space-y-3"
              >
                <div className="flex items-start space-x-2.5 min-w-0">
                  {isImage ? (
                    <ImageIcon className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <FileText className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-slate-900 block truncate" title={doc.fileName}>
                      {doc.fileName}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      {badgeText} {hasText ? `• 텍스트 추출 (${doc.extractedText.length.toLocaleString()}자)` : ""}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 justify-end pt-1 border-t border-slate-200/70 flex-wrap gap-y-1">
                  {/* HWP Viewer button for structured view */}
                  {hasText && (
                    <button
                      onClick={() => handleOpenHwpViewer(idx)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center space-x-1 font-bold shadow-xs cursor-pointer"
                      title="정부 규격 A4 서식 뷰어로 열람"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>HWP 뷰어</span>
                    </button>
                  )}

                  {hasText && (
                    <button
                      onClick={() => setPreviewDoc(doc)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-200/70 hover:bg-slate-300/80 text-slate-700 border border-slate-300 transition-colors flex items-center space-x-1 font-semibold shadow-2xs cursor-pointer"
                      title="텍스트 원문 보기"
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      <span>원문 텍스트</span>
                    </button>
                  )}

                  {isImage && (
                    <a
                      href={buildDownloadUrl(doc, { view: true })}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors flex items-center space-x-1 font-bold shadow-2xs cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>이미지 보기</span>
                    </a>
                  )}

                  {doc.fileType === "NOTICE_ONLY" ? (
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center space-x-1 font-bold shadow-xs cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>원문 웹페이지 바로가기</span>
                    </a>
                  ) : (
                    <a
                      href={shouldProxyDownload(doc) ? buildDownloadUrl(doc) : doc.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      download={doc.fileName}
                      className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors flex items-center space-x-1 font-bold shadow-2xs cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>다운로드</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Raw Extracted Text Modal (Fallback) */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2 min-w-0 mr-2">
                <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <h4 className="font-bold text-slate-900 text-xs truncate">{previewDoc.fileName} — 파싱된 원문 텍스트</h4>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleCopy(previewDoc.extractedText)}
                  className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "복사됨!" : "텍스트 복사"}</span>
                </button>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto flex-1 custom-scrollbar bg-slate-900 text-slate-100 font-mono text-xs leading-relaxed whitespace-pre-wrap select-text">
              {previewDoc.extractedText}
            </div>
          </div>
        </div>
      )}

      {/* High-Fidelity A4 HWP/HWPX Viewer Modal */}
      <HwpViewerModal
        isOpen={isHwpViewerOpen}
        onClose={() => setIsHwpViewerOpen(false)}
        documentList={sortedDocs}
        initialDocumentIndex={hwpViewerIndex}
        programTitle={programTitle}
      />
    </div>
  );
};

