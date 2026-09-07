"use client";

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
          if (font !== lastFontCache) {
            measureCanvasCtx.font = font || "10pt 'Malgun Gothic', '맑은 고딕', sans-serif";
            lastFontCache = font;
          }
          return measureCanvasCtx.measureText(text || "").width;
        }
      } catch {
        // Fallback approximate width
      }
      return (text || "").length * 8;
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
      const svg = viewer.renderPageSvg(i);
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
export async function fetchAndRenderHwp(fileUrl: string, fileName?: string): Promise<RhwpRenderResult> {
  try {
    const proxyUrl = `/api/download?url=${encodeURIComponent(fileUrl)}&filename=${encodeURIComponent(
      fileName || "document.hwp"
    )}&view=true`;

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
