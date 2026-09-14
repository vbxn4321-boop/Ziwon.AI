"use client";

import { buildDownloadUrl } from "@/lib/documents/download";

let wasmInitPromise: Promise<any> | null = null;
let measureCanvasCtx: CanvasRenderingContext2D | null = null;
let lastFontCache = "";

/**
 * Initializes the @rhwp/core WASM module singleton
 */
export async function initRhwpEngine(): Promise<any> {
  if (typeof window === "undefined") {
    throw new Error("RHWP engine can only be initialized in browser environment");
  }

  if (wasmInitPromise) {
    return wasmInitPromise;
  }

  wasmInitPromise = (async () => {
    // Setup canvas-based text width measuring function required by @rhwp/core WASM layout engine
    (globalThis as any).measureTextWidth = (font: string, text: string) => {
      try {
        if (!measureCanvasCtx) {
          const canvas = document.createElement("canvas");
          measureCanvasCtx = canvas.getContext("2d");
        }
        if (measureCanvasCtx) {
          // 글꼴 문자열 안정화 (예: 10.0pt -> 10pt) 및 기본 폴백 폰트 적용
          let safeFont = font || "";
          safeFont = safeFont.replace(/(\d+\.\d+)pt/g, (m, p1) => `${Math.round(parseFloat(p1))}pt`);
          
          if (safeFont !== lastFontCache) {
            measureCanvasCtx.font = safeFont || "10pt 'Malgun Gothic', sans-serif";
            // 브라우저가 유효하지 않은 폰트 규격으로 거부할 경우를 대비한 안전망
            if (measureCanvasCtx.font === "10px sans-serif" && safeFont !== "10px sans-serif") {
                measureCanvasCtx.font = "10pt 'Malgun Gothic', sans-serif";
            }
            lastFontCache = safeFont;
          }
          
          let width = measureCanvasCtx.measureText(text || "").width;
          // 측정 실패로 0이 반환될 경우 텍스트 길이에 비례한 기본값(글자당 약 13px) 부여하여 레이아웃 붕괴(표 너비 팽창/텍스트 밀림) 방지
          if (width === 0 && text.length > 0) {
            width = text.length * 13;
          }
          return width;
        }
      } catch (err) {
        console.warn("[RHWP Measure Error]", err);
      }
      // 최후의 폴백
      return (text || "").length * 13;
    };

    const rhwp = await import("@rhwp/core");
    // Fetch and initialize the WASM binary from public path
    await rhwp.default({ module_or_path: "/rhwp_bg.wasm" });
    return rhwp;
  })();

  return wasmInitPromise;
}

export interface RhwpRenderResult {
  success: boolean;
  pageCount: number;
  pages: string[]; // SVG string for each page
  error?: string;
}

/**
 * Parses raw HWP / HWPX binary buffer and renders all pages to SVG vectors
 */
export async function renderHwpBufferToSvgs(buffer: ArrayBuffer | Uint8Array): Promise<RhwpRenderResult> {
  try {
    const rhwp = await initRhwpEngine();
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

    if (!bytes || bytes.length === 0) {
      throw new Error("문서 데이터가 비어 있습니다.");
    }

    const doc = new rhwp.HwpDocument(bytes);
    const viewer = new rhwp.HwpViewer(doc);
    const count = viewer.pageCount();

    const pages: string[] = [];
    for (let i = 0; i < count; i++) {
      let svg = viewer.renderPageSvg(i);
      // WASM 엔진이 생성한 내부 clip-path가 CSS overflow-visible을 무시하고 강제로 자르는 것을 방지
      svg = svg.replace(/clip-path="[^"]+"/g, "");
      pages.push(svg);
    }

    return {
      success: true,
      pageCount: count,
      pages,
    };
  } catch (err: any) {
    console.warn("[RHWP Render Warning]:", err);
    return {
      success: false,
      pageCount: 0,
      pages: [],
      error: err?.message || String(err),
    };
  }
}

/**
 * Downloads HWP file from URL and renders it directly in browser via RHWP WASM
 */
export async function fetchAndRenderHwp(
  fileUrl: string,
  fileName?: string,
  entryPath?: string | null
): Promise<RhwpRenderResult> {
  try {
    const proxyUrl = buildDownloadUrl(
      { fileUrl, entryPath },
      { view: true, fileName: fileName || "document.hwp" }
    );

    const res = await fetch(proxyUrl);
    if (!res.ok) {
      throw new Error(`파일 다운로드 실패 (HTTP ${res.status})`);
    }

    const arrayBuffer = await res.arrayBuffer();
    return await renderHwpBufferToSvgs(arrayBuffer);
  } catch (err: any) {
    return {
      success: false,
      pageCount: 0,
      pages: [],
      error: err?.message || String(err),
    };
  }
}
