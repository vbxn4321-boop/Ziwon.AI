import { NextRequest, NextResponse } from "next/server";
import { guardAiRoute, LIGHT_LIMITS } from "@/lib/security/ai-route-guard";
import { GoogleGenAI } from "@google/genai";
import { generatePsstBusinessPlan, PsstBusinessPlanResult, PsstGeneratorInput } from "@/lib/ai/psst-generator";
import { getCandidateModels } from "@/lib/ai/models";

/**
 * 대화 중에 참고할 공고문 맥락을 준비한다.
 *
 * 챗봇이 "이 공고에는 이러이러한 게 필요하니 알려달라" 고 물으려면 공고문 내용을
 * 알아야 하는데, 기존에는 시스템 프롬프트에 공고 제목만 들어가 있어서 어떤 공고든
 * 똑같은 일반 질문만 했다. 공고문에서 필요한 섹션만 발췌해 넣는다.
 */
async function loadNoticeContext(targetProgramTitle?: string): Promise<{
  promptBlock: string;
  hasNotice: boolean;
}> {
  if (!targetProgramTitle) return { promptBlock: "", hasNotice: false };

  try {
    const { prisma } = await import("@/lib/db");
    const found = await prisma.supportProgram.findFirst({
      where: { title: { contains: targetProgramTitle.slice(0, 20) } },
      include: { documents: { select: { fileName: true, extractedText: true } } },
    });
    if (!found || found.documents.length === 0) return { promptBlock: "", hasNotice: false };

    const { extractNoticeForPrompt } = await import("@/lib/parser/notice-extractor");
    // 대화는 매 턴 호출되므로 분석용보다 짧게 자른다
    const extraction = extractNoticeForPrompt(found.documents, 8000);
    if (!extraction.promptText.trim()) return { promptBlock: "", hasNotice: false };

    const stageNote =
      extraction.productStage === "PROTOTYPE"
        ? "\n※ 이 사업은 시제품·프로토타입 단계를 지원합니다. 양산 전제로 질문하지 마십시오."
        : extraction.productStage === "MASS_PRODUCTION"
        ? "\n※ 이 사업은 양산·상용화 단계를 지원합니다. 아이디어 검증 전제로 질문하지 마십시오."
        : "";

    return {
      hasNotice: true,
      promptBlock: `
[이 공고의 실제 내용 - 아래 근거로만 질문하십시오]
${extraction.promptText}${stageNote}

[공고 기반 질문 원칙]
- 위 공고문에 적힌 지원자격·평가항목·제출서류를 근거로, 이 공고에 꼭 필요한 정보를 콕 집어 물어보십시오.
  (예: 평가항목에 "기술 독창성"이 있으면 그 부분을 구체적으로 되묻기)
- 추천 답변(SUGGESTIONS)도 이 공고의 분야와 평가 기준에 맞춰 제시하십시오. 무관한 업종 예시를 쓰지 마십시오.
- 위 공고문에 없는 내용(배점, 금액, 날짜 등)은 아는 척하지 말고 "공고문에 기재되어 있지 않다"고 하십시오.
- 주관기관의 내부 심사 성향이나 과거 공고와의 비교는 당신이 알 수 없는 정보입니다. 단정하지 말고,
  일반적인 가이드임을 밝히거나 사용자에게 확인을 요청하십시오.`,
    };
  } catch (e: any) {
    console.warn("[PSST Chat] 공고문 맥락 로딩 실패:", e.message);
    return { promptBlock: "", hasNotice: false };
  }
}

export async function POST(req: NextRequest) {
  try {
    // 비인가 대량 호출로 Gemini 비용이 새는 것을 막습니다.
    const blocked = guardAiRoute(req, "ai/psst-chat", LIGHT_LIMITS);
    if (blocked) return blocked;

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
      
      let grantType: any = "CASH_GRANT";
      let extractedOutline: string[] = [];
      let maxBudgetWon: number | undefined = undefined;
      let programAnalysis: any = undefined;

      if (targetProgramTitle) {
        try {
          const { prisma } = await import("@/lib/db");
          const found = await prisma.supportProgram.findFirst({
            where: { title: { contains: targetProgramTitle.slice(0, 20) } },
            include: {
              documents: true,
              sources: true,
              analyses: { where: { status: "COMPLETED" }, orderBy: { createdAt: "desc" }, take: 1 },
            },
          });
          if (found) {
            const { analyzeProgramForPsst } = await import("@/lib/parser/outline-extractor");
            const docTexts = found.documents.map((d) => d.extractedText || "").filter(Boolean);
            const rawData = found.sources[0]?.rawData || "";
            const analysis = analyzeProgramForPsst(found.title, found.targetDescription || "", docTexts, rawData);
            grantType = analysis.grantType;
            extractedOutline = analysis.outlines;
            maxBudgetWon = analysis.maxBudgetWon;

            // 공고 분석 결과(배점표·가점·자격요건)를 생성기에 넘긴다.
            // psst-generator 에 이걸 프롬프트로 만드는 코드가 이미 있는데
            // 여태 아무도 채워주지 않아 평가 기준을 모른 채 계획서를 쓰고 있었다.
            if (found.analyses[0]?.resultJson) {
              try {
                programAnalysis = JSON.parse(found.analyses[0].resultJson);
                console.log(`📊 [PSST Chat] 공고 분석 결과를 생성에 반영합니다: ${found.title.slice(0, 30)}`);
              } catch {
                console.warn("[PSST Chat] 공고 분석 JSON 파싱 실패");
              }
            }
          }
        } catch (e: any) {
          console.warn("[PSST Chat] Program auto-analysis skipped:", e.message);
        }
      }

      const planInput: PsstGeneratorInput = {
        companyName: "예비창업기업",
        itemName: "대화 내용 기반 맞춤형 창업 아이템",
        industry: "대화 기반 신산업",
        itemDescription: `[사용자와의 1:1 심층 인터뷰 대화 전문]\n${conversationSummary}\n\n위 대화에서 사용자가 직접 언급한 실제 창업 아이템, 타겟 고객, 기술적 차별점, 문제점, 사업 모델, 팀 역량을 100% 정확하게 추출하여 PSST 사업계획서 전문을 완성해 주세요.`,
        targetProgramTitle: targetProgramTitle || "2026년 중소벤처기업부 초기창업패키지",
        grantType,
        extractedOutline,
        maxBudgetWon,
        programAnalysis,
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

    const { companyProfile, formSchema: clientFormSchema } = body;
    const { getStandardFormSchema } = await import("@/features/psst/constants");
    const activeSchema = clientFormSchema && clientFormSchema.fields?.length > 0
      ? clientFormSchema
      : getStandardFormSchema(targetProgramTitle);

    // 공고문 발췌를 대화에 실어준다. 이게 없으면 챗봇이 공고 제목만 보고
    // 어떤 사업이든 똑같은 일반 질문만 하게 된다.
    const noticeContext = await loadNoticeContext(targetProgramTitle);

    // 서식 칸 목록 및 작성 지침(※) 블록 생성
    const schemaFieldsBlock = activeSchema.fields.map((f: any, idx: number) => {
      const typeNote = f.type === "FACT" ? "[사실정보-자동반영]" : f.type === "ATTACHMENT" ? "[첨부물]" : "[서술형-인터뷰]";
      const guideNote = f.guidance ? `\n    └ 주관기관 작성지침: ※ ${f.guidance}` : "";
      return `  ${idx + 1}. (ID: ${f.id}) [${f.sectionTitle || "공통"}] ${f.label} ${typeNote}${guideNote}`;
    }).join("\n");

    const companyProfileNote = companyProfile && companyProfile.name
      ? `\n[사용자 기업 등록 정보 (FACT 항목 자동완성)]:
- 회사명: ${companyProfile.name}
- 업종/분야: ${companyProfile.industry || "미지정"}
- 주요 아이템 요약: ${companyProfile.coreItemSummary || "미지정"}
- 보유 특허/인증: ${[companyProfile.hasPatents ? "특허보유" : "", companyProfile.hasCertifications ? "벤처/이노비즈" : "", companyProfile.isExporting ? "수출기업" : ""].filter(Boolean).join(", ") || "없음"}
※ 위 FACT(사실정보) 칸은 이미 수집 완료되었으므로, 질문은 첫 번째 서술형(NARRATIVE) 칸부터 집중해서 질문하십시오.`
      : "";

    const systemInstruction = `당신은 대한민국 중소벤처기업부, 창업진흥원, 기술보증기금 출신의 수석 창업 컨설턴트 AI 'Ziwon-AI'입니다.
목표 지원사업: [${targetProgramTitle || activeSchema.title || "2026년 중소벤처기업부 초기창업패키지"}]
${noticeContext.promptBlock}

[공식 사업계획서 서식 칸 목록 및 주관기관 작성지침(※)]:
${schemaFieldsBlock}
${companyProfileNote}

[🚨 서식 칸 기반 1:1 인터뷰 원칙]:
1. 위 서식 칸 목록의 **NARRATIVE(서술형)** 항목을 순서대로 하나씩 짚어가며 심층 질문을 진행하세요.
2. 각 칸을 질문할 때, 반드시 해당 칸에 달린 **'주관기관 작성지침(※)'을 질문의 핵심 근거**로 인용하여 질문하세요.
   (예: "현재 서식의 '1-1. 창업아이템 개발 배경' 항목을 작성하기 위해, 주관기관 지침에 따라 기존 시장의 가장 큰 문제점과 고객 페인포인트를 말씀해 주세요.")
3. 사용자가 아직 정보를 충분히 주지 않았거나 중간에 "작성해줘", "만들어줘"라고 하더라도, 현재 작성 중인 서식 칸에 필요한 핵심 근거가 누락되었다면 친절하게 되물어 명확한 답을 받아내세요.
4. 사용자가 답한 내용은 서식 칸에 맞게 정돈하고, 자연스럽게 다음 서식 칸으로 넘어가며 질문하세요.

[출력 형식 가이드라인]:
답변 마지막에 반드시 사용자가 1클릭으로 선택할 수 있는 2~3개의 추천 답변 칩(SUGGESTIONS)과 현재까지의 서식 칸 수집 상태(PROGRESS)를 아래 특수 태그 형식으로 덧붙이세요:

<<<SUGGESTIONS>>>
- (답변 추천 1: 공고 및 서식 지침에 부합하는 구체적인 실무 예시)
- (답변 추천 2: 또 다른 실무 예시)
- (답변 추천 3: 다른 선택지)
<<<PROGRESS>>>
{"totalFields": ${activeSchema.fields.length}, "completedFieldIds": ["f1"], "currentFieldId": "f2", "currentFieldLabel": "${activeSchema.fields[1]?.label || '창업배경'}", "completedCount": 1, "itemTarget": true, "problem": false, "solution": false, "scaleUp": false, "team": false, "currentStep": 2}`;

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
    
    // Default fallback progress calculation based on active schema
    const totalFieldsCount = activeSchema.fields.length;
    const hasCompanyFact = Boolean(companyProfile && companyProfile.name);
    const initialCompletedCount = hasCompanyFact ? 1 : 0;
    const estimatedCompletedCount = Math.min(totalFieldsCount, initialCompletedCount + substantiveTurnCount);
    const currentFieldIndex = Math.min(totalFieldsCount - 1, estimatedCompletedCount);
    const currentField = activeSchema.fields[currentFieldIndex] || activeSchema.fields[0];

    const completedFieldIds: string[] = activeSchema.fields
      .slice(0, estimatedCompletedCount)
      .map((f: any) => f.id);

    let progress: any = {
      totalFields: totalFieldsCount,
      completedCount: estimatedCompletedCount,
      currentFieldId: currentField?.id || "f1",
      currentFieldLabel: currentField?.label || "1. 창업아이템 개요",
      currentFieldGuidance: currentField?.guidance || "",
      completedFieldIds,
      itemTarget: estimatedCompletedCount >= 1,
      problem: estimatedCompletedCount >= 2,
      solution: estimatedCompletedCount >= 3,
      scaleUp: estimatedCompletedCount >= 4,
      team: estimatedCompletedCount >= 5,
      currentStep: Math.min(5, Math.ceil((estimatedCompletedCount / Math.max(1, totalFieldsCount)) * 5) || 1),
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
      rawReply.match(/(\{[\s\S]*?"(?:totalFields|itemTarget|currentFieldId)"[\s\S]*?\})/i);
    if (progMatch) {
      try {
        const parsedProg = JSON.parse(progMatch[1].trim());
        const completed = typeof parsedProg.completedCount === "number"
          ? parsedProg.completedCount
          : Object.values(parsedProg).filter((v) => v === true).length;

        progress = {
          ...progress,
          ...parsedProg,
          totalFields: totalFieldsCount,
          completedCount: completed,
          currentFieldId: parsedProg.currentFieldId || progress.currentFieldId,
          currentFieldLabel: parsedProg.currentFieldLabel || progress.currentFieldLabel,
        };
      } catch {}
    }

    // Build fieldProgress list for UI step chips
    const fieldProgress = activeSchema.fields.map((field: any, idx: number) => {
      const isCompleted = progress.completedFieldIds?.includes(field.id) || idx < progress.completedCount;
      return {
        id: field.id,
        label: field.label,
        guidance: field.guidance,
        type: field.type,
        sectionTitle: field.sectionTitle,
        completed: isCompleted,
      };
    });
    progress.fieldProgress = fieldProgress;

    // Thoroughly sanitize replyText so NO JSON or metadata tags ever leak to user
    replyText = replyText
      .replace(/<<<SUGGESTIONS>>>[\s\S]*?(?:<<<PROGRESS>>>|$)/gi, "")
      .replace(/<<<PROGRESS>>>[\s\S]*?$/gi, "")
      .replace(/PROGRESS:?\s*\{[\s\S]*?\}/gi, "")
      .replace(/\{[\s\S]*?"(?:itemTarget|totalFields|currentFieldId)"[\s\S]*?\}/gi, "")
      .replace(/```json[\s\S]*?```/gi, "")
      .trim();

    // 태그로 추천 답변이 안 나왔을 때의 대비책
    if (suggestions.length === 0 && !noticeContext.hasNotice) {
      if (progress.completedCount <= 1) {
        suggestions = ["🌱 스마트팜 비닐하우스 원격 모니터링", "📦 친환경 생분해 완충재 포장", "🩺 AI 헬스케어 비대면 진료"];
      } else if (progress.completedCount <= 2) {
        suggestions = ["초기 설치비가 수천만원이라 너무 비싸다", "고장이나 정전 시 즉시 알림이 안 와서 냉해 피해 발생", "사용법이 너무 복잡해서 고령층이 쓰기 어렵다"];
      } else if (progress.completedCount <= 3) {
        suggestions = ["자체 LoRa 초저전력 센서 + 3초 이내 카카오 알림톡", "경쟁사 대비 80% 저렴한 단가 및 3-클릭 UI", "독자 딥러닝 이상 탐지 알고리즘 특허 출원"];
      } else if (progress.completedCount <= 4) {
        suggestions = ["월 39,000원 정기 구독형 SaaS", "하드웨어 판매(50만원) + 연간 유지보수료", "지자체/농협 협력 B2G 공급 계약"];
      } else {
        suggestions = ["대표자: 해당 분야 5년 실무 경력 + 풀스택 개발팀", "컴퓨터공학 전공 대표 + 산학연 연구소 자문단 보유", "초안 작성해줘! 🚀"];
      }
    }

    // If substantive turns completed, add "초안 작성해줘! 🚀" suggestion
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
