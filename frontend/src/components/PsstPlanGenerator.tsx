"use client";

import React, { useState } from "react";
import { PsstPlanGeneratorProps } from "./psst/types";
import { usePsstPlan } from "./psst/hooks/usePsstPlan";
import { PsstSidebar } from "./psst/components/PsstSidebar";
import { PsstHeader } from "./psst/components/PsstHeader";
import { PsstChatPanel } from "./psst/components/PsstChatPanel";
import { PsstFormPanel } from "./psst/components/PsstFormPanel";
import { PsstDocumentViewer } from "./psst/components/PsstDocumentViewer";
import SavedPlansModal from "@/components/auth/SavedPlansModal";

export { TARGET_PROGRAM_FORMATS } from "./psst/constants";

export const PsstPlanGenerator: React.FC<PsstPlanGeneratorProps> = ({
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
  } = usePsstPlan(initialProgramTitle, initialPlanData, initialProgramAnalysis);

  const [showVaultModal, setShowVaultModal] = useState(false);

  // Derive 3-step workflow progress for header
  const hasValidPlan = !!(generatedResult && generatedResult.overview && generatedResult.overview.title);
  const currentStep = hasValidPlan ? 3 : isGenerating ? 2 : 1;

  return (
    <div className="fixed inset-0 z-50 flex bg-slate-950 text-slate-100 font-sans select-text overflow-hidden">
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

        {/* 2-Column Split Workspace */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
          {/* Left Panel: AI Interview Chat vs Fast Form Input */}
          <div className="lg:col-span-5 flex flex-col h-full overflow-hidden border-r border-slate-800 bg-slate-950/60">
            {creationMode === "chat" ? (
              <PsstChatPanel
                formData={formData}
                setFormData={setFormData}
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
            canvasTheme={canvasTheme}
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
        <footer className="h-7 bg-slate-950 border-t border-slate-800/80 px-4 flex items-center justify-between text-[11px] text-slate-500 flex-shrink-0">
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
    </div>
  );
};
