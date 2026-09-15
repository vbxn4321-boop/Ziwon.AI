"use client";

import React, { useState } from "react";
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

  return (
    <div className="psst-studio fixed inset-0 z-50 flex bg-[#f7f7f5] text-slate-900 font-sans select-text overflow-y-auto lg:overflow-hidden">
      {/* 1. Left Icon Sidebar */}
      <PsstSidebar
        onBackToNotices={onBackToNotices}
        onResetNew={handleResetNew}
        onScrollToSection={scrollToSection}
        activeSection={activeSection}
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

        {/* 2-Column Split Workspace */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] gap-0 overflow-y-auto lg:overflow-hidden">
          {/* Left Panel: AI Interview Chat vs Fast Form Input */}
          <div className="lg:order-2 flex flex-col min-h-[62vh] lg:min-h-0 lg:h-full overflow-hidden lg:border-l border-slate-200 bg-white">
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

          {/* Right Panel: Document Paper Canvas */}
          <PsstDocumentViewer
            canvasTheme="light"
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

        {/* Bottom Status Bar */}
        <footer className="h-7 bg-white border-t border-slate-200 px-4 flex items-center justify-between text-[11px] text-slate-400 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <span>Ziwon.AI PSST Business Plan Workspace</span>
            <span>•</span>
            <span>Gemini AI Engine Live Connected</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>실시간 대화 & 분석 동기화 중</span>
          </div>
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
        .psst-studio [class*="bg-slate-950"], .psst-studio [class*="bg-slate-900"] { background-color: #ffffff !important; }
        .psst-studio [class*="text-slate-300"], .psst-studio [class*="text-slate-200"] { color: #475569 !important; }
        .psst-studio [class*="border-slate-800"], .psst-studio [class*="border-slate-700"] { border-color: #e7e5e4 !important; }
      `}</style>
    </div>
  );
};
