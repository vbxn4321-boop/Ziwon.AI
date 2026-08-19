"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Award,
  Copy,
  Check,
  Download,
  RefreshCw,
  Edit3,
  Flame,
  ArrowRight,
  TrendingUp,
  Users,
  Target,
  ShieldCheck,
  Lightbulb,
  FileText,
  Send,
  Plus,
  Home,
  MessageSquare,
  Zap,
  RotateCcw,
  BookOpen,
  HelpCircle,
  Menu,
  Moon,
  Sun,
  Bot,
  User,
  SlidersHorizontal,
} from "lucide-react";
import { PsstBusinessPlanResult, PsstGeneratorInput } from "@/lib/ai/psst-generator";

interface PsstPlanGeneratorProps {
  initialProgramTitle?: string;
  onBackToNotices?: () => void;
}

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  timestamp: string;
}

export const TARGET_PROGRAM_FORMATS = [
  {
    id: "pre-startup",
    name: "2026년 중소벤처기업부 예비창업패키지",
    badge: "중기부 표준",
    description: "예비창업자 특화 (MVP 검증, 비즈니스 모델, 시제품 제작 계획 중심)",
  },
  {
    id: "early-startup",
    name: "2026년 중소벤처기업부 초기창업패키지",
    badge: "중기부 표준",
    description: "3년 이내 기업 특화 (시장 진입, 매출 성장 전략, 투자 유치 중심)",
  },
  {
    id: "youth-academy",
    name: "2026년 청년창업사관학교 (청창사)",
    badge: "중진공 표준",
    description: "혁신 기술 창업 (양산 체계, 시제품 고도화, 사업화 로드맵 중심)",
  },
  {
    id: "r-and-d",
    name: "2026년 디딤돌 R&D 창업성장기술개발사업",
    badge: "중기부 R&D",
    description: "정부 R&D 연구개발계획서 (핵심 기술 사양, 정량적 목표, 특허 전략)",
  },
  {
    id: "scaleup-leap",
    name: "2026년 창업도약패키지 (스케일업)",
    badge: "창진원 표준",
    description: "3~7년차 도약 기업 (해외 수출, 글로벌 진출, 후속 투자 중심)",
  },
  {
    id: "local-business",
    name: "2026년 신사업창업사관학교 (소상공인)",
    badge: "소진공 표준",
    description: "로컬 크리에이터 / 소상공인 혁신 BM 중심",
  },
  {
    id: "kibo-shinbo",
    name: "2026년 기술보증기금/신용보증기금 정책자금",
    badge: "정책금융",
    description: "기술 사업성 평가, 재무 추정 및 자금 상환 계획 중심",
  },
];

export const PsstPlanGenerator: React.FC<PsstPlanGeneratorProps> = ({
  initialProgramTitle,
  onBackToNotices,
}) => {
  // Mode: "chat" (AI Chatbot Interview) vs "form" (Quick Form Input)
  const [creationMode, setCreationMode] = useState<"chat" | "form">("chat");

  // Document Canvas Theme: "dark" (Eye-comfort dark) vs "light" (A4 paper light)
  const [canvasTheme, setCanvasTheme] = useState<"dark" | "light">("dark");

  // Form Data (Starts empty with transparent ex) placeholders)
  const [formData, setFormData] = useState<PsstGeneratorInput & { budget?: string }>({
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
      content:
        "안녕하세요! Ziwon.AI 사업계획서 전문 컨설턴트입니다. 😊\n\n구상 중이신 **창업 아이템명**과 **어떤 서비스/제품인지 핵심 아이디어**를 편하게 한 줄로 말씀해 주시면, 제가 심층 인터뷰를 통해 대한민국 표준 PSST 사업계획서를 완성해 드릴게요!",
      timestamp: "방금 전",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatSending, setIsChatSending] = useState(false);

  // Business Plan Result State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<PsstBusinessPlanResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isDirectEditing, setIsDirectEditing] = useState(false);

  // Active section for jump & chat edit pill
  const [activeSection, setActiveSection] = useState<
    "overview" | "problem" | "solution" | "scaleUp" | "team" | "evaluation"
  >("overview");

  // Bottom modification text
  const [modificationText, setModificationText] = useState("");
  const [isModifying, setIsModifying] = useState(false);

  // Scroll Refs
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const docScrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = {
    overview: useRef<HTMLDivElement>(null),
    problem: useRef<HTMLDivElement>(null),
    solution: useRef<HTMLDivElement>(null),
    scaleUp: useRef<HTMLDivElement>(null),
    team: useRef<HTMLDivElement>(null),
    evaluation: useRef<HTMLDivElement>(null),
  };

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const scrollToSection = (sec: "overview" | "problem" | "solution" | "scaleUp" | "team" | "evaluation") => {
    setActiveSection(sec);
    const target = sectionRefs[sec]?.current;
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
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

    // Collect entire dialogue
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

  const handleResetNew = () => {
    setGeneratedResult(null);
    setIsDirectEditing(false);
    setModificationText("");
    setChatMessages([
      {
        id: "msg-1",
        role: "assistant",
        content:
          "새로운 사업계획서 작성을 시작합니다! 😊\n\n구상 중이신 **새로운 창업 아이템명**과 **핵심 아이디어**를 편하게 말씀해 주세요.",
        timestamp: "방금 전",
      },
    ]);
  };

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
        .map((q, i) => `  Q${i + 1}. ${q.question}\n  (의도: ${q.evaluationIntent})\n  ➔ 추천 방어: ${q.recommendedDefense}`)
        .join("\n\n")}
`.trim();

    navigator.clipboard.writeText(fullText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const SECTION_LABELS: Record<string, string> = {
    overview: "창업아이템 개요(요약)",
    problem: "1. 문제인식 (Problem)",
    solution: "2. 실현가능성 (Solution)",
    scaleUp: "3. 성장전략 (Scale-up)",
    team: "4. 팀구성 (Team)",
    evaluation: "5. 심사역 평가 리포트",
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-slate-950 text-slate-100 font-sans select-text overflow-hidden">
      {/* ══════════════════════════════════════════════════════════════════════
          1. LEFTOVER THIN ICON SIDEBAR (Eye-Comfort Slate Theme)
         ══════════════════════════════════════════════════════════════════════ */}
      <aside className="w-16 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-3.5 justify-between flex-shrink-0 z-30 shadow-lg">
        {/* Top Icons */}
        <div className="flex flex-col items-center space-y-5 w-full">
          {/* Logo */}
          <div
            onClick={() => onBackToNotices && onBackToNotices()}
            className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-blue-500/20 cursor-pointer"
            title="공고 탐색으로 이동"
          >
            <Sparkles className="w-5 h-5 text-white" />
          </div>

          {/* Plus Button */}
          <button
            onClick={handleResetNew}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors border border-slate-700"
            title="새 사업계획서 작성"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Menu Items */}
          <nav className="flex flex-col items-center space-y-3.5 w-full text-[10px] text-slate-400 font-medium">
            <button
              onClick={() => onBackToNotices && onBackToNotices()}
              className="flex flex-col items-center space-y-1 hover:text-blue-400 transition-colors w-full py-1"
              title="지원사업 공고 탐색 포털로 복귀"
            >
              <Home className="w-4 h-4 text-slate-400 hover:text-blue-400" />
              <span>공고탐색</span>
            </button>

            <button
              className="flex flex-col items-center space-y-1 text-blue-400 font-bold bg-blue-500/10 w-full py-1.5 border-r-2 border-blue-500"
              title="PSST 사업계획서"
            >
              <FileText className="w-4 h-4 text-blue-400" />
              <span>사업계획서</span>
            </button>

            <button
              onClick={() => scrollToSection("evaluation")}
              className="flex flex-col items-center space-y-1 hover:text-amber-400 transition-colors w-full py-1"
              title="심사역 모의 평가"
            >
              <Award className="w-4 h-4 text-slate-400 hover:text-amber-400" />
              <span>평가리포트</span>
            </button>
          </nav>
        </div>

        {/* Bottom Credits Badge */}
        <div className="flex flex-col items-center space-y-1 text-center">
          <div className="flex items-center space-x-0.5 text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20">
            <Zap className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
            <span>1,000,000</span>
          </div>
          <span className="text-[9px] text-slate-500 font-semibold">P</span>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════════════════
          2. MAIN WORKSPACE CONTAINER (Top Bar + 2 Panels + Bottom Status Bar)
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* ── TOP APP BAR ── */}
        <header className="h-14 bg-slate-900/90 border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between flex-shrink-0 z-20 backdrop-blur-md">
          {/* Left: Mode Switcher & Title */}
          <div className="flex items-center space-x-3 overflow-hidden">
            <button
              onClick={() => onBackToNotices && onBackToNotices()}
              className="text-slate-400 hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-slate-800"
              title="공고 탐색으로 돌아가기"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Creation Mode Toggle */}
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex space-x-1 text-xs">
              <button
                onClick={() => setCreationMode("chat")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center space-x-1.5 ${
                  creationMode === "chat"
                    ? "bg-indigo-600 text-white shadow-md font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>💬 AI 챗봇 인터뷰 모드</span>
              </button>
              <button
                onClick={() => setCreationMode("form")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center space-x-1.5 ${
                  creationMode === "form"
                    ? "bg-blue-600 text-white shadow-md font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>⚡ 퀵 폼 정보 입력 모드</span>
              </button>
            </div>
          </div>

          {/* Right: Actions & Theme Toggle */}
          <div className="flex items-center space-x-2">
            {/* Canvas Dark/Light Toggle */}
            <button
              onClick={() => setCanvasTheme((prev) => (prev === "dark" ? "light" : "dark"))}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-colors flex items-center space-x-1"
              title="문서 시트 다크/라이트 테마 전환"
            >
              {canvasTheme === "dark" ? (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-[11px]">다크 뷰</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px]">페이퍼 뷰</span>
                </>
              )}
            </button>

            {generatedResult && (
              <button
                onClick={handleCopyFullText}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center space-x-1.5"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>복사 완료!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>전문 복사</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={handleResetNew}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="새 사업계획서 작성"
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Exit/Close Button */}
            <button
              onClick={() => onBackToNotices && onBackToNotices()}
              className="px-3 py-1.5 rounded-xl bg-rose-950/50 hover:bg-rose-900/70 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer shadow-sm hover:text-white"
              title="사업계획서 화면을 닫고 공고 탐색 홈으로 이동"
            >
              <span>✕ 닫기</span>
            </button>
          </div>
        </header>

        {/* ── 2-PANEL WORKSPACE (Left: Mode View, Right: Document Paper Canvas) ── */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* ════════════════════════════════════════════════════════════════════
              LEFT PANEL (5 Cols): CHAT INTERVIEW or QUICK FORM MODE
             ════════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-5 border-r border-slate-800/80 bg-slate-950 flex flex-col h-full overflow-hidden">
            {/* ── [MODE 1] AI CHATBOT INTERVIEW MODE ── */}
            {creationMode === "chat" ? (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Chat Header Sub-Banner */}
                <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between flex-shrink-0 shadow-sm">
                  {/* Target Format Selector - Takes full remaining width so titles are never truncated */}
                  <div className="flex-1 min-w-0 flex items-center space-x-2 bg-slate-950 px-3 py-2 rounded-xl border border-amber-500/30">
                    <span className="text-[11px] text-amber-400 font-bold flex-shrink-0 flex items-center space-x-1">
                      <Target className="w-3.5 h-3.5 text-amber-400" />
                      <span>목표 서식:</span>
                    </span>
                    <select
                      value={formData.targetProgramTitle}
                      onChange={(e) => setFormData({ ...formData, targetProgramTitle: e.target.value })}
                      className="w-full bg-transparent text-slate-100 text-xs font-bold focus:outline-none cursor-pointer pr-1"
                      title="AI 챗봇이 인터뷰할 기준이 되는 정부 공인 표준 서식"
                    >
                      {TARGET_PROGRAM_FORMATS.map((fmt) => (
                        <option key={fmt.id} value={fmt.name} className="bg-slate-900 text-slate-200 py-1">
                          [{fmt.badge}] {fmt.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleGenerateFromChat}
                    disabled={isGenerating}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center space-x-1.5 disabled:opacity-50 flex-shrink-0"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
                    <span>{isGenerating ? "문서 생성 중..." : "대화 기반 PSST 생성"}</span>
                  </button>
                </div>

                {/* PSST 4-Step Interactive Interview Progress Bar */}
                <div className="px-3 py-2 bg-slate-950/90 border-b border-slate-800/80 flex items-center justify-between text-[10px] overflow-x-auto gap-1">
                  {[
                    { step: 1, label: "1. 아이템/타겟", active: chatMessages.filter(m => m.role === "user").length <= 1 },
                    { step: 2, label: "2. 문제인식 (P)", active: chatMessages.filter(m => m.role === "user").length === 2 },
                    { step: 3, label: "3. 실현기술 (S)", active: chatMessages.filter(m => m.role === "user").length === 3 },
                    { step: 4, label: "4. BM/팀역량 (S·T)", active: chatMessages.filter(m => m.role === "user").length >= 4 },
                  ].map((s) => (
                    <div
                      key={s.step}
                      className={`px-2 py-0.5 rounded-md font-bold transition-colors whitespace-nowrap flex items-center space-x-1 ${
                        s.active
                          ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/40"
                          : "bg-slate-900 text-slate-500 border border-slate-800"
                      }`}
                    >
                      <span>{s.label}</span>
                    </div>
                  ))}
                </div>

                {/* Scrollable Chat Area */}
                <div
                  ref={chatScrollRef}
                  className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 text-xs"
                >
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex items-start space-x-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"
                        }`}
                    >
                      {msg.role === "assistant" && (
                        <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-md">
                          Z
                        </div>
                      )}

                      <div
                        className={`space-y-1 max-w-[85%] ${msg.role === "user" ? "text-right" : "text-left"
                          }`}
                      >
                        <span className="text-[10px] text-slate-500 font-semibold block">
                          {msg.role === "assistant" ? "Ziwon AI 컨설턴트" : "창업자"}
                        </span>
                        <div
                          className={`p-3.5 rounded-2xl leading-relaxed whitespace-pre-line text-xs ${msg.role === "user"
                              ? "bg-indigo-600 text-white rounded-tr-none shadow-md"
                              : "bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none shadow-sm"
                            }`}
                        >
                          {msg.content}
                        </div>
                      </div>

                      {msg.role === "user" && (
                        <div className="w-7 h-7 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs flex-shrink-0">
                          <User className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  ))}

                  {generatedResult && (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/60 via-indigo-950/60 to-purple-950/60 border border-indigo-500/40 space-y-2.5 shadow-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-indigo-300 font-bold text-xs">
                          <Sparkles className="w-4 h-4 text-indigo-400" />
                          <span>PSST 사업계획서 우측 렌더링 완료!</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                          {generatedResult.evaluationReport.score}점 ({generatedResult.evaluationReport.grade})
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        우측 문서 시트에 사업계획서 전문과 심사역 평가 리포트가 렌더링되었습니다.
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {["overview", "problem", "solution", "scaleUp", "team", "evaluation"].map((sec) => (
                          <button
                            key={sec}
                            type="button"
                            onClick={() => scrollToSection(sec as any)}
                            className="px-2 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-[10px] text-slate-300 border border-slate-700 hover:border-indigo-400 transition-colors"
                          >
                            {SECTION_LABELS[sec]?.split(" ")[0]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {isChatSending && (
                    <div className="flex items-center space-x-2 text-indigo-400 text-xs pl-9">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>컨설턴트가 답변을 분석하고 있습니다...</span>
                    </div>
                  )}
                </div>

                {/* Quick Action Suggestion Chips */}
                {!generatedResult && (
                  <div className="px-3 py-2 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between overflow-x-auto gap-2">
                    <span className="text-[10px] text-slate-400 font-medium flex items-center space-x-1 flex-shrink-0">
                      <Flame className="w-3 h-3 text-amber-400" />
                      <span>{chatMessages.length <= 3 ? "예시 아이템:" : "추천 액션:"}</span>
                    </span>
                    {chatMessages.length <= 3 ? (
                      <div className="flex items-center space-x-1.5 overflow-x-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setChatInput("IoT 센서 및 Vision AI 기반 스마트팜 원격 생육 관리 솔루션 구상 중입니다.");
                          }}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] whitespace-nowrap transition-colors border border-slate-700"
                        >
                          🌱 스마트팜 AI 솔루션
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setChatInput("버섯 균사체를 활용한 100% 생분해성 친환경 완충 포장재를 개발 중입니다.");
                          }}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] whitespace-nowrap transition-colors border border-slate-700"
                        >
                          📦 친환경 생분해 포장재
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setChatInput("지금까지 나눈 대화 내용을 바탕으로 PSST 사업계획서를 작성해줘");
                        }}
                        className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold transition-colors flex items-center space-x-1 whitespace-nowrap"
                      >
                        <Sparkles className="w-3 h-3 text-indigo-400" />
                        <span>&quot;사업계획서 작성해줘&quot; 전송</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Chat Input Bar */}
                <form
                  onSubmit={handleSendChat}
                  className="p-3 bg-slate-900 border-t border-slate-800 flex items-center space-x-2 flex-shrink-0"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="답변이나 질문을 입력해 주세요... (엔터로 전송)"
                    disabled={isChatSending || isGenerating}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || isChatSending || isGenerating}
                    className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-40 shadow-md shadow-indigo-600/30"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            ) : (
              /* ── [MODE 2] QUICK FORM INPUT MODE ── */
              <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3.5 shadow-md">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-slate-200 flex items-center space-x-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
                      <span>초고속 폼 정보 입력</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      * 칸을 비워두시면 입력창 내 <span className="text-slate-300">ex) 예시</span>를 참고하여 작성할 수 있습니다.
                    </span>
                  </div>

                  {/* Form Inputs with Transparent ex) Placeholders */}
                  <div className="space-y-3 text-[11px]">
                    {/* Official Standard Target Format Selector */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300 font-bold flex items-center space-x-1">
                          <Target className="w-3.5 h-3.5 text-amber-400" />
                          <span>🏛️ 목표 지원사업 공인 서식 선택</span>
                        </span>
                        <span className="text-[10px] text-amber-400 font-semibold">중기부·창진원 공인</span>
                      </div>
                      <select
                        value={formData.targetProgramTitle}
                        onChange={(e) => setFormData({ ...formData, targetProgramTitle: e.target.value })}
                        className="w-full bg-slate-950 border border-amber-500/30 rounded-xl px-3 py-2.5 text-slate-100 text-xs font-bold focus:outline-none focus:border-amber-500 transition-colors cursor-pointer"
                      >
                        {TARGET_PROGRAM_FORMATS.map((fmt) => (
                          <option key={fmt.id} value={fmt.name} className="bg-slate-900 text-slate-200 py-1">
                            [{fmt.badge}] {fmt.name}
                          </option>
                        ))}
                      </select>
                      {TARGET_PROGRAM_FORMATS.find((f) => f.name === formData.targetProgramTitle)?.description && (
                        <p className="text-[10.5px] text-amber-300/80 pl-1 pt-0.5 font-medium">
                          💡 {TARGET_PROGRAM_FORMATS.find((f) => f.name === formData.targetProgramTitle)?.description}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <span className="text-slate-400 font-medium">👤 대표자 / 기업명</span>
                      <input
                        type="text"
                        value={formData.companyName}
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                        placeholder="ex) (주)지윈에이아이 또는 홍길동 대표 (예비창업자)"
                        disabled={isGenerating}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-slate-400 font-medium">💡 창업 아이템명</span>
                      <input
                        type="text"
                        value={formData.itemName}
                        onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                        placeholder="ex) Vision AI 기반 노지·시설원예 병해충 조기 감지 및 지능형 환경제어 솔루션"
                        disabled={isGenerating}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-bold placeholder:text-slate-600 focus:outline-none focus:border-blue-500 text-blue-300 transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <span className="text-slate-400 font-medium">산업 분야</span>
                        <input
                          type="text"
                          value={formData.industry}
                          onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                          placeholder="ex) 스마트농업 / AgTech / AI"
                          disabled={isGenerating}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-400 font-medium">사업 예산 규모</span>
                        <input
                          type="text"
                          value={formData.budget || ""}
                          onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                          placeholder="ex) 약 50,000,000원 (정부지원 70% + 자부담 30%)"
                          disabled={isGenerating}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-slate-400 font-medium">🎯 주요 타겟 고객</span>
                      <input
                        type="text"
                        value={formData.targetCustomer || ""}
                        onChange={(e) => setFormData({ ...formData, targetCustomer: e.target.value })}
                        placeholder="ex) 3,000평 이상 고소득 시설원예 농가 및 스마트팜 도입 희망 청년농"
                        disabled={isGenerating}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-slate-400 font-medium">📝 사업 내용 & 개발 필요성</span>
                      <textarea
                        rows={4}
                        value={formData.itemDescription}
                        onChange={(e) => setFormData({ ...formData, itemDescription: e.target.value })}
                        placeholder="ex) 기존 외산 스마트팜 장비는 수천만 원의 고가로 진입장벽이 높고 조작이 복잡합니다. 본 아이템은 저비용 IoT 센서와 카메라 영상 분석을 결합하여, 모바일 앱으로 작물 생육 상태를 실시간 진단하고 최적의 환기·급수를 자동 제어하는 농가 맞춤형 솔루션입니다."
                        disabled={isGenerating}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 leading-relaxed text-[11px] transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-slate-400 font-medium">🚀 핵심 기술 및 차별화 강점</span>
                      <input
                        type="text"
                        value={formData.coreStrengths}
                        onChange={(e) => setFormData({ ...formData, coreStrengths: e.target.value })}
                        placeholder="ex) 95% 정확도의 농작물 질병 경량 딥러닝 모델, LoRa 기반 5km 장거리 저전력 통신, 기존 외산 대비 도입 단가 70% 절감"
                        disabled={isGenerating}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-[11px] flex items-center space-x-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <button
                    onClick={() => handleGenerateFromForm()}
                    disabled={isGenerating}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
                    <span>{isGenerating ? "AI가 PSST 문서를 작성 중입니다..." : "초고속 PSST 사업계획서 생성하기"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ════════════════════════════════════════════════════════════════════
              RIGHT PANEL (7 Cols): SLEEK EYE-COMFORT DOCUMENT PAPER CANVAS
             ════════════════════════════════════════════════════════════════════ */}
          <div
            className={`lg:col-span-7 flex flex-col h-full overflow-hidden relative transition-colors ${canvasTheme === "dark" ? "bg-slate-950 text-slate-100" : "bg-[#f1f5f9] text-slate-800"
              }`}
          >
            {/* Sheet Sub-Header */}
            <div
              className={`h-12 px-6 flex items-center justify-between flex-shrink-0 border-b ${canvasTheme === "dark"
                  ? "bg-slate-900/90 border-slate-800 text-slate-200"
                  : "bg-white border-slate-200 text-slate-800"
                }`}
            >
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 font-bold text-xs border border-blue-500/20">
                  {SECTION_LABELS[activeSection] || "창업아이템 개요(요약)"}
                </span>
                {generatedResult && (
                  <span className="text-[11px] text-slate-400 font-medium">
                    (점수: {generatedResult.evaluationReport.score}점 · {generatedResult.evaluationReport.grade})
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsDirectEditing((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 border ${isDirectEditing
                      ? "bg-emerald-600 text-white border-emerald-500 shadow-md"
                      : canvasTheme === "dark"
                        ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                    }`}
                >
                  <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isDirectEditing ? "💾 편집 완료" : "✏️ 직접편집"}</span>
                </button>
              </div>
            </div>

            {/* Document Paper Body Container */}
            <div ref={docScrollRef} className="flex-1 p-4 sm:p-8 overflow-y-auto space-y-6">
              {generatedResult ? (
                <div
                  className={`max-w-3xl mx-auto rounded-3xl p-8 sm:p-10 shadow-2xl space-y-8 transition-colors ${canvasTheme === "dark"
                      ? "bg-slate-900/90 border border-slate-800 text-slate-200"
                      : "bg-white border border-slate-200 text-slate-900"
                    }`}
                >
                  {/* ── 1. Overview Section ── */}
                  <div
                    ref={sectionRefs.overview}
                    className={`space-y-5 border-b pb-8 ${
                      canvasTheme === "dark" ? "border-slate-800" : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-extrabold text-blue-400 border-l-4 border-blue-500 pl-3">
                        창업아이템 개요(요약)
                      </h2>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        🏛️ {formData.targetProgramTitle || "중소벤처기업부 표준 PSST"}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-sm font-bold text-indigo-300">명칭</h3>
                      <p className="text-xs font-semibold pl-1">
                        <b>{generatedResult.overview.title}</b>
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-sm font-bold text-indigo-300">범주</h3>
                      <p className="text-xs pl-1">
                        인공지능(AI) 기반 <b>{generatedResult.overview.industry}</b> 솔루션 분야
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-sm font-bold text-indigo-300">아이템 개요</h3>
                      <p className="text-xs leading-relaxed pl-1 whitespace-pre-line text-slate-300">
                        {generatedResult.overview.itemSummary}
                      </p>
                    </div>

                    <div className="space-y-2 pt-2">
                      <h3 className="text-sm font-bold text-indigo-300">배경 및 필요성</h3>
                      <div
                        className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-2.5 ${canvasTheme === "dark"
                            ? "bg-slate-950/60 border-slate-800 text-slate-300"
                            : "bg-slate-50 border-slate-200 text-slate-700"
                          }`}
                      >
                        <p>
                          <b>SPRi 조사</b>에 따르면 관련 인공지능 및 디지털 자동화 시장은 <b>연평균 12.5% 이상</b>{" "}
                          고속 성장하고 있으며, 스타트업과 중소기업의 서류 행정 소요 시간 단축에 대한 수요가 급증하고
                          있습니다.
                        </p>
                        <p>{generatedResult.problem.developmentNecessity}</p>
                      </div>
                    </div>
                  </div>

                  {/* ── 2. Problem Section ── */}
                  <div
                    ref={sectionRefs.problem}
                    className={`space-y-5 border-b pb-8 ${canvasTheme === "dark" ? "border-slate-800" : "border-slate-200"
                      }`}
                  >
                    <h2 className="text-xl font-extrabold text-rose-400 border-l-4 border-rose-500 pl-3">
                      {generatedResult.problem.title}
                    </h2>

                    <div className="space-y-1.5">
                      <h3 className="text-sm font-bold text-slate-300">1-1. 시장 및 고객의 문제점</h3>
                      <p className="text-xs leading-relaxed pl-1 whitespace-pre-line text-slate-300">
                        {generatedResult.problem.marketPainPoint}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-sm font-bold text-slate-300">1-2. 타겟 고객의 핵심 페인포인트</h3>
                      <p className="text-xs leading-relaxed pl-1 whitespace-pre-line text-slate-300">
                        {generatedResult.problem.targetCustomerProblem}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-sm font-bold text-slate-300">1-3. 개발 및 사업화의 필요성</h3>
                      <p className="text-xs leading-relaxed pl-1 whitespace-pre-line text-slate-300">
                        {generatedResult.problem.developmentNecessity}
                      </p>
                    </div>
                  </div>

                  {/* ── 3. Solution Section ── */}
                  <div
                    ref={sectionRefs.solution}
                    className={`space-y-5 border-b pb-8 ${canvasTheme === "dark" ? "border-slate-800" : "border-slate-200"
                      }`}
                  >
                    <h2 className="text-xl font-extrabold text-blue-400 border-l-4 border-blue-500 pl-3">
                      {generatedResult.solution.title}
                    </h2>

                    <div className="space-y-1.5">
                      <h3 className="text-sm font-bold text-slate-300">2-1. 핵심 기술 및 해결 방안</h3>
                      <p className="text-xs leading-relaxed pl-1 whitespace-pre-line text-slate-300">
                        {generatedResult.solution.coreTechnologyAndFeatures}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-sm font-bold text-slate-300">2-2. 경쟁사 대비 차별화 요소 (기술적 해자)</h3>
                      <p className="text-xs leading-relaxed pl-1 whitespace-pre-line text-slate-300">
                        {generatedResult.solution.competitorDifferentiation}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-sm font-bold text-slate-300">2-3. 개발 및 사업화 로드맵</h3>
                      <p className="text-xs leading-relaxed pl-1 whitespace-pre-line text-slate-300">
                        {generatedResult.solution.implementationPlan}
                      </p>
                    </div>
                  </div>

                  {/* ── 4. Scale-up Section ── */}
                  <div
                    ref={sectionRefs.scaleUp}
                    className={`space-y-5 border-b pb-8 ${canvasTheme === "dark" ? "border-slate-800" : "border-slate-200"
                      }`}
                  >
                    <h2 className="text-xl font-extrabold text-purple-400 border-l-4 border-purple-500 pl-3">
                      {generatedResult.scaleUp.title}
                    </h2>

                    <div className="space-y-1.5">
                      <h3 className="text-sm font-bold text-slate-300">3-1. 비즈니스 모델(BM) 및 수익 구조</h3>
                      <p className="text-xs leading-relaxed pl-1 whitespace-pre-line text-slate-300">
                        {generatedResult.scaleUp.businessModelAndRevenue}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-sm font-bold text-slate-300">3-2. 초기 시장 진입 및 마케팅 전략</h3>
                      <p className="text-xs leading-relaxed pl-1 whitespace-pre-line text-slate-300">
                        {generatedResult.scaleUp.marketEntryAndMarketing}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-sm font-bold text-slate-300">3-3. 자금 조달 및 예산 집행 계획</h3>
                      <p className="text-xs leading-relaxed pl-1 whitespace-pre-line text-slate-300">
                        {generatedResult.scaleUp.fundingAndBudgetPlan}
                      </p>
                    </div>
                  </div>

                  {/* ── 5. Team Section ── */}
                  <div
                    ref={sectionRefs.team}
                    className={`space-y-5 border-b pb-8 ${canvasTheme === "dark" ? "border-slate-800" : "border-slate-200"
                      }`}
                  >
                    <h2 className="text-xl font-extrabold text-emerald-400 border-l-4 border-emerald-500 pl-3">
                      {generatedResult.team.title}
                    </h2>

                    <div className="space-y-1.5">
                      <h3 className="text-sm font-bold text-slate-300">4-1. 대표자 및 핵심 팀원 보유 역량</h3>
                      <p className="text-xs leading-relaxed pl-1 whitespace-pre-line text-slate-300">
                        {generatedResult.team.founderAndTeamCompetency}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-sm font-bold text-slate-300">4-2. 역할 분장 및 조직 구성</h3>
                      <p className="text-xs leading-relaxed pl-1 whitespace-pre-line text-slate-300">
                        {generatedResult.team.rolesAndResponsibilities}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-sm font-bold text-slate-300">4-3. 외부 협력 네트워크</h3>
                      <p className="text-xs leading-relaxed pl-1 whitespace-pre-line text-slate-300">
                        {generatedResult.team.collaborationNetwork}
                      </p>
                    </div>
                  </div>

                  {/* ── 6. Evaluation Report Section ── */}
                  <div ref={sectionRefs.evaluation} className="space-y-5 pb-4">
                    <h2 className="text-xl font-extrabold text-amber-400 border-l-4 border-amber-500 pl-3 flex items-center justify-between">
                      <span>5. 심사위원 모의 평가 리포트</span>
                      <span className="text-xs px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                        {generatedResult.evaluationReport.score}점 ({generatedResult.evaluationReport.grade})
                      </span>
                    </h2>

                    {/* Official Government 4-Pillar Rubric Scorecard */}
                    {generatedResult.evaluationReport.breakdown && (
                      <div
                        className={`p-4 rounded-2xl border space-y-3 text-xs ${
                          canvasTheme === "dark"
                            ? "bg-slate-950/80 border-slate-800"
                            : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between border-b pb-2 border-slate-800">
                          <span className="font-bold text-slate-200 flex items-center space-x-1.5">
                            <Award className="w-4 h-4 text-amber-400" />
                            <span>정부 공인 100점 만점 심사위원 세부 배점표</span>
                          </span>
                          <span className="text-amber-400 font-extrabold text-sm">
                            총점 {generatedResult.evaluationReport.score}점 / 100점
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          {/* 1. Problem */}
                          <div className="space-y-1.5 p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-blue-400">1. 문제 인식 (Problem)</span>
                              <span className="font-extrabold text-slate-200">
                                {generatedResult.evaluationReport.breakdown.problemScore} / 25점
                              </span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-blue-500 h-full rounded-full transition-all"
                                style={{
                                  width: `${(generatedResult.evaluationReport.breakdown.problemScore / 25) * 100}%`,
                                }}
                              />
                            </div>
                            <p className="text-[10.5px] text-slate-400 leading-relaxed">
                              {generatedResult.evaluationReport.breakdown.problemFeedback}
                            </p>
                          </div>

                          {/* 2. Solution */}
                          <div className="space-y-1.5 p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-emerald-400">2. 실현 가능성 (Solution)</span>
                              <span className="font-extrabold text-slate-200">
                                {generatedResult.evaluationReport.breakdown.solutionScore} / 30점
                              </span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-emerald-500 h-full rounded-full transition-all"
                                style={{
                                  width: `${(generatedResult.evaluationReport.breakdown.solutionScore / 30) * 100}%`,
                                }}
                              />
                            </div>
                            <p className="text-[10.5px] text-slate-400 leading-relaxed">
                              {generatedResult.evaluationReport.breakdown.solutionFeedback}
                            </p>
                          </div>

                          {/* 3. Scale-up */}
                          <div className="space-y-1.5 p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-purple-400">3. 성장 전략 (Scale-up)</span>
                              <span className="font-extrabold text-slate-200">
                                {generatedResult.evaluationReport.breakdown.scaleUpScore} / 30점
                              </span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-purple-500 h-full rounded-full transition-all"
                                style={{
                                  width: `${(generatedResult.evaluationReport.breakdown.scaleUpScore / 30) * 100}%`,
                                }}
                              />
                            </div>
                            <p className="text-[10.5px] text-slate-400 leading-relaxed">
                              {generatedResult.evaluationReport.breakdown.scaleUpFeedback}
                            </p>
                          </div>

                          {/* 4. Team */}
                          <div className="space-y-1.5 p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-amber-400">4. 팀 역량 (Team)</span>
                              <span className="font-extrabold text-slate-200">
                                {generatedResult.evaluationReport.breakdown.teamScore} / 15점
                              </span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-amber-500 h-full rounded-full transition-all"
                                style={{
                                  width: `${(generatedResult.evaluationReport.breakdown.teamScore / 15) * 100}%`,
                                }}
                              />
                            </div>
                            <p className="text-[10.5px] text-slate-400 leading-relaxed">
                              {generatedResult.evaluationReport.breakdown.teamFeedback}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div
                      className={`p-4 rounded-2xl border space-y-1 text-xs ${
                        canvasTheme === "dark"
                          ? "bg-amber-950/20 border-amber-500/30 text-amber-200"
                          : "bg-amber-50 border-amber-200 text-amber-900"
                      }`}
                    >
                      <div className="font-bold">심사위원 종합 총평</div>
                      <p className="leading-relaxed text-slate-300">
                        {generatedResult.evaluationReport.gradeDescription}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div
                        className={`p-4 rounded-2xl border space-y-1.5 text-xs ${canvasTheme === "dark"
                            ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-200"
                            : "bg-emerald-50 border-emerald-200 text-emerald-900"
                          }`}
                      >
                        <div className="font-bold flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>심사역 추천 핵심 강점</span>
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300">
                          {generatedResult.evaluationReport.strengths.map((s, idx) => (
                            <li key={idx}>{s}</li>
                          ))}
                        </ul>
                      </div>

                      <div
                        className={`p-4 rounded-2xl border space-y-1.5 text-xs ${canvasTheme === "dark"
                            ? "bg-rose-950/20 border-rose-500/30 text-rose-200"
                            : "bg-rose-50 border-rose-200 text-rose-900"
                          }`}
                      >
                        <div className="font-bold flex items-center space-x-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                          <span>감점 방지 보완점</span>
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300">
                          {generatedResult.evaluationReport.weaknesses.map((w, idx) => (
                            <li key={idx}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Q&A */}
                    <div className="space-y-3 pt-2">
                      <h3 className="text-xs font-bold text-slate-200">
                        💡 심사위원 대면 면접 예상 질문 & 추천 방어 논리
                      </h3>
                      <div className="space-y-2.5">
                        {generatedResult.evaluationReport.expectedQuestions.map((qa, idx) => (
                          <div
                            key={idx}
                            className={`p-4 rounded-2xl border space-y-2 text-xs ${canvasTheme === "dark"
                                ? "bg-slate-950/60 border-slate-800"
                                : "bg-slate-50 border-slate-200"
                              }`}
                          >
                            <div className="font-bold text-slate-100">
                              <span className="text-rose-400 mr-1.5">Q{idx + 1}.</span>
                              {qa.question}
                            </div>
                            <div
                              className={`p-2.5 rounded-xl border text-[11px] space-y-0.5 ${canvasTheme === "dark"
                                  ? "bg-blue-950/40 border-blue-500/30 text-blue-200"
                                  : "bg-blue-50 border-blue-200 text-blue-950"
                                }`}
                            >
                              <div className="font-semibold text-blue-300">
                                🛡️ 추천 답변 (의도: {qa.evaluationIntent})
                              </div>
                              <p className="leading-relaxed text-slate-300">{qa.recommendedDefense}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Paper Sheet Empty Placeholder */
                <div className="max-w-3xl mx-auto rounded-3xl border border-slate-800 bg-slate-900/60 p-12 text-center space-y-4 my-auto shadow-xl">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/10">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div className="space-y-1.5 max-w-md mx-auto">
                    <h3 className="text-base font-bold text-slate-100">
                      작성된 사업계획서가 이곳에 실시간으로 렌더링됩니다
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      좌측의 <b>[💬 AI 챗봇 인터뷰 모드]</b>에서 대화를 나누시거나, <b>[⚡ 퀵 폼 모드]</b>에서
                      정보를 입력하고 생성 버튼을 누르면 정부 표준 PSST 한글 전문이 완성됩니다.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ── Floating Right Index Anchor Nav ── */}
            {generatedResult && (
              <div className="absolute right-3 top-16 flex flex-col space-y-1.5 z-20">
                <button
                  onClick={() => scrollToSection("overview")}
                  className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-[9px] shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
                  title="창업아이템 개요"
                >
                  개요
                </button>
                <button
                  onClick={() => scrollToSection("problem")}
                  className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 border border-slate-700 hover:bg-rose-600 hover:text-white font-bold text-[10px] shadow-md flex items-center justify-center hover:scale-110 transition-all"
                  title="P: 문제인식"
                >
                  P
                </button>
                <button
                  onClick={() => scrollToSection("solution")}
                  className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 border border-slate-700 hover:bg-blue-600 hover:text-white font-bold text-[10px] shadow-md flex items-center justify-center hover:scale-110 transition-all"
                  title="S: 실현가능성"
                >
                  S
                </button>
                <button
                  onClick={() => scrollToSection("scaleUp")}
                  className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 border border-slate-700 hover:bg-purple-600 hover:text-white font-bold text-[10px] shadow-md flex items-center justify-center hover:scale-110 transition-all"
                  title="S: 성장전략"
                >
                  S
                </button>
                <button
                  onClick={() => scrollToSection("team")}
                  className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 border border-slate-700 hover:bg-emerald-600 hover:text-white font-bold text-[10px] shadow-md flex items-center justify-center hover:scale-110 transition-all"
                  title="T: 팀구성"
                >
                  T
                </button>
                <button
                  onClick={() => scrollToSection("evaluation")}
                  className="w-7 h-7 rounded-full bg-slate-800 text-amber-400 border border-slate-700 hover:bg-amber-500 hover:text-white font-bold text-[9px] shadow-md flex items-center justify-center hover:scale-110 transition-all"
                  title="평가리포트"
                >
                  평가
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── BOTTOM STATUS BAR ── */}
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
    </div>
  );
};
