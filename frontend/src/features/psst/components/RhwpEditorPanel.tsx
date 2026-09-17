"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, Save, Download, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import type { RhwpEditor } from "@rhwp/editor";
import { PsstBusinessPlanResult } from "@/lib/ai/psst-generator";
import { buildDownloadUrl } from "@/lib/documents/download";

/**
 * 실제 HWP/HWPX 문서 안에서 편집하는 패널.
 *
 * 이전에는 두 개의 자체 제작 에디터가 있었다 — 생성된 계획서용 contentEditable
 * div(A4DocumentEditor)와, 첨부 서식 칸을 나열한 <textarea> 목록. 둘 다 원본
 * 문서의 실제 레이아웃·서식과 무관한 별개의 표현이었다.
 *
 * 이 패널은 그 대신 실제 문서를 rhwp(자기호스팅한 @rhwp/editor 스튜디오,
 * `/rhwp-studio/`)로 직접 연다. 챗봇이 아직 계획서를 안 만들었으면 공고의
 * 실제 첨부 서식을, 계획서를 만들었으면(/api/export/hwpx 가 조립한, 가능하면
 * 원본 서식에 내용을 채운) HWPX 를 연다. 사용자는 메뉴·툴바·표 편집까지 되는
 * 진짜 문서 편집기 안에서 고친다.
 *
 * `studioUrl` 을 우리 자신의 오리진(`/rhwp-studio/`)으로 고정한다. 기본값인
 * 제3자 GitHub Pages 로 두면 문서 내용(사업자등록번호·대표자 정보 등)이
 * postMessage 로 외부 서버에 오가게 된다 — 이번 세션에서 개인정보를 Gemini 에도
 * 안 보내려고 마스킹했던 것과 같은 이유로 안 된다.
 */

type DocumentSource =
  | { kind: "generated"; plan: PsstBusinessPlanResult; programTitle?: string; programId?: string }
  | { kind: "attachment"; fileName: string; fileUrl: string; entryPath?: string | null }
  | null;

interface RhwpEditorPanelProps {
  source: DocumentSource;
  /** 첨부 서식 조회 자체가 아직 끝나지 않았는가 (source 가 null 이어도 로딩 중일 수 있다) */
  isLookingUpSource?: boolean;
  /** 저장 완료 후 이 문서를 다시 열 때 같은 레코드에 덮어쓰도록 넘겨준다 */
  savedDocumentId?: string | null;
  onSaved?: (documentId: string) => void;
  getAuthToken: () => Promise<string | null>;
}

type LoadState = "idle" | "loading" | "ready" | "error";
type SaveState = "idle" | "saving" | "saved" | "error";

export const RhwpEditorPanel: React.FC<RhwpEditorPanelProps> = ({
  source,
  isLookingUpSource = false,
  savedDocumentId = null,
  onSaved,
  getAuthToken,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<RhwpEditor | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [loadError, setLoadError] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState("");
  // 다시 저장할 때 같은 Storage 객체에 덮어쓰기 위한 id. 처음 저장하면 서버가 만들어 준 id로 갱신한다.
  const [documentId, setDocumentId] = useState<string | null>(savedDocumentId);

  /** source 를 식별하는 안정적인 키. 참조가 매번 바뀌는 객체라 effect 의존성으로 못 쓴다. */
  const sourceKey = !source
    ? "none"
    : source.kind === "generated"
    ? `generated:${source.plan?.overview?.title || ""}`
    : `attachment:${source.fileUrl}:${source.entryPath || ""}`;

  // 스튜디오 마운트. source 가 바뀌어도 iframe 은 그대로 두고 loadFile 만 다시 부른다 —
  // README 경고대로 컨테이너를 옮기거나 다시 만들면 편집 상태가 날아간다.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!containerRef.current) return;
      const { createStudio } = await import("@rhwp/editor");
      if (cancelled) return;
      const editor = await createStudio(containerRef.current, {
        // "/rhwp-studio/" 처럼 디렉터리 형태로 주면 Next.js 가 trailingSlash 기본
        // 설정(false) 때문에 "/rhwp-studio" 로 308 리다이렉트하는데, public/ 정적
        // 서빙은 디렉터리 인덱스 파일을 자동으로 찾아주지 않아 리다이렉트 직후
        // 404 가 난다. index.html 을 직접 지정해 리다이렉트 자체를 없앤다.
        studioUrl: "/rhwp-studio/index.html",
        chrome: { menu: true, toolbar: true, statusbar: false },
      });
      if (cancelled) {
        editor.destroy();
        return;
      }
      editorRef.current = editor;
    })();
    return () => {
      cancelled = true;
      editorRef.current?.destroy();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 문서 로드. 스튜디오가 준비되고 source 가 바뀔 때마다 다시 부른다.
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      // 스튜디오 마운트가 아직 안 끝났으면 잠깐 기다렸다 재시도한다.
      if (!editorRef.current) {
        await new Promise((r) => setTimeout(r, 150));
        if (cancelled) return;
      }
      const editor = editorRef.current;
      if (!editor || !source) return;

      setLoadState("loading");
      setLoadError("");
      try {
        let bytes: ArrayBuffer;
        let fileName: string;

        if (source.kind === "generated") {
          const res = await fetch("/api/export/hwpx", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              plan: source.plan,
              programTitle: source.programTitle,
              programId: source.programId,
            }),
          });
          if (!res.ok) throw new Error(`문서 조립 실패 (HTTP ${res.status})`);
          bytes = await res.arrayBuffer();
          fileName = `${source.plan?.overview?.title || "PSST_사업계획서"}.hwpx`;
        } else {
          const proxyUrl = buildDownloadUrl(
            { fileUrl: source.fileUrl, entryPath: source.entryPath },
            { view: true, fileName: source.fileName }
          );
          const res = await fetch(proxyUrl);
          if (!res.ok) throw new Error(`파일을 불러오지 못했습니다 (HTTP ${res.status})`);
          bytes = await res.arrayBuffer();
          fileName = source.fileName;
        }

        if (cancelled) return;
        await editor.loadFile(bytes, fileName, { suppressDialogs: true });
        if (cancelled) return;
        setLoadState("ready");
        // 새 문서를 열었으니 이전 문서의 저장 대상 id는 더 이상 유효하지 않다.
        setDocumentId(source.kind === "generated" ? savedDocumentId : null);
      } catch (err: any) {
        if (!cancelled) {
          setLoadState("error");
          setLoadError(err?.message || "문서를 여는 중 오류가 발생했습니다.");
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKey]);

  const handleSave = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor || loadState !== "ready") return;

    setSaveState("saving");
    setSaveError("");
    try {
      const bytes = await editor.exportHwpx();
      // base64 변환. 문서 크기가 보통 수백 KB대라 청크 없이 바로 처리한다.
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const contentBase64 = btoa(binary);

      const token = await getAuthToken();
      const fileName =
        source?.kind === "generated"
          ? `${source.plan?.overview?.title || "PSST_사업계획서"}.hwpx`
          : source?.kind === "attachment"
          ? source.fileName.replace(/\.[^.]+$/, ".hwpx")
          : "문서.hwpx";

      const res = await fetch("/api/documents/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          fileName,
          format: "hwpx",
          contentBase64,
          id: documentId || undefined,
          supportProgramId: source?.kind === "generated" ? source.programId : undefined,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || `저장 실패 (HTTP ${res.status})`);
      }

      await editor.notifySaved(fileName);
      setDocumentId(json.document.id);
      onSaved?.(json.document.id);
      setSaveState("saved");
      setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 2500);
    } catch (err: any) {
      setSaveState("error");
      setSaveError(err?.message || "저장하지 못했습니다.");
    }
  }, [loadState, documentId, source, getAuthToken, onSaved]);

  const handleDownload = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor || loadState !== "ready") return;
    try {
      const bytes = await editor.exportHwpx();
      // Uint8Array<ArrayBufferLike> 와 BlobPart 의 제네릭이 안 맞다는 TS 경고인데,
      // 런타임에서는 Uint8Array 가 그대로 유효한 BlobPart 다.
      const blob = new Blob([bytes as unknown as BlobPart], { type: "application/vnd.hancom.hwpx" });
      const fileName =
        source?.kind === "generated"
          ? `${source.plan?.overview?.title || "PSST_사업계획서"}.hwpx`
          : source?.kind === "attachment"
          ? source.fileName.replace(/\.[^.]+$/, ".hwpx")
          : "문서.hwpx";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setSaveState("error");
      setSaveError(err?.message || "다운로드에 실패했습니다.");
    }
  }, [loadState, source]);

  const showEmptyState = !source && !isLookingUpSource;
  const showLoadingOverlay = isLookingUpSource || loadState === "loading";

  return (
    <div className="relative flex-1 min-h-0 flex flex-col bg-white">
      {/* 저장 도구모음. 스튜디오 자체 메뉴·툴바와 별개로, 우리 쪽 영속화(계정 저장소) 액션이다. */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-stone-200 bg-stone-50 flex-shrink-0">
        <div className="text-[11px] text-slate-500 truncate">
          {source?.kind === "generated" && "AI가 작성한 사업계획서"}
          {source?.kind === "attachment" && `첨부 원본 — ${source.fileName}`}
          {!source && "문서를 기다리는 중"}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {saveState === "error" && (
            <span className="flex items-center gap-1 text-[11px] text-rose-600">
              <AlertCircle className="w-3 h-3" /> {saveError}
            </span>
          )}
          {saveState === "saved" && (
            <span className="flex items-center gap-1 text-[11px] text-emerald-600">
              <CheckCircle2 className="w-3 h-3" /> 저장됨
            </span>
          )}
          <button
            type="button"
            onClick={handleDownload}
            disabled={loadState !== "ready"}
            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-600 border border-stone-200 hover:border-slate-400 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
          >
            <Download className="w-3 h-3" /> 다운로드
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loadState !== "ready" || saveState === "saving"}
            className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
          >
            {saveState === "saving" ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Save className="w-3 h-3" />
            )}
            내 저장소에 저장
          </button>
        </div>
      </div>

      <div className="relative flex-1 min-h-0">
        <div ref={containerRef} className="absolute inset-0" />

        {showEmptyState && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 bg-white">
            <FileText className="w-10 h-10 text-slate-300 mb-4" />
            <h3 className="text-base font-bold text-slate-700 mb-1.5">아직 열 문서가 없습니다</h3>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              왼쪽에서 대화를 시작하면 이 공고의 첨부 서식이나, 초안이 만들어진 뒤에는
              완성된 사업계획서가 여기에 열립니다.
            </p>
          </div>
        )}

        {showLoadingOverlay && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin mb-3" />
            <p className="text-xs text-slate-500">문서를 불러오는 중입니다...</p>
          </div>
        )}

        {loadState === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 bg-white">
            <AlertCircle className="w-8 h-8 text-rose-500 mb-3" />
            <p className="text-sm font-semibold text-slate-700 mb-1">문서를 열지 못했습니다</p>
            <p className="text-xs text-slate-400 max-w-sm">{loadError}</p>
          </div>
        )}
      </div>
    </div>
  );
};
