import { NextRequest, NextResponse } from "next/server";
import { generatePsstWithBackend } from "@/lib/backend-client";
import { generatePsstBusinessPlan, PsstGeneratorInput } from "@/lib/ai/psst-generator";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body: PsstGeneratorInput = await req.json();

    if (!body.itemName || !body.itemDescription) {
      return NextResponse.json(
        { success: false, error: "창업 아이템명과 핵심 설명은 필수 입력 항목입니다." },
        { status: 400 }
      );
    }

    console.log(`🚀 [PSST Plan API] Generating business plan for: ${body.itemName}...`);

    // 1. Generate high-precision PSST Plan using Next.js AI Engine (supports full schema & program analysis context)
    try {
      const plan = await generatePsstBusinessPlan(body);
      if (plan && plan.overview && plan.problem) {
        return NextResponse.json({
          success: true,
          source: "NEXTJS_NATIVE_GENERATOR",
          plan,
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
