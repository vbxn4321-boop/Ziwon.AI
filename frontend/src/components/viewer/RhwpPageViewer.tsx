"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Download,
  Printer,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles,
  RefreshCw,
  Eye,
  AlertCircle,
  FileCode,
} from "lucide-react";
import { fetchAndRenderHwp, RhwpRenderResult } from "@/lib/viewer/rhwp-engine";
import { HwpExtractedTextViewer } from "@/components/program-detail/HwpExtractedTextViewer";

interface RhwpPageViewerProps {
  fileName: string;
  fileUrl: string;
  extractedText?: string | null;
  onRefresh?: () => void;
}

export const RhwpPageViewer: React.FC<RhwpPageViewerProps> = ({
  fileName,
  fileUrl,
  extractedText,
  onRefresh,
}) => {
  const [loading, setLoading] = useState(true);
  const [renderResult, setRenderResult] = useState<RhwpRenderResult | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"rhwp" | "text">("rhwp");
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Load and render HWP via WASM
  useEffect(() => {
    let isMounted = true;

    async function loadDoc() {
      if (!fileUrl) return;
      setLoading(true);
      try {
        const result = await fetchAndRenderHwp(fileUrl, fileName);
        if (isMounted) {
          setRenderResult(result);
          if (!result.success && extractedText) {
            // If binary rendering had an issue, fallback to smart text mode
            setViewMode("text");
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setRenderResult({
            success: false,
            pageCount: 0,
            pages: [],
            error: err.message || String(err),
          });
          if (extractedText) setViewMode("text");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDoc();

    return () => {
      isMounted = false;
    };
  }, [fileUrl, fileName, extractedText]);

  const handleCopy = () => {
    if (extractedText) {
      navigator.clipboard.writeText(extractedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const scrollToPage = (pageNum: number) => {
    setCurrentPage(pageNum);
    const targetEl = pageRefs.current[pageNum - 1];
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className={`flex flex-col h-full bg-slate-900 text-slate-100 overflow-hidden relative ${isFullscreen ? "fixed inset-0 z-50" : "flex-1"}`}>
      
      {/* ── Top Header Toolbar ── */}
      <div className="px-4 py-2.5 bg-slate-850 border-b border-slate-700/80 flex items-center justify-between flex-wrap gap-2 text-xs z-20 select-none">
        {/* Left: Mode toggle & Info */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center p-0.5 rounded-xl bg-slate-950 border border-slate-700">
            <button
              onClick={() => setViewMode("rhwp")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 font-bold cursor-pointer ${
                viewMode === "rhwp"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              <span>🏛️ 정품 한글 뷰어 (RHWP 엔진)</span>
            </button>
            {extractedText && (
              <button
                onClick={() => setViewMode("text")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 font-bold cursor-pointer ${
                  viewMode === "text"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>📝 서식 텍스트 뷰</span>
              </button>
            )}
          </div>

          {renderResult?.success && renderResult.pageCount > 0 && viewMode === "rhwp" && (
            <span className="text-[11px] text-indigo-300 bg-indigo-950/60 border border-indigo-800/60 px-2.5 py-1 rounded-lg hidden sm:inline-flex items-center gap-1">
              <Layers className="w-3 h-3" />
              <span>총 {renderResult.pageCount}쪽 문서</span>
            </span>
          )}
        </div>

        {/* Right: Controls (Zoom, Navigation, Print, Fullscreen, Download) */}
        <div className="flex items-center space-x-2">
          {viewMode === "rhwp" && renderResult?.success && (
            <>
              {/* Page Selector */}
              <div className="flex items-center bg-slate-950 border border-slate-700 rounded-lg px-1.5 py-0.5">
                <button
                  onClick={() => scrollToPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage <= 1}
                  className="p-1 text-slate-400 hover:text-slate-100 disabled:opacity-30 rounded cursor-pointer"
                  title="이전 쪽"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono text-slate-300 px-1 min-w-[3.5rem] text-center">
                  {currentPage} / {renderResult.pageCount}
                </span>
                <button
                  onClick={() => scrollToPage(Math.min(renderResult.pageCount, currentPage + 1))}
                  disabled={currentPage >= renderResult.pageCount}
                  className="p-1 text-slate-400 hover:text-slate-100 disabled:opacity-30 rounded cursor-pointer"
                  title="다음 쪽"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center bg-slate-950 border border-slate-700 rounded-lg px-1 py-0.5">
                <button
                  onClick={() => setZoom((z) => Math.max(50, z - 15))}
                  className="p-1 text-slate-400 hover:text-slate-100 rounded transition cursor-pointer"
                  title="축소"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono text-slate-300 px-1 min-w-[2.8rem] text-center">
                  {zoom}%
                </span>
                <button
                  onClick={() => setZoom((z) => Math.min(200, z + 15))}
                  className="p-1 text-slate-400 hover:text-slate-100 rounded transition cursor-pointer"
                  title="확대"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setZoom(100)}
                  className="p-1 text-slate-400 hover:text-slate-100 rounded transition ml-0.5 cursor-pointer"
                  title="100% 맞춤"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>

              {/* Print */}
              <button
                onClick={handlePrint}
                className="p-1.5 text-slate-300 hover:text-white bg-slate-950 border border-slate-700 rounded-lg transition hidden md:flex cursor-pointer"
                title="인쇄 / PDF 저장"
              >
                <Printer className="w-3.5 h-3.5" />
              </button>

              {/* Fullscreen */}
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1.5 text-slate-300 hover:text-white bg-slate-950 border border-slate-700 rounded-lg transition hidden sm:flex cursor-pointer"
                title={isFullscreen ? "창 모드" : "전체화면"}
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </>
          )}

          {extractedText && (
            <button
              onClick={handleCopy}
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-200 bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded-lg transition flex items-center space-x-1 cursor-pointer"
              title="텍스트 복사"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? "복사됨" : "복사"}</span>
            </button>
          )}

          {/* Download Original File */}
          <a
            href={`/api/download?url=${encodeURIComponent(fileUrl)}&filename=${encodeURIComponent(fileName)}`}
            download={fileName}
            className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 rounded-lg transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>다운로드</span>
          </a>
        </div>
      </div>

      {/* ── Main Viewport Canvas ── */}
      <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col bg-slate-950">
        {viewMode === "text" && extractedText ? (
          <HwpExtractedTextViewer
            fileName={fileName}
            fileUrl={fileUrl}
            extractedText={extractedText}
            onRefresh={onRefresh}
          />
        ) : loading ? (
          /* Loading State */
          <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-4 text-center">
            <div className="relative">
              <div className="w-14 h-14 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
              <Sparkles className="w-6 h-6 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-100">
                RHWP 한글 웹 렌더링 엔진으로 공문서를 파싱하고 있습니다...
              </h4>
              <p className="text-xs text-slate-400 max-w-sm">
                한컴 HWP/HWPX 바이너리를 직접 디코딩하여 표, 스타일, 서식을 원본 그대로 브라우저에 렌더링합니다.
              </p>
            </div>
          </div>
        ) : renderResult?.success && renderResult.pages.length > 0 ? (
          /* RHWP Vector Render Canvas */
          <div
            ref={containerRef}
            className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-8 flex flex-col items-center custom-scrollbar bg-slate-900/90"
          >
            <div
              className="flex flex-col items-center space-y-8 transition-transform origin-top duration-150 py-4"
              style={{ transform: `scale(${zoom / 100})` }}
            >
              {renderResult.pages.map((svgContent, idx) => (
                <div
                  key={idx}
                  ref={(el) => {
                    pageRefs.current[idx] = el;
                  }}
                  className="flex flex-col items-center group"
                >
                  {/* Page header tag */}
                  <div className="self-start mb-1 text-[11px] font-bold text-slate-400 flex items-center space-x-2 select-none">
                    <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded">
                      📄 {idx + 1} / {renderResult.pageCount} 쪽
                    </span>
                  </div>

                  {/* High-Fidelity SVG Paper Sheet */}
                  <div
                    className="bg-white text-slate-900 rounded-xs shadow-2xl overflow-visible border border-slate-300 box-border select-text [&_svg]:!overflow-visible [&_svg]:max-w-full [&_svg]:h-auto"
                    style={{
                      width: "794px",
                      minHeight: "1123px",
                      backgroundColor: "#ffffff",
                    }}
                    dangerouslySetInnerHTML={{ __html: svgContent }}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Render Error / Fallback State */
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4 text-center">
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl max-w-lg space-y-3">
              <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
              <div className="space-y-1">
                <h4 className="font-bold text-slate-200 text-sm">
                  한글(HWP) 파일 바이너리 렌더링 안내
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {renderResult?.error || "암호화되었거나 특수 보안 포맷의 한글 문서입니다."}
                </p>
              </div>

              {extractedText ? (
                <button
                  onClick={() => setViewMode("text")}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center space-x-1.5 shadow-md cursor-pointer"
                >
                  <FileCode className="w-4 h-4" />
                  <span>추출된 텍스트/표 서식 뷰어로 열람하기</span>
                </button>
              ) : (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <a
                    href={`/api/download?url=${encodeURIComponent(fileUrl)}&filename=${encodeURIComponent(fileName)}`}
                    download={fileName}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center space-x-1.5 shadow-md cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>한글 원본 파일 다운로드</span>
                  </a>
                  {onRefresh && (
                    <button
                      onClick={onRefresh}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>재동기화</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
