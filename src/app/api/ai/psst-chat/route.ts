import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { generatePsstBusinessPlan, PsstGeneratorInput } from "@/lib/ai/psst-generator";

const CANDIDATE_MODELS = [
  process.env.AI_GENERAL_MODEL || "gemini-3.7-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-flash-latest",
];

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "GEMINI_API_KEY가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const body = await req.json();
    const { messages, generatePlan, targetProgramTitle } = body;

    const userMessages = (messages || []).filter((m: any) => m.role === "user");
    const lastUserMessage = (userMessages.slice(-1)[0]?.content || "").toLowerCase();

    // Check substantive content provided by the user across conversation
    const substantiveText = userMessages
      .map((m: any) => m.content)
      .join(" ")
      .replace(/작성해줘|작성|생성해줘|생성|만들어줘|만들어|써줘|완성해줘|완성|초안|시작|안녕|테스트/gi, "")
      .trim();

    // Check if plan generation is requested explicitly
    const isExplicitGenerateTrigger =
      generatePlan === true ||
      lastUserMessage.includes("작성해줘") ||
      lastUserMessage.includes("생성해줘") ||
      lastUserMessage.includes("만들어줘") ||
      lastUserMessage.includes("써줘") ||
      lastUserMessage.includes("완성해줘") ||
      lastUserMessage.includes("초안 써줘");

    // Count substantive dialogue turns (how many detailed user replies were given)
    const substantiveTurnCount = userMessages.filter(
      (m: any) => m.content.trim().length >= 10
    ).length;

    // Strict validation: Need at least 3~4 solid substantive turns covering PSST dimensions before generating plan
    const isInformationSufficient =
      substantiveText.length >= 80 && substantiveTurnCount >= 3;

    // Combine entire conversation as rich context
    const conversationSummary = (messages || [])
      .map((m: any) => `${m.role === "user" ? "[창업자 답변]" : "[컨설턴트 질문]"}: ${m.content}`)
      .join("\n\n");

    // Case 1: Plan Generation Requested & Information IS Sufficient
    if (isExplicitGenerateTrigger && isInformationSufficient) {
      console.log("🚀 [PSST Chat] Sufficient PSST dialogue context collected! Generating business plan...");
      const planInput: PsstGeneratorInput = {
        companyName: "예비창업기업",
        itemName: "대화 내용 기반 맞춤형 창업 아이템",
        industry: "대화 기반 신산업",
        itemDescription: `[사용자와의 1:1 심층 인터뷰 대화 전문]\n${conversationSummary}\n\n위 대화에서 사용자가 직접 언급한 실제 창업 아이템, 타겟 고객, 기술적 차별점, 문제점, 사업 모델, 팀 역량을 100% 정확하게 추출하여 PSST 사업계획서 전문을 완성해 주세요.`,
        targetProgramTitle: targetProgramTitle || "2026년 중소벤처기업부 초기창업패키지",
      };

      const planResult = await generatePsstBusinessPlan(planInput);

      return NextResponse.json({
        success: true,
        reply: `대표님과 나눈 심층 인터뷰 내용을 정밀 분석하여, **${targetProgramTitle || "중소벤처기업부"} 공인 서식에 최적화된 정부 표준 PSST 사업계획서와 심사위원 평가 리포트**를 완성했습니다! 🎉\n\n👉 **우측 문서 시트에 전문이 실시간으로 렌더링되었습니다.** [✏️ 직접편집]으로 수정하거나 [전문 복사]를 이용해 보세요.`,
        plan: planResult,
      });
    }

    // Case 2: Interactive Interview Mode (or premature generate request where we MUST ask back missing info)
    const systemInstruction = `당신은 대한민국 중소벤처기업부, 창업진흥원, 기술보증기금 출신의 수석 창업 컨설턴트 AI 'Ziwon-AI'입니다.
목표 지원사업: [${targetProgramTitle || "2026년 중소벤처기업부 초기창업패키지"}]

사용자와 1:1 심층 인터뷰를 진행하여, 정부 표준 PSST(Problem, Solution, Scale-up, Team) 사업계획서에 필요한 핵심 정보를 **반드시 하나도 빠짐없이 차례대로 되물어서 수집**해야 합니다.

[🚨 절대 원칙 - 필수 항목 누락 시 되묻기 필수]:
사용자가 아직 정보를 충분히 주지 않았거나 중간에 "작성해줘", "만들어줘"라고 하더라도, 사업계획서 4대 요소 중 누락된 내용이 있다면 **절대로 그냥 넘어가거나 임의로 만들지 말고, 지금까지 파악된 내용과 함께 부족한 필수 항목을 구체적으로 되물어 답을 받아내세요!**

[단계별 필수 인터뷰 항목]:
- **1단계 (아이템 & 타겟)**: 어떤 창업 아이템(서비스/제품)인지와 누구를 위한 타겟 고객인지 확인.
- **2단계 (문제점/페인포인트 - Problem)**: 타겟 고객이 기존 방식이나 경쟁 제품에서 겪는 가장 큰 고통(비용/시간/고장/불편함)과 왜 지금 이 사업이 시급한지 되물어 확인.
- **3단계 (해결책 & 차별성 - Solution)**: 우리 제품의 핵심 작동 원리와 기술 사양, 경쟁사가 쉽게 따라할 수 없는 기술적 차별점(해자)을 되물어 확인.
- **4단계 (수익 모델 & 마케팅 - Scale-up)**: 돈을 어떻게 버는지(과금 방식, 구독료/단가)와 초기 고객을 모을 마케팅/유통 채널을 되물어 확인.
- **5단계 (팀 구성 및 역량 - Team)**: 대표자 및 팀원의 전공, 실무 개발/영업 경력, 해당 분야 전문성을 되물어 확인.

[대화 진행 규칙]:
1. 사용자의 답변을 들으면 잘된 점을 전문 창업/기술 용어(PoC, LTV, LoRa 통신, B2B 공급망, Vision AI 등)로 세련되게 정리/칭찬해 주세요.
2. 현재 대화에서 아직 답변되지 않은 **다음 필수 단계의 질문을 1~2개로 집중하여 던지세요.**
3. 사용자가 답변하기 쉽도록 **"예를 들어 A방식(구독형)인가요, 아니면 B방식(장비 판매형)인가요?"**처럼 실무 선택지 예시를 곁들여 질문하세요.
4. 만약 모든 필수 정보(1~5단계)가 충분히 모였다면, **"대표님! PSST 사업계획서 작성에 필요한 핵심 정보가 모두 완벽히 수집되었습니다. 이제 사업계획서를 생성해 드릴까요?"**라고 안내하세요.
5. 절대로 채팅창에 길고 지저분하게 사업계획서 전문 텍스트를 출력하지 마세요 (우측 문서 시트에 자동 렌더링됩니다).`;

    const chatHistory = (messages || []).map((m: any) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    let replyText = "";
    let lastError: any = null;

    for (const modelName of CANDIDATE_MODELS) {
      try {
        console.log(`💬 [PSST Chat] Calling Gemini model: ${modelName}...`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: chatHistory,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });
        if (response.text) {
          replyText = response.text;
          console.log(`✅ [PSST Chat] Succeeded with model: ${modelName}`);
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[PSST Chat] Model ${modelName} failed:`, err.message?.substring(0, 80));
      }
    }

    if (!replyText) {
      throw lastError || new Error("답변 생성에 실패했습니다.");
    }

    return NextResponse.json({
      success: true,
      reply: replyText,
    });
  } catch (error: any) {
    console.error("PSST Chat API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "대화 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
