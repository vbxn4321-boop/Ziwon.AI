"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, Save, Download, FileText, AlertCircle, CheckCircle2, FilePlus2 } from "lucide-react";
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
  /** 열 첨부가 없을 때 "표준 서식으로 새로 시작"에 쓸 정보. */
  programTitle?: string;
  programId?: string;
}

type LoadState = "idle" | "loading" | "ready" | "error";
type SaveState = "idle" | "saving" | "saved" | "error";

export const RhwpEditorPanel: React.FC<RhwpEditorPanelProps> = ({
  source,
  isLookingUpSource = false,
  savedDocumentId = null,
  onSaved,
  getAuthToken,
  programTitle,
  programId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<RhwpEditor | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [loadError, setLoadError] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState("");
  // 다시 저장할 때 같은 Storage 객체에 덮어쓰기 위한 id. 처음 저장하면 서버가 만들어 준 id로 갱신한다.
  const [documentId, setDocumentId] = useState<string | null>(savedDocumentId);
  // 열 첨부가 없을 때 사용자가 "표준 서식으로 새로 시작"을 직접 눌렀는가.
  // 예: 공고문 서식이 PDF뿐이라 편집기로는 원본을 못 여는 경우 — 그렇다고
  // 아무것도 못 쓰게 두면 안 되니, 우리 표준 PSST 구조로 된 빈 문서를 대신 연다.
  const [blankStarted, setBlankStarted] = useState(false);

  // 부모가 준 source(첨부 원문 또는 AI 완성본)가 우선이고, 그게 없을 때만
  // 사용자가 직접 시작한 빈 표준 서식을 쓴다. 나중에 AI가 계획서를 완성하면
  // source 가 채워지면서 자연히 그쪽으로 넘어간다.
  const effectiveSource: DocumentSource =
    source ?? (blankStarted ? { kind: "generated", plan: {} as PsstBusinessPlanResult, programTitle, programId } : null);

  /** source 를 식별하는 안정적인 키. 참조가 매번 바뀌는 객체라 effect 의존성으로 못 쓴다. */
  const sourceKey = !effectiveSource
    ? "none"
    : effectiveSource.kind === "generated"
    ? `generated:${effectiveSource.plan?.overview?.title || ""}:${blankStarted ? "blank" : "ai"}`
    : `attachment:${effectiveSource.fileUrl}:${effectiveSource.entryPath || ""}`;

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
      // 스튜디오 마운트(WASM 초기화 + 폰트 로딩)가 끝날 때까지 기다린다. 예전엔
      // 150ms 한 번만 기다리고 포기했는데, 실제 브라우저로 재보니 그 초기화
      // 자체가 종종 150ms보다 오래 걸려서 editorRef 가 여전히 비어 있으면 그냥
      // 조용히 포기해 버렸다 — loadState 가 "loading"/"error" 어느 쪽으로도
      // 안 바뀌니 화면엔 스튜디오의 빈 새 문서만 남고 아무 안내도 없이 멈춰
      // 있는, 사용자 입장에서 원인을 알 수 없는 실패였다. 최대 10초까지 폴링하고,
      // 그래도 안 되면 에러로 명시한다.
      const maxWaitMs = 10000;
      const stepMs = 150;
      let waited = 0;
      while (!editorRef.current && waited < maxWaitMs) {
        await new Promise((r) => setTimeout(r, stepMs));
        if (cancelled) return;
        waited += stepMs;
      }
      const editor = editorRef.current;
      if (!editor) {
        if (!cancelled) {
          setLoadState("error");
          setLoadError("편집기 초기화가 오래 걸립니다. 새로고침 후 다시 시도해 주세요.");
        }
        return;
      }
      if (!effectiveSource) return;

      setLoadState("loading");
      setLoadError("");
      try {
        let bytes: ArrayBuffer;
        let fileName: string;

        if (effectiveSource.kind === "generated") {
          const res = await fetch("/api/export/hwpx", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              plan: effectiveSource.plan,
              programTitle: effectiveSource.programTitle,
              programId: effectiveSource.programId,
            }),
          });
          if (!res.ok) throw new Error(`문서 조립 실패 (HTTP ${res.status})`);
          bytes = await res.arrayBuffer();
          fileName = `${effectiveSource.plan?.overview?.title || "PSST_사업계획서"}.hwpx`;
        } else {
          const proxyUrl = buildDownloadUrl(
            { fileUrl: effectiveSource.fileUrl, entryPath: effectiveSource.entryPath },
            { view: true, fileName: effectiveSource.fileName }
          );
          const res = await fetch(proxyUrl);
          if (!res.ok) throw new Error(`파일을 불러오지 못했습니다 (HTTP ${res.status})`);
          bytes = await res.arrayBuffer();
          fileName = effectiveSource.fileName;
        }

        if (cancelled) return;
        await editor.loadFile(bytes, fileName, { suppressDialogs: true });
        if (cancelled) return;
        setLoadState("ready");
        // 새 문서를 열었으니 이전 문서의 저장 대상 id는 더 이상 유효하지 않다.
        setDocumentId(effectiveSource.kind === "generated" ? savedDocumentId : null);
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
        effectiveSource?.kind === "generated"
          ? `${effectiveSource.plan?.overview?.title || "PSST_사업계획서"}.hwpx`
          : effectiveSource?.kind === "attachment"
          ? effectiveSource.fileName.replace(/\.[^.]+$/, ".hwpx")
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
          supportProgramId: effectiveSource?.kind === "generated" ? effectiveSource.programId : undefined,
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
  }, [loadState, documentId, effectiveSource, getAuthToken, onSaved]);

  const handleDownload = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor || loadState !== "ready") return;
    try {
      const bytes = await editor.exportHwpx();
      // Uint8Array<ArrayBufferLike> 와 BlobPart 의 제네릭이 안 맞다는 TS 경고인데,
      // 런타임에서는 Uint8Array 가 그대로 유효한 BlobPart 다.
      const blob = new Blob([bytes as unknown as BlobPart], { type: "application/vnd.hancom.hwpx" });
      const fileName =
        effectiveSource?.kind === "generated"
          ? `${effectiveSource.plan?.overview?.title || "PSST_사업계획서"}.hwpx`
          : effectiveSource?.kind === "attachment"
          ? effectiveSource.fileName.replace(/\.[^.]+$/, ".hwpx")
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
  }, [loadState, effectiveSource]);

  const showEmptyState = !effectiveSource && !isLookingUpSource;
  const showLoadingOverlay = isLookingUpSource || loadState === "loading";

  return (
    <div className="relative flex-1 min-h-0 flex flex-col bg-white">
      {/* 저장 도구모음. 스튜디오 자체 메뉴·툴바와 별개로, 우리 쪽 영속화(계정 저장소) 액션이다. */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-stone-200 bg-stone-50 flex-shrink-0">
        <div className="text-[11px] text-slate-500 truncate">
          {effectiveSource?.kind === "generated" && (blankStarted ? "표준 서식 (직접 작성 중)" : "AI가 작성한 사업계획서")}
          {effectiveSource?.kind === "attachment" && `첨부 원본 — ${effectiveSource.fileName}`}
          {!effectiveSource && "문서를 기다리는 중"}
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
              위쪽 선택 목록에 PDF 등 편집기가 못 여는 서식이 있다면 골라서 직접 입력할 수 있습니다. 왼쪽에서 대화를
              시작하면 초안이 만들어진 뒤 완성된 사업계획서가 여기에 열리고, 아래에서 표준 서식으로 바로 시작할
              수도 있습니다.
            </p>
            <button
              type="button"
              onClick={() => setBlankStarted(true)}
              className="mt-4 flex items-center gap-1.5 justify-center text-[12px] font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg px-4 py-2 cursor-pointer"
            >
              <FilePlus2 className="w-3.5 h-3.5" />
              표준 서식으로 바로 시작
            </button>
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
