"use client";

import React, { useState } from "react";
import { FileText, Download, Eye, X, Copy, Check } from "lucide-react";

interface DocumentsTabProps {
  sortedDocs: any[];
}

export const DocumentsTab: React.FC<DocumentsTabProps> = ({ sortedDocs }) => {
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-extrabold text-slate-900 text-sm">공식 첨부 서류 다운로드 및 파싱 텍스트</h3>
        <span className="text-xs text-slate-500">
          💡 [텍스트 미리보기] 버튼을 누르면 AI가 추출한 본문 전문을 바로 열람할 수 있습니다.
        </span>
      </div>

      {sortedDocs.length === 0 ? (
        <p className="text-xs text-slate-500">등록된 첨부 서류가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sortedDocs.map((doc, idx) => {
            const hasText = !!(doc.extractedText && doc.extractedText.trim().length > 0);
            return (
              <div
                key={doc.id || idx}
                className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between text-xs space-y-3"
              >
                <div className="flex items-start space-x-2.5 min-w-0">
                  <FileText className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-slate-900 block truncate" title={doc.fileName}>
                      {doc.fileName}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      {doc.fileType?.toUpperCase() || "DOC"} {hasText ? `• 텍스트 추출 완료 (${doc.extractedText.length.toLocaleString()}자)` : "• 첨부 파일"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 justify-end pt-1 border-t border-slate-200/70">
                  {hasText && (
                    <button
                      onClick={() => setPreviewDoc(doc)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors flex items-center space-x-1 font-bold shadow-2xs cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>텍스트 미리보기</span>
                    </button>
                  )}

                  <a
                    href={
                      doc.fileUrl.includes("fileDown.do") ||
                      doc.fileUrl.includes("FileDown.do") ||
                      doc.fileUrl.includes("afile/fileDownload") ||
                      doc.fileUrl.match(/\.(pdf|hwp|hwpx|docx|zip)$/i)
                        ? `/api/download?url=${encodeURIComponent(doc.fileUrl)}&filename=${encodeURIComponent(
                            doc.fileName
                          )}`
                        : doc.fileUrl
                    }
                    target="_blank"
                    rel="noreferrer"
                    download={doc.fileName}
                    className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors flex items-center space-x-1 font-bold shadow-2xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>다운로드</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Extracted Text Modal */}
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
    </div>
  );
};
