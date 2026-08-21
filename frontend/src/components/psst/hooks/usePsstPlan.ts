import { useState, useRef, useEffect } from "react";
import { PsstBusinessPlanResult, PsstGeneratorInput } from "@/lib/ai/psst-generator";
import {
  ChatMessage,
  CreationMode,
  CanvasTheme,
  PsstSectionKey,
  InterviewProgress,
  PsstFormData,
} from "../types";
import { DEFAULT_INITIAL_MESSAGE, DEFAULT_SUGGESTIONS } from "../constants";
import { savePlanToBackend } from "@/lib/backend-client";
import { getJwtToken } from "@/lib/supabase-client";

export function usePsstPlan(initialProgramTitle?: string) {
  // Mode: "chat" (AI Chatbot Interview) vs "form" (Quick Form Input)
  const [creationMode, setCreationMode] = useState<CreationMode>("chat");

  // Document Canvas Theme: "dark" vs "light"
  const [canvasTheme, setCanvasTheme] = useState<CanvasTheme>("dark");

  // Form Data
  const [formData, setFormData] = useState<PsstFormData>({
    companyName: "",
    itemName: "",
    industry: "",
    targetCustomer: "",
    itemDescription: "",
    coreStrengths: "",
    targetProgramTitle: initialProgramTitle || "2026년 중소벤처기업부 초기창업패키지",
    budget: "",
  });

  // Chat Messages for Chatbot Interview Mode
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "msg-1",
      role: "assistant",
      content: DEFAULT_INITIAL_MESSAGE,
      timestamp: "방금 전",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatSending, setIsChatSending] = useState(false);

  // Interactive Suggestion Pills and Checklist Progress
  const [currentSuggestions, setCurrentSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);
  const [interviewProgress, setInterviewProgress] = useState<InterviewProgress>({
    itemTarget: false,
    problem: false,
    solution: false,
    scaleUp: false,
    team: false,
    currentStep: 1,
    completedCount: 0,
  });

  // Business Plan Result State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<PsstBusinessPlanResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isDirectEditing, setIsDirectEditing] = useState(false);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Active section for jump & chat edit pill
  const [activeSection, setActiveSection] = useState<PsstSectionKey>("overview");

  // Bottom modification text
  const [modificationText, setModificationText] = useState("");
  const [isModifying, setIsModifying] = useState(false);

  // Scroll Refs
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const docScrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs: Record<PsstSectionKey, React.RefObject<HTMLDivElement | null>> = {
    overview: useRef<HTMLDivElement>(null),
    problem: useRef<HTMLDivElement>(null),
    solution: useRef<HTMLDivElement>(null),
    scaleUp: useRef<HTMLDivElement>(null),
    team: useRef<HTMLDivElement>(null),
    evaluation: useRef<HTMLDivElement>(null),
  };

  // Reset to brand new business plan session
  const handleResetNew = () => {
    setFormData({
      companyName: "",
      itemName: "",
      industry: "",
      targetCustomer: "",
      itemDescription: "",
      coreStrengths: "",
      targetProgramTitle: initialProgramTitle || "2026년 중소벤처기업부 초기창업패키지",
      budget: "",
    });
    setChatMessages([
      {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: DEFAULT_INITIAL_MESSAGE,
        timestamp: "방금 전",
      },
    ]);
    setGeneratedResult(null);
    setInterviewProgress({
      itemTarget: false,
      problem: false,
      solution: false,
      scaleUp: false,
      team: false,
      currentStep: 1,
      completedCount: 0,
    });
    setCurrentSuggestions(DEFAULT_SUGGESTIONS);
    setErrorMessage(null);
  };

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const scrollToSection = (sec: PsstSectionKey) => {
    setActiveSection(sec);
    const target = sectionRefs[sec]?.current;
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleQuickSuggestion = (suggestion: string) => {
    setChatInput(suggestion);
  };

  // 1. Send Chat Message in Interview Mode
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatSending) return;

    const userText = chatInput.trim();
    setChatInput("");

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: userText,
      timestamp: "방금 전",
    };

    const updatedMessages = [...chatMessages, newMsg];
    setChatMessages(updatedMessages);
    setIsChatSending(true);

    try {
      const res = await fetch("/api/ai/psst-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          targetProgramTitle: formData.targetProgramTitle,
          currentPlan: generatedResult || undefined,
        }),
      });

      const json = await res.json();
      if (json.success && json.reply) {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now() + 1}`,
            role: "assistant",
            content: json.reply,
            timestamp: "방금 전",
          },
        ]);

        if (json.suggestions && Array.isArray(json.suggestions)) {
          setCurrentSuggestions(json.suggestions);
        }

        if (json.progress) {
          setInterviewProgress(json.progress);
        }

        if (json.plan) {
          setGeneratedResult(json.plan);
          setFormData((prev) => ({
            ...prev,
            itemName: json.plan.overview.title || prev.itemName,
            industry: json.plan.overview.industry || prev.industry,
            itemDescription: json.plan.overview.itemSummary || prev.itemDescription,
          }));
          setActiveSection("overview");
          if (docScrollRef.current) {
            docScrollRef.current.scrollTop = 0;
          }
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
    } finally {
      setIsChatSending(false);
    }
  };

  // 2. Generate PSST from Chat Dialogue Context
  const handleGenerateFromChat = async () => {
    setErrorMessage(null);

    const userMessages = chatMessages.filter((m) => m.role === "user");
    const substantiveText = userMessages
      .map((m) => m.content)
      .join(" ")
      .replace(/작성해줘|작성|생성해줘|생성|만들어줘|만들어|써줘|완성해줘|완성|초안|시작|안녕|테스트/gi, "")
      .trim();

    if (substantiveText.length < 6) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          role: "assistant",
          content: `사업계획서를 작성하기 전에, 먼저 구상 중이신 **창업 아이템(제품/서비스)이나 핵심 아이디어**를 1~2줄로 편하게 알려주세요! 😊\n\n*(예: 스마트팜 원격 제어 앱, 친환경 생분해 포장재, 배달 라이더 전용 AI 내비 등)*\n\n아이템 내용을 말씀해 주시면, 제가 심사위원 관점에서 질문을 이어가며 완성도 높은 맞춤형 사업계획서를 작성해 드리겠습니다.`,
          timestamp: "방금 전",
        },
      ]);
      return;
    }

    setIsGenerating(true);

    const conversationSummary = chatMessages
      .map((m) => `${m.role === "user" ? "[사용자 답변]" : "[컨설턴트 질문]"}: ${m.content}`)
      .join("\n\n");

    const inputData: PsstGeneratorInput = {
      companyName: "예비창업기업",
      itemName: "대화 내용 기반 맞춤형 창업 아이템",
      industry: "대화 기반 신산업",
      targetCustomer: "대화 속 타겟 고객",
      itemDescription: `[사용자와의 1:1 심층 인터뷰 대화 전문]\n${conversationSummary}\n\n위 대화에서 사용자가 직접 언급한 실제 창업 아이템, 타겟 고객, 기술적 차별점, 문제점, 사업 모델을 100% 정확하게 추출하여 PSST 사업계획서 전문을 완성해 주세요.`,
      coreStrengths: "대화 속 핵심 기술 및 차별화 요소",
      targetProgramTitle: formData.targetProgramTitle || "2026년 초기창업패키지",
    };

    try {
      const res = await fetch("/api/ai/psst-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inputData),
      });

      const json = await res.json();
      if (json.success && json.plan) {
        setGeneratedResult(json.plan);
        setFormData((prev) => ({
          ...prev,
          itemName: json.plan.overview.title || prev.itemName,
          industry: json.plan.overview.industry || prev.industry,
          itemDescription: json.plan.overview.itemSummary || prev.itemDescription,
        }));
        setActiveSection("overview");
      } else {
        setErrorMessage(json.error || "사업계획서 생성에 실패했습니다. 다시 시도해 주세요.");
      }
    } catch (err: any) {
      setErrorMessage("AI 서버와의 통신 중 오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  // 3. Generate PSST directly from Quick Form
  const handleGenerateFromForm = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.itemName.trim() || !formData.itemDescription.trim()) {
      setErrorMessage("창업 아이템명과 사업 내용은 필수 입력 항목입니다.");
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/ai/psst-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (json.success && json.plan) {
        setGeneratedResult(json.plan);
        setActiveSection("overview");
      } else {
        setErrorMessage(json.error || "사업계획서 생성에 실패했습니다.");
      }
    } catch (err: any) {
      setErrorMessage("AI 서버와의 통신 중 오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  // 4. Modify specific section via chat input
  const handleModifySection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modificationText.trim() || !generatedResult) return;

    setIsModifying(true);
    try {
      const updatedPrompt = `${formData.itemDescription}\n[추가 수정 요청 사항 for ${activeSection}]: ${modificationText}`;
      const res = await fetch("/api/ai/psst-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          itemDescription: updatedPrompt,
        }),
      });

      const json = await res.json();
      if (json.success && json.plan) {
        setGeneratedResult(json.plan);
        setModificationText("");
      }
    } catch (err) {
      console.error("Failed to modify section:", err);
    } finally {
      setIsModifying(false);
    }
  };

  // 5. Copy Full Markdown Text
  const handleCopyFullText = () => {
    if (!generatedResult) return;
    const r = generatedResult;
    const fullText = `
# [사업계획서] ${r.overview.title}
- 명칭: ${r.overview.companyName}
- 범주: ${r.overview.industry}
- 아이템 개요: ${r.overview.itemSummary}

## ${r.problem.title}
### 배경 및 필요성
${r.problem.developmentNecessity}

### 1-1. 시장 및 고객의 문제점
${r.problem.marketPainPoint}

### 1-2. 타겟 고객의 핵심 불편사항
${r.problem.targetCustomerProblem}

## ${r.solution.title}
### 2-1. 핵심 기술 및 해결 방안
${r.solution.coreTechnologyAndFeatures}

### 2-2. 경쟁사 대비 차별화 요소
${r.solution.competitorDifferentiation}

### 2-3. 개발 및 사업화 로드맵
${r.solution.implementationPlan}

## ${r.scaleUp.title}
### 3-1. 비즈니스 모델 및 수익 구조
${r.scaleUp.businessModelAndRevenue}

### 3-2. 초기 시장 진입 및 마케팅 전략
${r.scaleUp.marketEntryAndMarketing}

### 3-3. 자금 조달 및 예산 집행 계획
${r.scaleUp.fundingAndBudgetPlan}

## ${r.team.title}
### 4-1. 대표자 및 팀원 보유 역량
${r.team.founderAndTeamCompetency}

### 4-2. 역할 분장 및 조직 구성
${r.team.rolesAndResponsibilities}

### 4-3. 외부 협력 네트워크
${r.team.collaborationNetwork}

## [심사위원 모의 평가 리포트]
- 종합 점수: ${r.evaluationReport.score}점 (${r.evaluationReport.grade})
- 총평: ${r.evaluationReport.gradeDescription}
- 핵심 강점:
${r.evaluationReport.strengths.map((s, i) => `  ${i + 1}. ${s}`).join("\n")}
- 감점 방지 보완점:
${r.evaluationReport.weaknesses.map((w, i) => `  ${i + 1}. ${w}`).join("\n")}
- 심사위원 면접 예상 Q&A:
${r.evaluationReport.expectedQuestions
  .map(
    (q, i) =>
      `  Q${i + 1}. ${q.question}\n  (의도: ${q.evaluationIntent})\n  ➔ 추천 방어: ${q.recommendedDefense}`
  )
  .join("\n\n")}
`.trim();

    navigator.clipboard.writeText(fullText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // 6. Save Plan to Backend Database
  const handleSavePlan = async () => {
    if (!generatedResult) return;
    setIsSavingPlan(true);
    setSaveSuccessMsg(null);
    try {
      const token = await getJwtToken();
      if (!token) {
        alert("사업계획서를 저장하려면 먼저 상단에서 로그인을 해주세요!");
        return;
      }

      await savePlanToBackend(
        {
          title: generatedResult.overview.title || `${formData.itemName} PSST 사업계획서`,
          targetProgramTitle: formData.targetProgramTitle,
          planJson: generatedResult,
          score: generatedResult.evaluationReport?.score,
          grade: generatedResult.evaluationReport?.grade,
        },
        token
      );

      setSaveSuccessMsg("내 보관함에 성공적으로 저장되었습니다!");
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (err: any) {
      alert("저장 실패: " + err.message);
    } finally {
      setIsSavingPlan(false);
    }
  };

  return {
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
    setGeneratedResult,
    errorMessage,
    setErrorMessage,
    isCopied,
    isDirectEditing,
    setIsDirectEditing,
    isSavingPlan,
    saveSuccessMsg,
    activeSection,
    setActiveSection,
    modificationText,
    setModificationText,
    isModifying,
    chatScrollRef,
    docScrollRef,
    sectionRefs,
    handleResetNew,
    scrollToSection,
    handleQuickSuggestion,
    handleSendChat,
    handleGenerateFromChat,
    handleGenerateFromForm,
    handleModifySection,
    handleCopyFullText,
    handleSavePlan,
  };
}
