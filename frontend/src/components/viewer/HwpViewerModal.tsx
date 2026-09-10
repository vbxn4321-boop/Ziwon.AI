"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  FileText,
  Layers,
  Sparkles,
} from "lucide-react";
import { RhwpPageViewer } from "./RhwpPageViewer";

export interface HwpDocumentItem {
  id: string;
  fileName: string;
  fileUrl: string;
  /** ZIP 첨부파일 내부 문서일 때의 내부 경로 */
  entryPath?: string | null;
  fileType: string;
  extractedText?: string | null;
}

interface HwpViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentList: HwpDocumentItem[];
  initialDocumentIndex?: number;
  programTitle?: string;
}

export const HwpViewerModal: React.FC<HwpViewerModalProps> = ({
  isOpen,
  onClose,
  documentList,
  initialDocumentIndex = 0,
  programTitle,
}) => {
  const [activeIdx, setActiveIdx] = useState(initialDocumentIndex);

  useEffect(() => {
    setActiveIdx(initialDocumentIndex);
  }, [initialDocumentIndex]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || documentList.length === 0) return null;

  const currentDoc = documentList[activeIdx] || documentList[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-2 sm:p-4 md:p-6">
      <div className="relative flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 w-full h-[92vh] max-w-7xl">
        
        {/* ── Top Header Bar ── */}
        <header className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700 select-none z-20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-bold text-xs shrink-0">
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  RHWP WASM 엔진
                </span>
                <h2 className="text-sm font-bold text-slate-100 truncate max-w-xs sm:max-w-md md:max-w-lg">
                  {currentDoc.fileName}
                </h2>
              </div>
              {programTitle && (
                <p className="text-[11px] text-slate-400 truncate max-w-sm mt-0.5">
                  {programTitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
              title="닫기 (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* ── Multi-File Tabs (if multiple attachments exist) ── */}
        {documentList.length > 1 && (
          <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-850 border-b border-slate-800 overflow-x-auto select-none no-scrollbar">
            <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              첨부 문서 ({documentList.length}):
            </span>
            {documentList.map((doc, idx) => (
              <button
                key={doc.id || idx}
                onClick={() => setActiveIdx(idx)}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-md transition shrink-0 ${
                  activeIdx === idx
                    ? "bg-indigo-600 text-white font-semibold shadow-sm"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700/60"
                }`}
              >
                <FileText className="w-3 h-3 opacity-70" />
                <span className="truncate max-w-[180px]">{doc.fileName}</span>
              </button>
            ))}
          </div>
        )}

        {/* ── Genuine RHWP Vector Page Viewer ── */}
        <div className="flex-1 min-h-0 flex flex-col bg-slate-950 overflow-hidden">
          <RhwpPageViewer
            key={currentDoc.id || currentDoc.fileUrl || activeIdx}
            fileName={currentDoc.fileName}
            fileUrl={currentDoc.fileUrl}
            entryPath={currentDoc.entryPath}
            extractedText={currentDoc.extractedText}
          />
        </div>
      </div>
    </div>
  );
};
