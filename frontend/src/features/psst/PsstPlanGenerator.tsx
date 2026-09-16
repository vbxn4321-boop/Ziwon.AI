"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { PsstPlanGeneratorProps } from "./types";
import { usePsstPlan } from "./hooks/usePsstPlan";
import { PsstSidebar } from "./components/PsstSidebar";
import { PsstHeader } from "./components/PsstHeader";
import { PsstChatPanel } from "./components/PsstChatPanel";
import { PsstFormPanel } from "./components/PsstFormPanel";
import { PsstDocumentViewer } from "./components/PsstDocumentViewer";
import SavedPlansModal from "@/components/auth/SavedPlansModal";

export { TARGET_PROGRAM_FORMATS } from "./constants";

export const PsstPlanGenerator: React.FC<PsstPlanGeneratorProps> = ({
  initialProgramId,
  initialProgramTitle,
  initialPlanData,
  onBackToNotices,
  initialProgramAnalysis,
}) => {
  const {
    userCompany,
    handlePrefillFromCompany,
    creationMode,
    setCreationMode,
    canvasTheme,
    setCanvasTheme,
    realFormSchema,
    realFormDocument,
    setImportedPlanText,
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
    isDirectEditing,
    setIsDirectEditing,
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

  // 좌측 챗봇 / 우측 문서 분할 너비. 가운데 손잡이를 잡고 끌어 조절한다.
  const MIN_CHAT_WIDTH = 360;
  const MIN_DOC_WIDTH = 420;
  const [chatWidth, setChatWidth] = useState(520);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const didInitWidthRef = useRef(false);

  /** 두 패널을 1:1 로 되돌린다. 손잡이를 더블클릭하면 여기로 온다. */
  const resetSplit = useCallback(() => {
    const el = workspaceRef.current;
    if (!el) return;
    const total = el.getBoundingClientRect().width;
    if (!total) return;
    const max = Math.max(MIN_CHAT_WIDTH, total - MIN_DOC_WIDTH);
    setChatWidth(Math.min(Math.max(total / 2, MIN_CHAT_WIDTH), max));
  }, []);

  // 처음에는 1:1 로 시작하고, 창 크기가 바뀌면 최소 너비 안으로 다시 가둔다.
  useEffect(() => {
    const applyBounds = () => {
      const el = workspaceRef.current;
      if (!el) return;
      const total = el.getBoundingClientRect().width;
      if (!total) return;
      const max = Math.max(MIN_CHAT_WIDTH, total - MIN_DOC_WIDTH);
      if (!didInitWidthRef.current) {
        didInitWidthRef.current = true;
        setChatWidth(Math.min(Math.max(total / 2, MIN_CHAT_WIDTH), max));
        return;
      }
      setChatWidth((prev) => Math.min(Math.max(prev, MIN_CHAT_WIDTH), max));
    };
    applyBounds();
    window.addEventListener("resize", applyBounds);
    return () => window.removeEventListener("resize", applyBounds);
  }, []);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    // 끌고 가는 동안 문서 텍스트가 드래그 선택되지 않도록 잠근다
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  }, []);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !workspaceRef.current) return;
      const bounds = workspaceRef.current.getBoundingClientRect();
      const next = e.clientX - bounds.left;
      // 양쪽 최소 너비를 지켜서, 한쪽 패널이 사라지지 않게 한다
      const max = bounds.width - MIN_DOC_WIDTH;
      setChatWidth(Math.min(Math.max(next, MIN_CHAT_WIDTH), Math.max(MIN_CHAT_WIDTH, max)));
    };
    const handleUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, []);

  return (
    <div className="psst-studio fixed inset-0 z-50 flex bg-[#f7f7f5] text-slate-900 font-sans select-text overflow-y-auto md:overflow-hidden">
      {/* 1. Left Icon Sidebar */}
      <PsstSidebar
        onBackToNotices={onBackToNotices}
        onResetNew={handleResetNew}
        onScrollToSection={scrollToSection}
      />

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

        {/* 2-Column Split Workspace
            챗봇이 가장 많이 쓰는 영역이라 좌측 풀 높이로 두고, 문서(목차+미리보기)는
            우측에 배치한다. 가운데 손잡이를 끌어 두 패널 너비를 조절할 수 있다. */}
        <div
          ref={workspaceRef}
          className="flex-1 flex flex-col md:flex-row gap-0 overflow-y-auto md:overflow-hidden"
        >
          {/* Left Panel: AI Interview Chat vs Fast Form Input */}
          <div
            // 모바일은 세로로 쌓이므로 전체 너비, 데스크톱에서만 조절된 너비를 쓴다
            style={{ ["--chat-w" as string]: `${chatWidth}px` } as React.CSSProperties}
            className="w-full md:w-[var(--chat-w)] flex flex-col min-h-[62vh] md:min-h-0 md:h-full overflow-hidden bg-white md:flex-shrink-0">
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

          {/* 패널 분할 손잡이. 데스크톱에서만 보이고, 잡고 끌면 좌우 너비가 바뀐다. */}
          <div
            role="separator"
            aria-orientation="vertical"
            onMouseDown={handleDragStart}
            onDoubleClick={resetSplit}
            title="드래그하여 좌우 너비 조절 (더블클릭 시 1:1)"
            className="hidden lg:flex w-px flex-shrink-0 cursor-col-resize items-center justify-center bg-stone-200 hover:bg-indigo-400 transition-colors group relative"
          >
            <span className="absolute w-1 h-10 rounded-full bg-stone-300 group-hover:bg-indigo-500 transition-colors" />
          </div>

          {/* Right Panel: Document Paper Canvas */}
          <PsstDocumentViewer
            canvasTheme="light"
            formSchema={realFormSchema}
            formDocument={realFormDocument}
            onImportedPlanText={setImportedPlanText}
            activeSection={activeSection}
            generatedResult={generatedResult}
            formData={formData}
            isGenerating={isGenerating}
            isDirectEditing={isDirectEditing}
            setIsDirectEditing={setIsDirectEditing}
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
