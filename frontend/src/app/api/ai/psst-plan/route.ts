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

    // 1. Try Python FastAPI Backend first
    try {
      const backendRes = await generatePsstWithBackend(body);
      if (backendRes && backendRes.plan) {
        return NextResponse.json({
          success: true,
          source: "PYTHON_FASTAPI_BACKEND",
          plan: backendRes.plan,
          generatedAt: new Date().toISOString(),
        });
      }
    } catch (backendErr: any) {
      console.warn("⚠️ [PSST API] Python backend unreachable, falling back to Next.js native generator:", backendErr.message);
    }

    // 2. Fallback to native generator
    const plan = await generatePsstBusinessPlan(body);

    return NextResponse.json({
      success: true,
      source: "NEXTJS_NATIVE_FALLBACK",
      plan,
      generatedAt: new Date().toISOString(),
    });
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
