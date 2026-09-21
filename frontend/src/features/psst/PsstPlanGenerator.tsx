"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { PanelLeftOpen } from "lucide-react";
import { PsstPlanGeneratorProps } from "./types";
import { usePsstPlan } from "./hooks/usePsstPlan";
import { PsstSidebar } from "./components/PsstSidebar";
import { PsstHeader } from "./components/PsstHeader";
import { PsstChatPanel } from "./components/PsstChatPanel";
import { PsstFormPanel } from "./components/PsstFormPanel";
import { PsstDocumentViewer } from "./components/PsstDocumentViewer";
import { PsstConversationOutline } from "./components/PsstConversationOutline";
import { PsstMappingModal } from "./components/PsstMappingModal";
import SavedPlansModal from "@/components/auth/SavedPlansModal";

export { TARGET_PROGRAM_FORMATS } from "./constants";

export const PsstPlanGenerator: React.FC<PsstPlanGeneratorProps> = ({
  initialProgramId,
  initialProgramTitle,
  initialPlanData,
  onBackToNotices,
  initialProgramAnalysis,
  editorOnly = false,
}) => {
  const {
    userCompany,
    handlePrefillFromCompany,
    creationMode,
    setCreationMode,
    canvasTheme,
    setCanvasTheme,
    realFormDocument,
    setRealFormDocument,
    realFormDocuments,
    unopenableDocuments,
    isFormSchemaLoading,
    uploadedFileName,
    isUploadingPlan,
    uploadError,
    isMappingPlan,
    mappedPlanPreview,
    uploadExistingPlan,
    clearImportedPlan,
    handleAutoMapFromImportedPlan,
    handleApplyMappedFields,
    handleDismissMappingModal,
    formData,
    setFormData,
    chatMessages,
    chatInput,
    setChatInput,
    isChatSending,
    currentSuggestions,
    interviewProgress,
    isGenerating,
    generatedResult,
    errorMessage,
    isCopied,
    isSavingPlan,
    saveSuccessMsg,
    activeSection,
    chatScrollRef,
    docScrollRef,
    sectionRefs,
    handleResetNew,
    scrollToSection,
    handleQuickSuggestion,
    handleSendChat,
    handleGenerateFromChat,
    handleGenerateFromForm,
    handleCopyFullText,
    handleSavePlan,
    handleDownloadPdf,
    handleLoadPlan,
  } = usePsstPlan(initialProgramTitle, initialPlanData, initialProgramAnalysis, initialProgramId);

  const [showVaultModal, setShowVaultModal] = useState(false);

  // Derive 3-step workflow progress for header
  const hasValidPlan = !!(generatedResult && generatedResult.overview && generatedResult.overview.title);
  const currentStep = hasValidPlan ? 3 : isGenerating ? 2 : 1;

  /**
   * 3분할 작업 영역의 너비 관리.
   *
   * `챗봇 | 대화의 목차 | 에디터` 순서로, 앞의 두 패널만 고정 너비를 갖고
   * 에디터가 남는 폭을 전부 가져간다. 손잡이는 둘 사이마다 하나씩 있다.
   */
  const MIN_CHAT_WIDTH = 340;
  const MIN_OUTLINE_WIDTH = 200;
  const MIN_DOC_WIDTH = 420;
  const DEFAULT_OUTLINE_WIDTH = 260;

  const [chatWidth, setChatWidth] = useState(480);
  const [outlineWidth, setOutlineWidth] = useState(DEFAULT_OUTLINE_WIDTH);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const workspaceRef = useRef<HTMLDivElement>(null);
  /** 지금 끌고 있는 손잡이. null 이면 드래그 중이 아니다. */
  const draggingRef = useRef<"chat" | "outline" | null>(null);
  const didInitWidthRef = useRef(false);

  /** 챗봇과 에디터를 1:1 로 맞춘다. 목차는 기본 너비로 되돌린다. */
  const resetSplit = useCallback(() => {
    const el = workspaceRef.current;
    if (!el) return;
    const total = el.getBoundingClientRect().width;
    if (!total) return;
    const rest = total - DEFAULT_OUTLINE_WIDTH;
    setOutlineWidth(DEFAULT_OUTLINE_WIDTH);
    setChatWidth(Math.max(MIN_CHAT_WIDTH, Math.min(rest / 2, rest - MIN_DOC_WIDTH)));
  }, []);

  // 처음엔 챗봇:에디터를 1:1 로 두고, 창이 좁아지면 앞 두 패널을 줄여
  // 에디터가 최소 폭 아래로 밀리지 않게 한다.
  useEffect(() => {
    const applyBounds = () => {
      const el = workspaceRef.current;
      if (!el) return;
      const total = el.getBoundingClientRect().width;
      if (!total) return;

      if (!didInitWidthRef.current) {
        didInitWidthRef.current = true;
        const rest = total - DEFAULT_OUTLINE_WIDTH;
        setChatWidth(Math.max(MIN_CHAT_WIDTH, Math.min(rest / 2, rest - MIN_DOC_WIDTH)));
        return;
      }

      const maxChat = Math.max(MIN_CHAT_WIDTH, total - MIN_OUTLINE_WIDTH - MIN_DOC_WIDTH);
      setChatWidth((prev) => Math.min(Math.max(prev, MIN_CHAT_WIDTH), maxChat));
      setOutlineWidth((prev) => {
        const maxOutline = Math.max(MIN_OUTLINE_WIDTH, total - MIN_CHAT_WIDTH - MIN_DOC_WIDTH);
        return Math.min(Math.max(prev, MIN_OUTLINE_WIDTH), maxOutline);
      });
    };

    applyBounds();
    window.addEventListener("resize", applyBounds);
    return () => window.removeEventListener("resize", applyBounds);
  }, []);

  const startDrag = useCallback((which: "chat" | "outline") => (e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = which;
    // 끌고 가는 동안 문서 텍스트가 드래그 선택되지 않도록 잠근다
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  }, []);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const which = draggingRef.current;
      if (!which || !workspaceRef.current) return;
      const bounds = workspaceRef.current.getBoundingClientRect();
      const offset = e.clientX - bounds.left;

      if (which === "chat") {
        // 목차와 에디터의 최소 폭을 남겨둔다
        const max = bounds.width - outlineWidth - MIN_DOC_WIDTH;
        setChatWidth(Math.min(Math.max(offset, MIN_CHAT_WIDTH), Math.max(MIN_CHAT_WIDTH, max)));
      } else {
        const max = bounds.width - chatWidth - MIN_DOC_WIDTH;
        setOutlineWidth(
          Math.min(Math.max(offset - chatWidth, MIN_OUTLINE_WIDTH), Math.max(MIN_OUTLINE_WIDTH, max))
        );
      }
    };
    const handleUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = null;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [chatWidth, outlineWidth]);

  /** 목차에서 칸을 고르면 그 칸을 지금 다루자고 챗봇에게 말한다. */
  const handleJumpToField = useCallback(
    (field: { label: string }) => {
      handleQuickSuggestion(`'${field.label}' 항목을 지금 작성하고 싶어. 이 항목부터 질문해줘.`);
    },
    [handleQuickSuggestion]
  );

  return (
    <div className="psst-studio fixed inset-0 z-50 flex bg-[#f7f7f5] text-slate-900 font-sans select-text overflow-y-auto md:overflow-hidden">
      {/* 1. Left Icon Sidebar — 접으면 통째로 사라지고 여는 버튼만 남는다 */}
      {!sidebarCollapsed && (
        <PsstSidebar
          onBackToNotices={onBackToNotices}
          onResetNew={handleResetNew}
          onScrollToSection={scrollToSection}
          onCollapse={() => setSidebarCollapsed(true)}
        />
      )}
      {sidebarCollapsed && (
        <button
          type="button"
          onClick={() => setSidebarCollapsed(false)}
          title="사이드바 열기"
          aria-label="사이드바 열기"
          className="absolute left-2 top-2 z-40 w-8 h-8 rounded-lg bg-white border border-stone-200 shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-900 hover:border-slate-400 transition-colors cursor-pointer"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
      )}

      {/* 2. Main Workspace Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Workspace Top Header Bar */}
        <PsstHeader
          creationMode={creationMode}
          setCreationMode={setCreationMode}
          canvasTheme={canvasTheme}
          setCanvasTheme={setCanvasTheme}
          hasResult={hasValidPlan}
          isCopied={isCopied}
          onCopyFullText={handleCopyFullText}
          onResetNew={handleResetNew}
          onBackToNotices={onBackToNotices}
          onSavePlan={handleSavePlan}
          isSavingPlan={isSavingPlan}
          saveSuccessMsg={saveSuccessMsg}
          onDownloadPdf={handleDownloadPdf}
          targetProgramTitle={formData.targetProgramTitle}
          currentStep={currentStep}
          onOpenVault={() => setShowVaultModal(true)}
        />

        {/* 3분할 작업 영역: 챗봇 | 대화의 목차 | 계획서 에디터
            챗봇이 가장 많이 쓰는 영역이라 왼쪽에 두고, 가운데 목차는 지금
            어느 칸을 다루는 중인지 보여준다. 에디터가 남는 폭을 전부 가져간다.
            AI 분석을 열지 않은 계정(editorOnly)은 에디터만 본다. */}
        <div
          ref={workspaceRef}
          className="flex-1 flex flex-col md:flex-row gap-0 overflow-y-auto md:overflow-hidden"
        >
          {!editorOnly && (
            <>
              {/* 1) AI 챗봇 */}
              <div
                // 모바일은 세로로 쌓이므로 전체 너비, 데스크톱에서만 조절된 너비를 쓴다
                style={{ ["--chat-w" as string]: `${chatWidth}px` } as React.CSSProperties}
                className="w-full md:w-[var(--chat-w)] flex flex-col min-h-[62vh] md:min-h-0 md:h-full overflow-hidden bg-white md:flex-shrink-0"
              >
                {creationMode === "chat" ? (
                  <PsstChatPanel
                    chatMessages={chatMessages}
                    chatInput={chatInput}
                    setChatInput={setChatInput}
                    isChatSending={isChatSending}
                    isGenerating={isGenerating}
                    interviewProgress={interviewProgress}
                    currentSuggestions={currentSuggestions}
                    generatedResult={generatedResult}
                    chatScrollRef={chatScrollRef}
                    onSendChat={handleSendChat}
                    onGenerateFromChat={handleGenerateFromChat}
                    onQuickSuggestion={handleQuickSuggestion}
                    onScrollToSection={scrollToSection}
                    uploadedFileName={uploadedFileName}
                    isUploadingPlan={isUploadingPlan}
                    uploadError={uploadError}
                    isMappingPlan={isMappingPlan}
                    onUploadExistingPlan={uploadExistingPlan}
                    onClearImportedPlan={clearImportedPlan}
                    onAutoMapPlan={handleAutoMapFromImportedPlan}
                  />
                ) : (
                  <PsstFormPanel
                    formData={formData}
                    setFormData={setFormData}
                    isGenerating={isGenerating}
                    errorMessage={errorMessage}
                    onGenerateFromForm={handleGenerateFromForm}
                    userCompany={userCompany}
                    onPrefillFromCompany={handlePrefillFromCompany}
                  />
                )}
              </div>

              {/* 손잡이 1: 챗봇 / 목차 */}
              <div
                role="separator"
                aria-orientation="vertical"
                onMouseDown={startDrag("chat")}
                onDoubleClick={resetSplit}
                title="드래그하여 너비 조절 (더블클릭 시 기본 배치)"
                className="hidden md:flex w-px flex-shrink-0 cursor-col-resize items-center justify-center bg-stone-200 hover:bg-indigo-400 transition-colors group relative"
              >
                <span className="absolute w-1 h-10 rounded-full bg-stone-300 group-hover:bg-indigo-500 transition-colors" />
              </div>

              {/* 2) 대화의 목차 — 파싱된 서식 칸 중 지금 다루는 곳을 보여준다 */}
              <div
                style={{ ["--outline-w" as string]: `${outlineWidth}px` } as React.CSSProperties}
                className="w-full md:w-[var(--outline-w)] flex flex-col min-h-[40vh] md:min-h-0 md:h-full overflow-hidden md:flex-shrink-0"
              >
                <PsstConversationOutline
                  interviewProgress={interviewProgress}
                  onJumpToField={handleJumpToField}
                  disabled={isChatSending || isGenerating}
                />
              </div>

              {/* 손잡이 2: 목차 / 에디터 */}
              <div
                role="separator"
                aria-orientation="vertical"
                onMouseDown={startDrag("outline")}
                onDoubleClick={resetSplit}
                title="드래그하여 너비 조절 (더블클릭 시 기본 배치)"
                className="hidden md:flex w-px flex-shrink-0 cursor-col-resize items-center justify-center bg-stone-200 hover:bg-indigo-400 transition-colors group relative"
              >
                <span className="absolute w-1 h-10 rounded-full bg-stone-300 group-hover:bg-indigo-500 transition-colors" />
              </div>
            </>
          )}

          {/* 3) 계획서 에디터 */}
          <PsstDocumentViewer
            canvasTheme="light"
            formDocument={realFormDocument}
            formDocuments={realFormDocuments}
            unopenableDocuments={unopenableDocuments}
            onSelectFormDocument={setRealFormDocument}
            isFormSchemaLoading={isFormSchemaLoading}
            activeSection={activeSection}
            generatedResult={generatedResult}
            formData={formData}
            isGenerating={isGenerating}
            docScrollRef={docScrollRef}
            sectionRefs={sectionRefs}
            onScrollToSection={scrollToSection}
          />
        </div>

        {/* Minimal editor status, matching a document workspace rather than a dashboard. */}
        <footer className="h-7 bg-[#fbfbfa] border-t border-stone-200 px-4 flex items-center justify-end text-[11px] text-stone-400 flex-shrink-0">
          <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />자동 저장됨</span>
        </footer>
      </div>

      {/* Vault Modal for AI Studio */}
      <SavedPlansModal
        isOpen={showVaultModal}
        onClose={() => setShowVaultModal(false)}
        onSelectPlan={(plan: any) => {
          handleLoadPlan(plan);
          setShowVaultModal(false);
        }}
      />

      {/* Auto-Mapping Preview & Confirmation Modal */}
      <PsstMappingModal
        isOpen={!!mappedPlanPreview}
        onClose={handleDismissMappingModal}
        mappedPlan={mappedPlanPreview}
        currentFormData={formData}
        onApply={handleApplyMappedFields}
      />
      <style jsx global>{`
        .psst-studio button { transition: background-color .15s ease, color .15s ease, border-color .15s ease; }
        .psst-studio h1, .psst-studio h2, .psst-studio h3 { letter-spacing: -0.015em; }
        .psst-studio ::-webkit-scrollbar { width: 8px; height: 8px; }
        .psst-studio ::-webkit-scrollbar-track { background: transparent; }
        .psst-studio ::-webkit-scrollbar-thumb { background: #d6d3d1; border-radius: 999px; }
        .psst-studio ::-webkit-scrollbar-thumb:hover { background: #a8a29e; }
        /* Legacy document cards were authored for the old dark console. Keep their
           content readable when the studio uses the Notion-like light canvas. */
        .psst-studio [class*="bg-slate-950"], .psst-studio [class*="bg-slate-900"], .psst-studio [class*="bg-blue-950"], .psst-studio [class*="bg-purple-950"], .psst-studio [class*="bg-emerald-950"] { background-color: #ffffff !important; }
        .psst-studio [class*="text-slate-300"], .psst-studio [class*="text-slate-200"], .psst-studio [class*="text-slate-100"], .psst-studio [class*="text-blue-200"], .psst-studio [class*="text-purple-200"], .psst-studio [class*="text-emerald-200"] { color: #475569 !important; }
        .psst-studio [class*="border-slate-800"], .psst-studio [class*="border-slate-700"] { border-color: #e7e5e4 !important; }
      `}</style>
    </div>
  );
};
