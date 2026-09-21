"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { X, Loader2, AlertCircle, Download, Save, GripVertical, Trash2, CheckCircle2 } from "lucide-react";
import { buildDownloadUrl } from "@/lib/documents/download";

/**
 * PDF 신청서 위에 사용자가 직접 텍스트 칸을 배치해서 채우는 편집기.
 *
 * rhwp(HWP/HWPX 엔진)는 PDF를 열 수 없고, 공고 PDF는 실측 결과 채워 넣을 수
 * 있는 필드(AcroForm)가 없는 "출력·수기 작성용" 문서다. 게다가 공고마다 서식이
 * 제각각이라(재사용 거의 없음) 관리자가 미리 좌표 템플릿을 잡아두는 것도
 * 현실적이지 않다. 그래서 원본 레이아웃은 그대로 두고, 지금 이 문서를 채우는
 * 사용자가 화면에서 직접 칸을 클릭해 배치하는 방식을 쓴다 — 새 공고가 매일
 * 들어와도 사전 작업이 필요 없다.
 */

interface PdfFormFillerProps {
  fileUrl: string;
  entryPath?: string | null;
  fileName: string;
  supportProgramId?: string;
  onClose: () => void;
  getAuthToken: () => Promise<string | null>;
}

interface TextBox {
  id: string;
  page: number;
  xPx: number;
  yPx: number;
  fontSizePt: number;
  text: string;
}

type LoadState = "loading" | "ready" | "error";

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;
function loadPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((mod) => {
      mod.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();
      return mod;
    });
  }
  return pdfjsPromise;
}

const PAGE_WIDTH_PX = 760;

export const PdfFormFiller: React.FC<PdfFormFillerProps> = ({
  fileUrl,
  entryPath,
  fileName,
  supportProgramId,
  onClose,
  getAuthToken,
}) => {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState("");
  const [numPages, setNumPages] = useState(0);
  const [boxes, setBoxes] = useState<TextBox[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exportState, setExportState] = useState<"idle" | "downloading" | "saving" | "saved" | "error">("idle");
  const [exportError, setExportError] = useState("");

  const pdfDocRef = useRef<any>(null);
  const pageDimsRef = useRef<{ width: number; height: number }[]>([]);
  const pageWrapperRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const canvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});
  const dragRef = useRef<{ id: string; rectLeft: number; rectTop: number; offsetX: number; offsetY: number } | null>(null);
  const nextIdRef = useRef(1);

  // PDF 로드
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadState("loading");
      setLoadError("");
      try {
        const pdfjsLib = await loadPdfJs();
        const proxyUrl = buildDownloadUrl({ fileUrl, entryPath }, { view: true, fileName });
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error(`파일을 불러오지 못했습니다 (HTTP ${res.status})`);
        const arrayBuffer = await res.arrayBuffer();
        if (cancelled) return;
        const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (cancelled) return;
        pdfDocRef.current = doc;
        setNumPages(doc.numPages);
        setLoadState("ready");
      } catch (err: any) {
        if (!cancelled) {
          setLoadState("error");
          setLoadError(err?.message || "PDF를 불러오지 못했습니다.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fileUrl, entryPath, fileName]);

  // 페이지별 canvas 렌더링 (numPages 가 정해져 실제 <canvas> 가 DOM에 붙은 뒤 실행)
  useEffect(() => {
    if (loadState !== "ready" || numPages === 0) return;
    let cancelled = false;
    (async () => {
      const doc = pdfDocRef.current;
      for (let i = 1; i <= numPages; i++) {
        if (cancelled) return;
        const canvas = canvasRefs.current[i - 1];
        if (!canvas) continue;
        const page = await doc.getPage(i);
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = PAGE_WIDTH_PX / baseViewport.width;
        const viewport = page.getViewport({ scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        await page.render({ canvasContext: ctx, viewport }).promise;
        pageDimsRef.current[i - 1] = { width: viewport.width, height: viewport.height };
        const wrapper = pageWrapperRefs.current[i - 1];
        if (wrapper) {
          wrapper.style.width = `${viewport.width}px`;
          wrapper.style.height = `${viewport.height}px`;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadState, numPages]);

  // 드래그 이동
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const x = Math.max(0, e.clientX - drag.rectLeft - drag.offsetX);
      const y = Math.max(0, e.clientY - drag.rectTop - drag.offsetY);
      setBoxes((prev) => prev.map((b) => (b.id === drag.id ? { ...b, xPx: x, yPx: y } : b)));
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const handlePageClick = useCallback((e: React.MouseEvent<HTMLDivElement>, pageIndex: number) => {
    if ((e.target as HTMLElement).closest("[data-textbox]")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const id = `box_${nextIdRef.current++}`;
    const newBox: TextBox = {
      id,
      page: pageIndex,
      xPx: e.clientX - rect.left,
      yPx: e.clientY - rect.top,
      fontSizePt: 11,
      text: "",
    };
    setBoxes((prev) => [...prev, newBox]);
    setSelectedId(id);
  }, []);

  const startDrag = (e: React.MouseEvent, box: TextBox) => {
    e.preventDefault();
    e.stopPropagation();
    const wrapper = pageWrapperRefs.current[box.page];
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    dragRef.current = {
      id: box.id,
      rectLeft: rect.left,
      rectTop: rect.top,
      offsetX: e.clientX - rect.left - box.xPx,
      offsetY: e.clientY - rect.top - box.yPx,
    };
    setSelectedId(box.id);
  };

  const updateBox = (id: string, patch: Partial<TextBox>) => {
    setBoxes((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const deleteBox = (id: string) => {
    setBoxes((prev) => prev.filter((b) => b.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  };

  const buildPayload = () => {
    const dims = pageDimsRef.current;
    return boxes
      .filter((b) => b.text.trim())
      .map((b) => {
        const dim = dims[b.page] || { width: PAGE_WIDTH_PX, height: PAGE_WIDTH_PX * 1.41 };
        return {
          page: b.page,
          xPct: b.xPx / dim.width,
          yPct: b.yPx / dim.height,
          fontSizePt: b.fontSizePt,
          text: b.text,
        };
      });
  };

  const requestFilledPdf = async (): Promise<Blob> => {
    const payload = buildPayload();
    if (payload.length === 0) throw new Error("입력한 내용이 없습니다.");
    const res = await fetch("/api/pdf-fill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileUrl, entryPath, boxes: payload }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new Error(json?.error || `서식 작성 실패 (HTTP ${res.status})`);
    }
    return res.blob();
  };

  const handleDownload = async () => {
    setExportState("downloading");
    setExportError("");
    try {
      const blob = await requestFilledPdf();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName.replace(/\.pdf$/i, "") + "_작성본.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportState("idle");
    } catch (err: any) {
      setExportState("error");
      setExportError(err?.message || "다운로드에 실패했습니다.");
    }
  };

  const handleSaveToVault = async () => {
    setExportState("saving");
    setExportError("");
    try {
      const blob = await requestFilledPdf();
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const contentBase64 = btoa(binary);

      const token = await getAuthToken();
      const outFileName = fileName.replace(/\.pdf$/i, "") + "_작성본.pdf";
      const res = await fetch("/api/documents/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          fileName: outFileName,
          format: "pdf",
          contentBase64,
          supportProgramId,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.error || `저장 실패 (HTTP ${res.status})`);
      setExportState("saved");
      setTimeout(() => setExportState((s) => (s === "saved" ? "idle" : s)), 2500);
    } catch (err: any) {
      setExportState("error");
      setExportError(err?.message || "저장하지 못했습니다.");
    }
  };

  return (
    <div className="relative flex-1 min-h-0 flex flex-col bg-white">
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-stone-200 bg-stone-50 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer flex-shrink-0"
            title="닫기"
          >
            <X className="w-4 h-4" />
          </button>
          <span className="text-[11px] text-slate-500 truncate">PDF 서식 직접 입력 — {fileName}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {exportState === "error" && (
            <span className="flex items-center gap-1 text-[11px] text-rose-600">
              <AlertCircle className="w-3 h-3" /> {exportError}
            </span>
          )}
          {exportState === "saved" && (
            <span className="flex items-center gap-1 text-[11px] text-emerald-600">
              <CheckCircle2 className="w-3 h-3" /> 저장됨
            </span>
          )}
          <button
            type="button"
            onClick={handleDownload}
            disabled={loadState !== "ready" || exportState === "downloading"}
            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-600 border border-stone-200 hover:border-slate-400 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
          >
            {exportState === "downloading" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
            PDF 다운로드
          </button>
          <button
            type="button"
            onClick={handleSaveToVault}
            disabled={loadState !== "ready" || exportState === "saving"}
            className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
          >
            {exportState === "saving" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            내 저장소에 저장
          </button>
        </div>
      </div>

      <div className="relative flex-1 min-h-0 overflow-auto bg-slate-100 px-4 py-4">
        {loadState === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80">
            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin mb-3" />
            <p className="text-xs text-slate-500">PDF를 불러오는 중입니다...</p>
          </div>
        )}
        {loadState === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 bg-white">
            <AlertCircle className="w-8 h-8 text-rose-500 mb-3" />
            <p className="text-sm font-semibold text-slate-700 mb-1">PDF를 열지 못했습니다</p>
            <p className="text-xs text-slate-400 max-w-sm">{loadError}</p>
          </div>
        )}

        {loadState === "ready" && (
          <>
            <p className="text-[11px] text-slate-400 text-center mb-3">
              빈 곳을 클릭하면 입력 칸이 생깁니다. 칸의 손잡이(⠿)를 드래그해서 원하는 위치로 옮기세요.
            </p>
            {Array.from({ length: numPages }).map((_, pageIndex) => (
              <div
                key={pageIndex}
                ref={(el) => {
                  pageWrapperRefs.current[pageIndex] = el;
                }}
                onClick={(e) => handlePageClick(e, pageIndex)}
                className="relative mx-auto mb-4 bg-white shadow-md cursor-crosshair"
                style={{ width: PAGE_WIDTH_PX }}
              >
                <canvas
                  ref={(el) => {
                    canvasRefs.current[pageIndex] = el;
                  }}
                  className="block pointer-events-none"
                />
                {boxes
                  .filter((b) => b.page === pageIndex)
                  .map((box) => (
                    <div
                      key={box.id}
                      data-textbox
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      className={`absolute bg-white/90 border-2 rounded shadow-sm ${
                        selectedId === box.id ? "border-indigo-500" : "border-indigo-300/70"
                      }`}
                      style={{ left: box.xPx, top: box.yPx, minWidth: 120 }}
                    >
                      <div
                        onMouseDown={(e) => startDrag(e, box)}
                        className="flex items-center gap-1 px-1 py-0.5 bg-indigo-500 text-white rounded-t cursor-move select-none"
                      >
                        <GripVertical className="w-3 h-3" />
                        <input
                          type="number"
                          min={6}
                          max={72}
                          value={box.fontSizePt}
                          onMouseDown={(e) => e.stopPropagation()}
                          onChange={(e) => updateBox(box.id, { fontSizePt: Number(e.target.value) || 11 })}
                          className="w-10 text-[10px] text-slate-900 rounded px-1 py-px"
                          title="글자 크기(pt)"
                        />
                        <button
                          type="button"
                          onClick={() => deleteBox(box.id)}
                          className="ml-auto p-0.5 hover:bg-indigo-600 rounded cursor-pointer"
                          title="삭제"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <textarea
                        value={box.text}
                        onChange={(e) => updateBox(box.id, { text: e.target.value })}
                        onFocus={() => setSelectedId(box.id)}
                        placeholder="입력..."
                        style={{ fontSize: box.fontSizePt, resize: "both" }}
                        className="block w-40 h-9 px-1.5 py-1 text-slate-900 outline-none rounded-b"
                      />
                    </div>
                  ))}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};
