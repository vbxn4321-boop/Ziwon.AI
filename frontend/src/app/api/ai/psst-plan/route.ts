import { NextRequest, NextResponse } from "next/server";
import { guardAiRoute, HEAVY_LIMITS } from "@/lib/security/ai-route-guard";
import { generatePsstWithBackend } from "@/lib/backend-client";
import { generatePsstBusinessPlan, PsstGeneratorInput } from "@/lib/ai/psst-generator";
import { analyzeProgramForPsst } from "@/lib/parser/outline-extractor";
import { prisma } from "@/lib/db";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    // 비인가 대량 호출로 Gemini 비용이 새는 것을 막습니다.
    const blocked = await guardAiRoute(req, "ai/psst-plan", HEAVY_LIMITS);
    if (blocked) return blocked;

    const body: PsstGeneratorInput = await req.json();

    if (!body.itemName || !body.itemDescription) {
      return NextResponse.json(
        { success: false, error: "창업 아이템명과 핵심 설명은 필수 입력 항목입니다." },
        { status: 400 }
      );
    }

    // 공고 맞춤 계획서 생성은 그 공고의 AI 분석을 연 계정만 쓸 수 있다 —
    // 단, 유료 티어링이 아직 사업적으로 확정 전이라 지금은 판정만 하고
    // 막지는 않는다(ENTITLEMENT_ENFORCED, 기본 꺼짐). 켜지면 psst-chat 에만
    // 게이트를 두는 것으로는 부족하다 — 실제 생성(가장 비싼 Gemini 호출)이
    // 여기서 일어나므로 이 라우트를 직접 불러 우회할 수 있기 때문이다.
    // programId 가 없으면 공고와 무관한 범용 작성이라 무료 영역으로 통과시킨다.
    if (body.programId) {
      const { getOptionalUser } = await import("@/lib/auth/verify-token");
      const { getAnalysisAccess } = await import("@/lib/auth/analysis-access");
      const { ENTITLEMENT_ENFORCED } = await import("@/lib/auth/entitlement-flag");
      const user = await getOptionalUser(req);
      const access = await getAnalysisAccess(user?.sub ?? null, body.programId);
      if (!access.unlocked) {
        console.log(
          `[PSST Plan] 공고 ${body.programId}: 분석 이용권 없음 ` +
            `(강제 적용 ${ENTITLEMENT_ENFORCED ? "ON — 거절" : "OFF — 통과시킴"})`
        );
        if (ENTITLEMENT_ENFORCED) {
          return NextResponse.json(
            {
              success: false,
              error: "이 공고의 AI 분석을 먼저 열어야 맞춤 계획서를 생성할 수 있습니다.",
              needsAnalysis: true,
            },
            { status: 403 }
          );
        }
      }
    }

    console.log(`🚀 [PSST Plan API] Generating business plan for: ${body.itemName}...`);

    // Auto-analyze program if targetProgramTitle is provided and grantType is not explicitly set
    if (!body.grantType && body.targetProgramTitle) {
      try {
        const found = await prisma.supportProgram.findFirst({
          where: { title: { contains: body.targetProgramTitle.slice(0, 20) } },
          include: {
            documents: true,
            sources: true,
            analyses: { where: { status: "COMPLETED" }, orderBy: { createdAt: "desc" }, take: 1 },
          },
        });
        if (found) {
          // 배점표·가점·자격요건이 담긴 공고 분석 결과를 생성기에 넘긴다
          if (!body.programAnalysis && found.analyses[0]?.resultJson) {
            try {
              body.programAnalysis = JSON.parse(found.analyses[0].resultJson);
            } catch {
              console.warn("[PSST API] 공고 분석 JSON 파싱 실패");
            }
          }
          const docTexts = found.documents.map((d) => d.extractedText || "").filter(Boolean);
          const rawData = found.sources[0]?.rawData || "";
          const analysis = analyzeProgramForPsst(
            found.title,
            found.targetDescription || "",
            docTexts,
            rawData
          );
          body.grantType = analysis.grantType;
          body.extractedOutline = analysis.outlines;
          body.maxBudgetWon = analysis.maxBudgetWon;
          console.log(
            `🎯 [PSST API] Auto-detected grant type: ${analysis.grantType} (${analysis.grantDescription}) | Custom Outlines: ${analysis.outlines.length}`
          );
        }
      } catch (dbErr: any) {
        console.warn("[PSST API] Program auto-analysis skipped:", dbErr.message);
      }
    }

    // 1. Generate high-precision PSST Plan using Next.js AI Engine (supports full schema & program analysis context)
    try {
      const plan = await generatePsstBusinessPlan(body);
      if (plan && plan.overview && plan.problem) {
        return NextResponse.json({
          success: true,
          source: "NEXTJS_NATIVE_GENERATOR",
          plan,
          grantType: body.grantType || "CASH_GRANT",
          extractedOutline: body.extractedOutline || [],
          generatedAt: new Date().toISOString(),
        });
      }
    } catch (nativeErr: any) {
      console.warn("⚠️ [PSST API] Native generator failed, attempting Python backend:", nativeErr.message);
    }

    // 2. Fallback to Python FastAPI Backend if needed
    try {
      const backendRes = await generatePsstWithBackend(body);
      if (backendRes && backendRes.plan) {
        // Normalize any capitalization issues if present
        const p = backendRes.plan;
        const normalizedPlan = {
          overview: p.overview || p.Overview || {},
          problem: p.problem || p.Problem || {},
          solution: p.solution || p.Solution || {},
          scaleUp: p.scaleUp || p.ScaleUp || p["Scale-up"] || {},
          team: p.team || p.Team || {},
          evaluationReport: p.evaluationReport || p.EvaluationReport || {},
        };
        return NextResponse.json({
          success: true,
          source: "PYTHON_FASTAPI_BACKEND",
          plan: normalizedPlan,
          generatedAt: new Date().toISOString(),
        });
      }
    } catch (backendErr: any) {
      console.warn("⚠️ [PSST API] Python backend also failed:", backendErr.message);
    }

    throw new Error("AI 사업계획서 생성에 실패했습니다. 입력 정보를 확인 후 다시 시도해 주세요.");
  } catch (error: any) {
    console.error("API /api/ai/psst-plan Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "사업계획서 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      },
      { status: 500 }
    );
  }
}
