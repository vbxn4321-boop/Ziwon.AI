"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { X, Loader2, AlertCircle, Download, Save, GripVertical, Trash2, CheckCircle2, HelpCircle } from "lucide-react";
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

// 압축 안 된 "pdfjs-dist"(legacy/build/pdf.mjs 포함)를 그대로 import 하면 이
// 프로젝트의 Next.js 개발 서버 웹팩 번들에서 "Object.defineProperty called on
// non-object" 에러로 로드 자체가 실패한다(실측: 헤드리스 브라우저로 재현·확인).
// 압축본(pdf.min.mjs)은 같은 문제가 없어 이걸 명시적으로 import 한다.
let pdfjsPromise: Promise<typeof import("pdfjs-dist/legacy/build/pdf.min.mjs")> | null = null;
function loadPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist/legacy/build/pdf.min.mjs").then((mod) => {
      mod.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
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
  // 처음 쓰는 사람은 클릭·드래그로 채우는 방식 자체가 낯설 수 있어서, 이 기능을
  // 처음 열 때 한 번 사용법을 보여준다. "?" 버튼으로 언제든 다시 볼 수 있다.
  const [showGuide, setShowGuide] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem("pdfFormFiller.guideSeen")) setShowGuide(true);
    } catch {}
  }, []);
  const dismissGuide = () => {
    setShowGuide(false);
    try {
      localStorage.setItem("pdfFormFiller.guideSeen", "1");
    } catch {}
  };

  const pdfDocRef = useRef<any>(null);
  const pageDimsRef = useRef<{ width: number; height: number }[]>([]);
  const pageWrapperRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const canvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});
  const dragRef = useRef<{ id: string; rectLeft: number; rectTop: number; offsetX: number; offsetY: number } | null>(null);
  const nextIdRef = useRef(1);
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  // 칸을 클릭해서 새로 만들거나 이미 써 둔 칸을 다시 클릭했을 때, 커서가 바로
  // 그 칸에 들어가야 "일반 에디터처럼" 한 번의 클릭으로 바로 타이핑할 수 있다.
  // 전에는 이게 없어서 칸이 생겨도 실제로 글자를 치려면 한 번 더 눌러야 했다.
  useEffect(() => {
    if (!selectedId) return;
    const el = textareaRefs.current[selectedId];
    if (!el) return;
    el.focus();
    const len = el.value.length;
    el.setSelectionRange(len, len);
  }, [selectedId]);
  // 글자 너비를 재는 데만 쓰는 숨김 요소. 칸을 입력한 글자 길이에 딱 맞게
  // 그려야(포스트잇처럼 고정 크기 상자로 안 보이게) 매 렌더마다 이걸로 잰다.
  const measureRef = useRef<HTMLSpanElement>(null);
  // 선택이 다른 칸으로 넘어갈 때, 방금까지 선택돼 있던 칸이 빈 채로 남았으면
  // 지운다 — 클릭만 하고 아무것도 안 쓴 빈 칸이 문서 위에 계속 남는 걸 막는다.
  const prevSelectedRef = useRef<string | null>(null);
  useEffect(() => {
    const prevId = prevSelectedRef.current;
    if (prevId && prevId !== selectedId) {
      setBoxes((prev) => {
        const prevBox = prev.find((b) => b.id === prevId);
        if (prevBox && !prevBox.text.trim()) {
          delete textareaRefs.current[prevId];
          return prev.filter((b) => b.id !== prevId);
        }
        return prev;
      });
    }
    prevSelectedRef.current = selectedId;
  }, [selectedId]);

  const measureTextWidth = (text: string, fontSizePt: number): number => {
    const span = measureRef.current;
    if (!span) return 60;
    span.style.fontSize = `${fontSizePt}px`;
    let max = 24;
    for (const line of text.split("\n")) {
      span.textContent = line || " ";
      max = Math.max(max, span.offsetWidth);
    }
    return max + 6;
  };

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
    e.stopPropagation();
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
    delete textareaRefs.current[id];
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
          <button
            type="button"
            onClick={() => setShowGuide(true)}
            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg cursor-pointer flex-shrink-0"
            title="사용법 보기"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
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

      {/* 글자 너비 측정용 숨김 요소. 화면에 안 보이지만 레이아웃 계산은 실제로 해야 하니
          visibility:hidden(공간은 차지)이 아니라 위치를 화면 밖으로 빼는 쪽을 쓴다. */}
      <span
        ref={measureRef}
        style={{ position: "fixed", top: -9999, left: -9999, whiteSpace: "pre", visibility: "hidden" }}
      />

      <div className="relative flex-1 min-h-0 overflow-auto bg-slate-100 px-4 py-4" onClick={() => setSelectedId(null)}>
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
              빈 곳을 클릭하면 그 자리에 바로 글자를 쓸 수 있습니다. 써 놓은 글자를 다시 클릭하면 고치거나
              옮길 수 있습니다.
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
                  .map((box) => {
                    const isSelected = selectedId === box.id;
                    const lineCount = Math.max(1, box.text.split("\n").length);
                    return (
                      <div
                        key={box.id}
                        data-textbox
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(box.id);
                        }}
                        className="absolute"
                        style={{ left: box.xPx, top: box.yPx }}
                      >
                        {/* 선택했을 때만 손잡이·글자크기·삭제 도구를 칸 위쪽에 살짝 띄운다.
                            평소엔 아무 테두리도 없어서 문서 위에 그냥 글자를 쓴 것처럼 보인다 —
                            선택 안 한 칸까지 포스트잇처럼 상자·손잡이가 늘 보이던 걸 없앴다. */}
                        {isSelected && (
                          <div
                            onMouseDown={(e) => startDrag(e, box)}
                            className="absolute -top-6 left-0 flex items-center gap-1 px-1 py-0.5 bg-indigo-600 text-white rounded cursor-move select-none whitespace-nowrap shadow-sm z-10"
                          >
                            <GripVertical className="w-3 h-3" />
                            <input
                              type="number"
                              min={6}
                              max={72}
                              value={box.fontSizePt}
                              onMouseDown={(e) => e.stopPropagation()}
                              onChange={(e) => updateBox(box.id, { fontSizePt: Number(e.target.value) || 11 })}
                              className="w-9 text-[10px] text-slate-900 rounded px-1 py-px"
                              title="글자 크기(pt)"
                            />
                            <button
                              type="button"
                              onClick={() => deleteBox(box.id)}
                              className="p-0.5 hover:bg-indigo-700 rounded cursor-pointer"
                              title="삭제"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        <textarea
                          ref={(el) => {
                            textareaRefs.current[box.id] = el;
                          }}
                          value={box.text}
                          onChange={(e) => updateBox(box.id, { text: e.target.value })}
                          onFocus={() => setSelectedId(box.id)}
                          placeholder={isSelected ? "입력" : ""}
                          rows={lineCount}
                          style={{
                            fontSize: box.fontSizePt,
                            lineHeight: 1.3,
                            width: measureTextWidth(box.text, box.fontSizePt),
                          }}
                          className={`block bg-transparent outline-none resize-none text-slate-900 p-0 ${
                            isSelected
                              ? "border border-dashed border-indigo-400"
                              : "border border-transparent hover:border-dashed hover:border-slate-300"
                          }`}
                        />
                      </div>
                    );
                  })}
              </div>
            ))}
          </>
        )}
      </div>

      {showGuide && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/40 px-6">
          <div className="max-w-sm w-full bg-white rounded-2xl shadow-xl p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-3">PDF 서식 사용법</h3>
            <ol className="space-y-2 text-xs text-slate-600 list-decimal list-inside">
              <li>빈 곳을 클릭하면 그 자리에 바로 입력 칸이 생기고 커서가 들어갑니다. 바로 타이핑하세요.</li>
              <li>이미 써 놓은 글자를 클릭하면 다시 고치거나 이어 쓸 수 있습니다.</li>
              <li>칸을 선택하면 위에 뜨는 손잡이(⠿)를 드래그해서 위치를 옮길 수 있습니다.</li>
              <li>같은 자리의 숫자 입력으로 글자 크기(pt)를 바꿀 수 있습니다.</li>
              <li>휴지통 아이콘을 누르면 그 칸이 삭제됩니다.</li>
              <li>다 채웠으면 위쪽 "PDF 다운로드"로 받거나 "내 저장소에 저장"으로 보관하세요.</li>
            </ol>
            <p className="mt-3 text-[11px] text-slate-400 leading-relaxed">
              이 방식은 원본 PDF 위에 새 글자를 얹는 것이라, PDF에 원래 인쇄돼 있던 글자 자체를 고칠 수는
              없습니다. 신청서의 빈 칸을 채우는 용도로 써 주세요.
            </p>
            <button
              type="button"
              onClick={dismissGuide}
              className="mt-4 w-full py-2 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 cursor-pointer"
            >
              확인했어요
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
