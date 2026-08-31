import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { generatePsstBusinessPlan, PsstBusinessPlanResult, PsstGeneratorInput } from "@/lib/ai/psst-generator";
import { getCandidateModels } from "@/lib/ai/models";

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
    const { messages, generatePlan, targetProgramTitle, currentPlan } = body;

    const userMessages = (messages || []).filter((m: any) => m.role === "user");
    const lastUserMessage = (userMessages.slice(-1)[0]?.content || "").trim();
    const lastUserLower = lastUserMessage.toLowerCase();

    // Check substantive content provided by user across conversation
    const substantiveText = userMessages
      .map((m: any) => m.content)
      .join(" ")
      .replace(/작성해줘|작성|생성해줘|생성|만들어줘|만들어|써줘|완성해줘|완성|초안|시작|안녕|테스트/gi, "")
      .trim();

    // Check if plan generation is requested explicitly
    const isExplicitGenerateTrigger =
      generatePlan === true ||
      lastUserLower.includes("작성해줘") ||
      lastUserLower.includes("생성해줘") ||
      lastUserLower.includes("만들어줘") ||
      lastUserLower.includes("써줘") ||
      lastUserLower.includes("완성해줘") ||
      lastUserLower.includes("초안 써줘");

    // Check if user is asking to REVISE an already generated plan
    const isRevisionRequest =
      currentPlan &&
      (lastUserLower.includes("수정") ||
        lastUserLower.includes("변경") ||
        lastUserLower.includes("바꿔") ||
        lastUserLower.includes("추가해줘") ||
        lastUserLower.includes("고쳐") ||
        lastUserLower.includes("보강") ||
        lastUserLower.includes("다시 써줘"));

    // Case 1: LIVE REVISION of an existing plan
    if (isRevisionRequest && currentPlan) {
      console.log("✏️ [PSST Chat] Live Revision Requested for existing plan:", lastUserMessage);
      const revisionPrompt = `
당신은 대한민국 중소벤처기업부 수석 창업 컨설턴트입니다.
사용자가 기존 사업계획서에 대해 다음과 같은 수정을 요청했습니다:
[사용자 수정 요청]: "${lastUserMessage}"

[기존 사업계획서 JSON]:
${JSON.stringify(currentPlan, null, 2)}

[지시사항]:
1. 사용자가 수정을 요청한 특정 섹션(예: 1. 문제인식, 2. 실현가능성, 3. 성장전략/BM, 4. 팀구성, 또는 표 데이터)만 정확하고 고밀도로 수정하세요.
2. 수정되지 않은 다른 섹션 데이터와 표(competitorTable, roadmapTable, budgetTable, memberList), 100점 배점표는 그대로 보존하거나 수정 사항에 맞게 점수를 갱신하세요.
3. 반드시 변경된 전체 사업계획서 유효한 JSON만 출력하세요.
`.trim();

      for (const modelName of getCandidateModels("fast")) {
        try {
          const res = await ai.models.generateContent({
            model: modelName,
            contents: revisionPrompt,
            config: { temperature: 0.2, responseMimeType: "application/json" },
          });
          if (res.text) {
            const revisedPlan: PsstBusinessPlanResult = JSON.parse(res.text);
            return NextResponse.json({
              success: true,
              reply: `대표님의 요청사항(**"${lastUserMessage}"**)을 반영하여 우측 사업계획서 해당 섹션을 실시간으로 업데이트했습니다! ✍️✨\n\n우측 문서 시트에서 변경된 내용을 확인해 보세요.`,
              plan: revisedPlan,
              isRevised: true,
            });
          }
        } catch (err: any) {
          console.warn(`[PSST Chat] Revision with model ${modelName} failed:`, err.message);
        }
      }
    }

    // Count substantive dialogue turns
    const substantiveTurnCount = userMessages.filter(
      (m: any) => m.content.trim().length >= 10
    ).length;

    // Validation: Need at least 3 solid substantive turns
    const isInformationSufficient =
      substantiveText.length >= 80 && substantiveTurnCount >= 3;

    const conversationSummary = (messages || [])
      .map((m: any) => `${m.role === "user" ? "[창업자 답변]" : "[컨설턴트 질문]"}: ${m.content}`)
      .join("\n\n");

    // Case 2: Full Plan Generation when information is sufficient
    if (isExplicitGenerateTrigger && isInformationSufficient) {
      console.log("🚀 [PSST Chat] Sufficient PSST dialogue context collected! Generating business plan with tables...");
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
        reply: `대표님과 나눈 심층 인터뷰 내용을 정밀 분석하여, **${targetProgramTitle || "중소벤처기업부"} 공인 서식에 최적화된 정부 표준 PSST 사업계획서(요약표, 경쟁사 비교표, Q1~Q4 로드맵, 예산표 포함)와 심사위원 100점 배점 리포트**를 완성했습니다! 🎉\n\n👉 **우측 문서 시트에 전문이 실시간으로 렌더링되었습니다.** 필요하신 경우 챗봇에게 *"3-1 단가를 월 5만원으로 수정해줘"* 처럼 말씀하시면 즉시 부분 수정도 가능합니다.`,
        plan: planResult,
        progress: {
          itemTarget: true,
          problem: true,
          solution: true,
          scaleUp: true,
          team: true,
          currentStep: 5,
          completedCount: 5,
        },
      });
    }

    // Case 3: Interactive Interview Mode with Quick Suggestions & Step Progress
    const systemInstruction = `당신은 대한민국 중소벤처기업부, 창업진흥원, 기술보증기금 출신의 수석 창업 컨설턴트 AI 'Ziwon-AI'입니다.
목표 지원사업: [${targetProgramTitle || "2026년 중소벤처기업부 초기창업패키지"}]

사용자와 1:1 심층 인터뷰를 진행하여, 정부 표준 PSST(Problem, Solution, Scale-up, Team) 사업계획서에 필요한 핵심 정보를 **반드시 하나도 빠짐없이 차례대로 되물어서 수집**해야 합니다.

[🚨 절대 원칙 - 필수 항목 누락 시 되묻기 필수]:
사용자가 아직 정보를 충분히 주지 않았거나 중간에 "작성해줘", "만들어줘"라고 하더라도, 사업계획서 4대 요소 중 누락된 내용이 있다면 절대로 그냥 넘어가거나 임의로 만들지 말고, 지금까지 파악된 내용과 함께 부족한 필수 항목을 구체적으로 되물어 답을 받아내세요!

[단계별 필수 인터뷰 항목]:
- **1단계 (아이템 & 타겟)**: 어떤 창업 아이템(서비스/제품)인지와 누구를 위한 타겟 고객인지 확인.
- **2단계 (문제점/페인포인트 - Problem)**: 타겟 고객이 기존 방식이나 경쟁 제품에서 겪는 가장 큰 고통(비용/시간/고장/불편함)과 왜 지금 이 사업이 시급한지 되물어 확인.
- **3단계 (해결책 & 차별성 - Solution)**: 우리 제품의 핵심 작동 원리와 기술 사양, 경쟁사가 쉽게 따라할 수 없는 기술적 차별점(해자)을 되물어 확인.
- **4단계 (수익 모델 & 마케팅 - Scale-up)**: 돈을 어떻게 버는지(과금 방식, 구독료/단가)와 초기 고객을 모을 마케팅/유통 채널을 되물어 확인.
- **5단계 (팀 구성 및 역량 - Team)**: 대표자 및 팀원의 전공, 실무 개발/영업 경력, 해당 분야 전문성을 되물어 확인.

[출력 형식 가이드라인]:
답변 마지막에 반드시 사용자가 1클릭으로 선택할 수 있는 2~3개의 추천 답변 칩(SUGGESTIONS)과 현재까지의 수집 상태(PROGRESS)를 아래 특수 태그 형식으로 덧붙이세요:

<<<SUGGESTIONS>>>
- (답변 추천 1: 구체적인 실무 예시)
- (답변 추천 2: 또 다른 실무 예시)
- (답변 추천 3: 다른 선택지)
<<<PROGRESS>>>
{"itemTarget": true, "problem": false, "solution": false, "scaleUp": false, "team": false, "currentStep": 2}`;

    const chatHistory = (messages || []).map((m: any) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    let rawReply = "";
    let lastError: any = null;

    for (const modelName of getCandidateModels("fast")) {
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
          rawReply = response.text;
          console.log(`✅ [PSST Chat] Succeeded with model: ${modelName}`);
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[PSST Chat] Model ${modelName} failed:`, err.message?.substring(0, 80));
      }
    }

    if (!rawReply) {
      throw lastError || new Error("답변 생성에 실패했습니다.");
    }

    // Parse suggestions and progress metadata tags from AI reply
    let replyText = rawReply;
    let suggestions: string[] = [];
    let progress = {
      itemTarget: substantiveTurnCount >= 1,
      problem: substantiveTurnCount >= 2,
      solution: substantiveTurnCount >= 3,
      scaleUp: substantiveTurnCount >= 4,
      team: substantiveTurnCount >= 5,
      currentStep: Math.min(5, substantiveTurnCount + 1),
      completedCount: Math.min(5, substantiveTurnCount),
    };

    // Extract SUGGESTIONS
    const suggMatch = rawReply.match(/<<<SUGGESTIONS>>>([\s\S]*?)(?:<<<PROGRESS>>>|PROGRESS|\{|```|$)/i);
    if (suggMatch) {
      suggestions = suggMatch[1]
        .split("\n")
        .map((s) => s.replace(/^[-*•\d.]+\s*/, "").replace(/^["']|["']$/g, "").trim())
        .filter((s) => s.length > 0 && !s.startsWith("{") && !s.startsWith("<"))
        .slice(0, 3);
    }

    // Extract PROGRESS
    const progMatch =
      rawReply.match(/(?:<<<PROGRESS>>>|PROGRESS:?)\s*(\{[\s\S]*?\})/i) ||
      rawReply.match(/(\{[\s\S]*?"itemTarget"[\s\S]*?\})/i);
    if (progMatch) {
      try {
        const parsedProg = JSON.parse(progMatch[1].trim());
        const completed = Object.values(parsedProg).filter((v) => v === true).length;
        progress = {
          ...progress,
          ...parsedProg,
          completedCount: completed,
        };
      } catch {}
    }

    // Thoroughly sanitize replyText so NO JSON or metadata tags ever leak to user
    replyText = replyText
      .replace(/<<<SUGGESTIONS>>>[\s\S]*?(?:<<<PROGRESS>>>|$)/gi, "")
      .replace(/<<<PROGRESS>>>[\s\S]*?$/gi, "")
      .replace(/PROGRESS:?\s*\{[\s\S]*?\}/gi, "")
      .replace(/\{[\s\S]*?"itemTarget"[\s\S]*?\}/gi, "")
      .replace(/\{[\s\S]*?"currentStep"[\s\S]*?\}/gi, "")
      .replace(/```json[\s\S]*?```/gi, "")
      .trim();

    // If no suggestions were generated by tags, generate context-tailored fallback suggestions
    if (suggestions.length === 0) {
      if (progress.currentStep === 1) {
        suggestions = ["🌱 스마트팜 비닐하우스 모니터링", "📦 친환경 생분해 완충재 포장", "🩺 AI 헬스케어 비대면 진료"];
      } else if (progress.currentStep === 2) {
        suggestions = ["초기 설치비가 수천만원이라 너무 비싸다", "고장이나 정전 시 즉시 알림이 안 와서 냉해 피해 발생", "사용법이 너무 복잡해서 고령층이 쓰기 어렵다"];
      } else if (progress.currentStep === 3) {
        suggestions = ["자체 LoRa 초저전력 센서 + 3초 이내 카카오 알림톡", "경쟁사 대비 80% 저렴한 단가 및 3-클릭 UI", "독자 딥러닝 이상 탐지 알고리즘 특허 출원"];
      } else if (progress.currentStep === 4) {
        suggestions = ["월 39,000원 정기 구독형 SaaS", "하드웨어 판매(50만원) + 연간 유지보수료", "지자체/농협 협력 B2G 공급 계약"];
      } else {
        suggestions = ["대표자: 해당 분야 5년 실무 경력 + 풀스택 개발팀", "컴퓨터공학 전공 대표 + 산학연 연구소 자문단 보유", "초안 작성해줘! 🚀"];
      }
    }

    // If 4 turns completed, add "초안 작성해줘! 🚀" suggestion
    if (substantiveTurnCount >= 3 && !suggestions.includes("초안 작성해줘! 🚀")) {
      suggestions.push("초안 작성해줘! 🚀");
    }

    return NextResponse.json({
      success: true,
      reply: replyText,
      suggestions,
      progress,
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
