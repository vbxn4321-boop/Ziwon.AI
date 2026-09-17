import { useState, useRef, useEffect } from "react";
import { PsstBusinessPlanResult, PsstGeneratorInput, ProgramAnalysisContext } from "@/lib/ai/psst-generator";
import {
  ChatMessage,
  CreationMode,
  CanvasTheme,
  PsstSectionKey,
  InterviewProgress,
  PsstFormData,
} from "../types";
import { DEFAULT_INITIAL_MESSAGE, DEFAULT_SUGGESTIONS, getStandardFormSchema } from "../constants";
import { savePlanToBackend, fetchMyCompany } from "@/lib/backend-client";
import { getJwtToken } from "@/lib/supabase-client";
import { convertPsstToHwpHtml, copyToHwpClipboard } from "@/lib/export/hwp-clipboard-exporter";
import type { FormSchema } from "@/lib/parser/form-schema-parser";

export function usePsstPlan(
  initialProgramTitle?: string,
  initialPlanData?: any,
  initialProgramAnalysis?: ProgramAnalysisContext,
  initialProgramId?: string
) {
  // Mode: "chat" (AI Chatbot Interview) vs "form" (Quick Form Input)
  const [creationMode, setCreationMode] = useState<CreationMode>("chat");

  // Document Canvas Theme: "dark" vs "light"
  // 문서 작성은 Notion/LINER처럼 밝은 캔버스에서 시작하고, 필요할 때만 다크로 전환한다.
  const [canvasTheme, setCanvasTheme] = useState<CanvasTheme>("light");
  const [realFormSchema, setRealFormSchema] = useState<FormSchema | null>(null);
  const [realFormDocument, setRealFormDocument] = useState<any>(null);
  // 첨부 서식 조회가 실제로 진행 중인지. 이게 없으면 "찾음/못 찾음/조회 중"을
  // 구분할 방법이 없어서, 못 찾은 확정 상태를 화면이 영원히 "불러오는 중"으로
  // 잘못 표시하는 버그가 있었다.
  const [isFormSchemaLoading, setIsFormSchemaLoading] = useState(false);
  const [importedPlanText, setImportedPlanText] = useState("");

  // Loaded Company Profile State from DB
  const [userCompany, setUserCompany] = useState<any>(null);

  // Robust helper to extract valid PsstBusinessPlanResult from any container or JSON string
  const parsePlan = (data: any): PsstBusinessPlanResult | null => {
    if (!data) return null;
    let p = data.planJson || data;
    if (typeof p === "string") {
      try {
        p = JSON.parse(p);
      } catch {
        return null;
      }
    }
    if (p && p.planJson) {
      if (typeof p.planJson === "string") {
        try {
          p = JSON.parse(p.planJson);
        } catch {}
      } else {
        p = p.planJson;
      }
    }
    return p && p.overview && p.overview.title ? p : null;
  };

  // Initial parsed plan
  const validInitialPlan = parsePlan(initialPlanData);

  const initialTargetTitle =
    initialPlanData?.targetProgramTitle ||
    initialProgramTitle ||
    "2026년 중소벤처기업부 예비창업패키지";

  const initialSchema = getStandardFormSchema(initialTargetTitle);

  // Form Data
  const [formData, setFormData] = useState<PsstFormData>({
    companyName: validInitialPlan?.overview?.companyName || "",
    itemName: validInitialPlan?.overview?.title || "",
    industry: validInitialPlan?.overview?.industry || "",
    targetCustomer: validInitialPlan?.overview?.summaryTable?.targetUsers || "",
    itemDescription: validInitialPlan?.overview?.itemSummary || "",
    coreStrengths: validInitialPlan?.solution?.competitorDifferentiation || "",
    targetProgramTitle: initialTargetTitle,
    programId: initialPlanData?.supportProgramId || initialProgramId || undefined,
    budget: validInitialPlan?.overview?.summaryTable?.targetBudget || "",
    // Attach linked program analysis context if provided
    programAnalysis: initialProgramAnalysis || undefined,
  });

  // Business Plan Result State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<PsstBusinessPlanResult | null>(
    validInitialPlan
  );

  // Load the actual attached HWPX form once so the editor reflects this notice,
  // instead of showing only the generic PSST template.
  useEffect(() => {
    if (!initialProgramId) return;
    let cancelled = false;
    setIsFormSchemaLoading(true);
    fetch(`/api/ai/psst-schema?programId=${encodeURIComponent(initialProgramId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && json?.success) {
          setRealFormSchema(json.schema || null);
          setRealFormDocument(json.formDocument || null);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setIsFormSchemaLoading(false);
      });
    return () => { cancelled = true; };
  }, [initialProgramId]);

  // 실제 공고 서식이 로드되면 진행 순서도 표준 템플릿에서 교체한다.
  useEffect(() => {
    if (!realFormSchema?.fields?.length) return;
    setInterviewProgress((prev) => {
      const completed = new Set((prev.fieldProgress || []).filter((field) => field.completed).map((field) => field.id));
      const fieldProgress = realFormSchema.fields.map((field) => ({
        id: field.id,
        label: field.label,
        guidance: field.guidance,
        type: field.type,
        sectionTitle: field.sectionTitle,
        completed: completed.has(field.id),
      }));
      const current = fieldProgress.find((field) => !field.completed) || fieldProgress[0];
      return {
        ...prev,
        totalFields: fieldProgress.length,
        completedCount: fieldProgress.filter((field) => field.completed).length,
        currentFieldId: current?.id,
        currentFieldLabel: current?.label,
        currentFieldGuidance: current?.guidance,
        fieldProgress,
      };
    });
  }, [realFormSchema]);

  // Interactive Suggestion Pills and Checklist Progress
  const [currentSuggestions, setCurrentSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);
  
  const initialFieldProgress = initialSchema.fields.map((f, idx) => ({
    id: f.id,
    label: f.label,
    guidance: f.guidance,
    type: f.type,
    sectionTitle: f.sectionTitle,
    completed: !!validInitialPlan,
  }));

  const [interviewProgress, setInterviewProgress] = useState<InterviewProgress>({
    itemTarget: !!validInitialPlan,
    problem: !!validInitialPlan,
    solution: !!validInitialPlan,
    scaleUp: !!validInitialPlan,
    team: !!validInitialPlan,
    currentStep: validInitialPlan ? 5 : 1,
    completedCount: validInitialPlan ? initialSchema.fields.length : 0,
    totalFields: initialSchema.fields.length,
    currentFieldId: initialSchema.fields[0]?.id || "f1",
    currentFieldLabel: initialSchema.fields[0]?.label || "1. 창업아이템 개요",
    currentFieldGuidance: initialSchema.fields[0]?.guidance || "",
    fieldProgress: initialFieldProgress,
  });

  // Synchronize when initialPlanData or initialProgramTitle changes
  useEffect(() => {
    if (initialPlanData) {
      const plan = parsePlan(initialPlanData);
      if (plan) {
        const schema = getStandardFormSchema(initialPlanData.targetProgramTitle || initialProgramTitle);
        setGeneratedResult(plan);
        setFormData((prev) => ({
          ...prev,
          companyName: plan.overview?.companyName || prev.companyName,
          itemName: plan.overview?.title || prev.itemName,
          industry: plan.overview?.industry || prev.industry,
          targetCustomer: plan.overview?.summaryTable?.targetUsers || prev.targetCustomer,
          itemDescription: plan.overview?.itemSummary || prev.itemDescription,
          coreStrengths: plan.solution?.competitorDifferentiation || prev.coreStrengths,
          targetProgramTitle:
            initialPlanData.targetProgramTitle ||
            initialProgramTitle ||
            prev.targetProgramTitle,
          budget: plan.overview?.summaryTable?.targetBudget || prev.budget,
        }));
        setInterviewProgress({
          itemTarget: true,
          problem: true,
          solution: true,
          scaleUp: true,
          team: true,
          currentStep: 5,
          completedCount: schema.fields.length,
          totalFields: schema.fields.length,
          fieldProgress: schema.fields.map((f) => ({
            id: f.id,
            label: f.label,
            guidance: f.guidance,
            type: f.type,
            sectionTitle: f.sectionTitle,
            completed: true,
          })),
        });
      }
    }
  }, [initialPlanData, initialProgramTitle]);

  // Synchronize when initialProgramAnalysis changes
  useEffect(() => {
    if (initialProgramAnalysis) {
      setFormData((prev) => ({ ...prev, programAnalysis: initialProgramAnalysis }));
    }
  }, [initialProgramAnalysis]);

  // Auto-fetch user company profile on mount and pre-fill form if empty
  useEffect(() => {
    const loadCompanyAndPrefill = async () => {
      if (validInitialPlan) return; // If restoring existing plan, don't overwrite
      try {
        const token = await getJwtToken();
        if (!token) return;
        const comp = await fetchMyCompany(token);
        if (comp && comp.name) {
          setUserCompany(comp);
          const activeSchema = getStandardFormSchema(formData.targetProgramTitle);
          setFormData((prev) => ({
            ...prev,
            companyName: prev.companyName || comp.name || "",
            industry: prev.industry || comp.industry || "",
            itemDescription: prev.itemDescription || comp.coreItemSummary || "",
            itemName:
              prev.itemName ||
              (comp.coreItemSummary
                ? comp.coreItemSummary.slice(0, 35).replace(/[\n\r]+/g, " ")
                : `${comp.name} 혁신 사업 아이템`),
            coreStrengths:
              prev.coreStrengths ||
              [
                comp.hasPatents ? "특허/지식재산권(IP) 보유" : "",
                comp.hasCertifications ? "벤처기업/이노비즈 인증 보유" : "",
                comp.isExporting ? "수출 실적 보유" : "",
                comp.region ? `${comp.region} 소재` : "",
              ]
                .filter(Boolean)
                .join(", "),
            targetProgramTitle: initialProgramTitle || prev.targetProgramTitle,
          }));

          // FACT 필드 자동완성 반영
          setInterviewProgress((prev) => {
            const updatedFields = (prev.fieldProgress || activeSchema.fields).map((f) => ({
              ...f,
              completed: f.type === "FACT" ? true : ("completed" in f ? Boolean(f.completed) : false),
            }));
            const completedCount = updatedFields.filter((f) => f.completed).length;
            const currentField = updatedFields.find((f) => !f.completed) || updatedFields[0];
            return {
              ...prev,
              completedCount,
              totalFields: activeSchema.fields.length,
              currentFieldId: currentField?.id,
              currentFieldLabel: currentField?.label,
              currentFieldGuidance: currentField?.guidance,
              fieldProgress: updatedFields,
              itemTarget: true,
            };
          });
        }
      } catch (err) {
        console.warn("Failed to prefill company profile for PSST:", err);
      }
    };

    loadCompanyAndPrefill();
  }, [initialProgramTitle, validInitialPlan]);

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
    const defaultTitle = initialProgramTitle || "2026년 중소벤처기업부 예비창업패키지";
    const schema = getStandardFormSchema(defaultTitle);
    const hasCompany = Boolean(userCompany && userCompany.name);
    const fieldProgress = schema.fields.map((f) => ({
      id: f.id,
      label: f.label,
      guidance: f.guidance,
      type: f.type,
      sectionTitle: f.sectionTitle,
      completed: f.type === "FACT" && hasCompany,
    }));
    const completedCount = fieldProgress.filter((f) => f.completed).length;
    const currentField = fieldProgress.find((f) => !f.completed) || fieldProgress[0];

    setFormData({
      companyName: userCompany?.name || "",
      itemName: "",
      industry: userCompany?.industry || "",
      targetCustomer: "",
      itemDescription: "",
      coreStrengths: "",
      targetProgramTitle: defaultTitle,
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
      itemTarget: hasCompany,
      problem: false,
      solution: false,
      scaleUp: false,
      team: false,
      currentStep: hasCompany ? 2 : 1,
      completedCount,
      totalFields: schema.fields.length,
      currentFieldId: currentField?.id || "f1",
      currentFieldLabel: currentField?.label || "1. 창업아이템 개요",
      currentFieldGuidance: currentField?.guidance || "",
      fieldProgress,
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

    // 공고에 실제 서식이 있으면 그 항목과 지침을 우선 사용한다.
    // 파싱 결과가 없을 때만 기존 표준 PSST 질문으로 폴백한다.
    const activeSchema = realFormSchema || getStandardFormSchema(formData.targetProgramTitle);

    try {
      // 공고 맞춤 인터뷰는 서버가 분석 이용권을 확인하므로 토큰을 실어 보낸다
      const chatToken = await getJwtToken();
      const res = await fetch("/api/ai/psst-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(chatToken ? { Authorization: `Bearer ${chatToken}` } : {}),
        },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          programId: formData.programId || undefined,
          targetProgramTitle: formData.targetProgramTitle,
          currentPlan: generatedResult || undefined,
          companyProfile: userCompany || undefined,
          formSchema: activeSchema,
          existingPlanText: importedPlanText || undefined,
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
          setInterviewProgress((prev) => ({
            ...prev,
            ...json.progress,
          }));
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
      } else {
        // 실패 응답을 그냥 삼키면 화면에서는 아무 일도 안 일어난 것처럼 보인다.
        // 분석 이용권이 없어 거절된 경우(403)가 여기로 온다.
        setChatMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now() + 1}`,
            role: "assistant",
            content:
              json?.error ||
              "답변을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.",
            timestamp: "방금 전",
          },
        ]);
      }
    } catch (err) {
      console.error("Chat error:", err);
      setChatMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now() + 1}`,
          role: "assistant",
          content: "AI 서버와 통신하지 못했습니다. 잠시 후 다시 시도해 주세요.",
          timestamp: "방금 전",
        },
      ]);
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
      companyName: formData.companyName.trim() || userCompany?.name || "예비창업기업",
      itemName: formData.itemName.trim() || "대화 내용 기반 맞춤형 창업 아이템",
      industry: formData.industry.trim() || userCompany?.industry || "대화 기반 신산업",
      targetCustomer: (formData.targetCustomer || "").trim() || "대화 속 타겟 고객",
      itemDescription: `[사용자와의 1:1 심층 서식 인터뷰 대화 전문]\n${conversationSummary}\n\n위 대화에서 사용자가 직접 언급한 실제 창업 아이템, 타겟 고객, 기술적 차별점, 문제점, 사업 모델을 100% 정확하게 추출하여 PSST 사업계획서 전문을 완성해 주세요.`,
      coreStrengths: (formData.coreStrengths || "").trim() || "대화 속 핵심 기술 및 차별화 요소",
      targetProgramTitle: formData.targetProgramTitle || "2026년 초기창업패키지",
      programAnalysis: formData.programAnalysis,
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
    if (!formData.itemName.trim()) {
      setErrorMessage("창업 아이템명을 입력해 주세요.");
      return;
    }
    if (!formData.itemDescription.trim()) {
      setErrorMessage("사업 내용 & 개발 필요성을 간단히 작성해 주세요.");
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    const payload: PsstFormData = {
      ...formData,
      companyName: formData.companyName.trim() || userCompany?.name || "예비창업자",
      industry: formData.industry.trim() || "ICT / 신산업 융합",
    };

    try {
      const res = await fetch("/api/ai/psst-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success && json.plan) {
        setGeneratedResult(json.plan);
        setActiveSection("overview");
        if (docScrollRef.current) {
          docScrollRef.current.scrollTop = 0;
        }
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

  // 5. Copy Full HWP Text & HTML
  const handleCopyFullText = async () => {
    if (!generatedResult) return;
    try {
      const hwpHtml = convertPsstToHwpHtml(generatedResult, initialProgramTitle);
      const success = await copyToHwpClipboard(hwpHtml);
      if (success) {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2500);
      }
    } catch (err) {
      console.error("Failed to copy full HWP text:", err);
    }
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
  // 7. Download as PDF via browser print dialog
  const handleDownloadPdf = () => {
    if (!generatedResult) return;
    const planTitle = generatedResult.overview?.title || formData.itemName || "PSST_사업계획서";
    const prevTitle = document.title;
    document.title = `${planTitle} - Ziwon.AI`;
    window.print();
    setTimeout(() => {
      document.title = prevTitle;
    }, 1000);
  };

  // Force re-prefill from user company profile
  const handlePrefillFromCompany = (compOverride?: any) => {
    const comp = compOverride || userCompany;
    if (!comp) return;
    setFormData((prev) => ({
      ...prev,
      companyName: comp.name || prev.companyName,
      industry: comp.industry || prev.industry,
      itemDescription: comp.coreItemSummary || prev.itemDescription,
      itemName:
        comp.coreItemSummary
          ? comp.coreItemSummary.slice(0, 35).replace(/[\n\r]+/g, " ")
          : prev.itemName || `${comp.name} 혁신 사업 아이템`,
      coreStrengths: [
        comp.hasPatents ? "특허/IP 보유" : "",
        comp.hasCertifications ? "벤처기업 인증 보유" : "",
        comp.isExporting ? "수출 실적 보유" : "",
        comp.region ? `${comp.region} 소재` : "",
      ]
        .filter(Boolean)
        .join(", "),
    }));
  };

  return {
    userCompany,
    handlePrefillFromCompany,
    creationMode,
    setCreationMode,
    canvasTheme,
    setCanvasTheme,
    realFormSchema,
    realFormDocument,
    isFormSchemaLoading,
    importedPlanText,
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
    handleDownloadPdf,
    handleLoadPlan: (planData: any) => {
      const plan = parsePlan(planData);
      if (plan) {
        setGeneratedResult(plan);
        setFormData((prev) => ({
          ...prev,
          companyName: plan.overview?.companyName || prev.companyName,
          itemName: plan.overview?.title || prev.itemName,
          industry: plan.overview?.industry || prev.industry,
          targetCustomer: plan.overview?.summaryTable?.targetUsers || prev.targetCustomer,
          itemDescription: plan.overview?.itemSummary || prev.itemDescription,
          coreStrengths: plan.solution?.competitorDifferentiation || prev.coreStrengths,
          targetProgramTitle:
            planData.targetProgramTitle || prev.targetProgramTitle,
          budget: plan.overview?.summaryTable?.targetBudget || prev.budget,
        }));
        setInterviewProgress({
          itemTarget: true,
          problem: true,
          solution: true,
          scaleUp: true,
          team: true,
          currentStep: 5,
          completedCount: 5,
        });
      }
    },
  };
}
