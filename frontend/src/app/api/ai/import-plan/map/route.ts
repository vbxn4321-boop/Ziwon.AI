import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import { requireUser } from "@/lib/auth/verify-token";
import { guardAiRoute, LIGHT_LIMITS } from "@/lib/security/ai-route-guard";
import { FAST_MODELS } from "@/lib/ai/models";

export const maxDuration = 60;

const CustomFieldDefinitionSchema = z.object({
  id: z.string().max(100),
  label: z.string().max(200),
  guidance: z.string().max(1000).optional(),
});

const TargetFormSchema = z.object({
  id: z.string().max(100).optional(),
  title: z.string().max(200).optional(),
  fields: z.array(CustomFieldDefinitionSchema).max(50).optional(),
});

const MapInputSchema = z.object({
  text: z.string().min(20, "사업계획서 텍스트가 너무 짧습니다.").max(120_000),
  targetFormSchema: TargetFormSchema.optional(),
});

const MappedPsstPlanSchema = z.object({
  itemName: z.string().max(500).optional().default(""),
  itemDescription: z.string().max(5000).optional().default(""),
  problemBackground: z.string().max(15000).optional().default(""),
  solutionOverview: z.string().max(15000).optional().default(""),
  marketAnalysis: z.string().max(15000).optional().default(""),
  revenueModel: z.string().max(15000).optional().default(""),
  teamBackground: z.string().max(15000).optional().default(""),
  customFields: z.record(z.string().max(100), z.string().max(15000)).optional().default({}),
});

type MappedPsstPlan = z.infer<typeof MappedPsstPlanSchema>;

function cleanJsonString(str: string): string {
  return str
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authentication check
    const auth = await requireUser(req);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.reason }, { status: 401 });
    }

    // 2. AI route rate limiter
    const blocked = await guardAiRoute(req, "ai/import-plan-map", LIGHT_LIMITS);
    if (blocked) return blocked;

    // 3. Input validation
    const rawBody = await req.json();
    const parsedInput = MapInputSchema.safeParse(rawBody);
    if (!parsedInput.success) {
      return NextResponse.json(
        { success: false, error: parsedInput.error.errors[0]?.message || "잘못된 입력값입니다." },
        { status: 400 }
      );
    }

    const { text, targetFormSchema } = parsedInput.data;

    const apiKey = process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "AI 설정(GEMINI_API_KEY)이 구성되지 않았습니다." },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // 4. Construct Structured Mapping Prompt
    const customFieldGuide =
      targetFormSchema && Array.isArray(targetFormSchema.fields)
        ? `목표 지원사업의 추가 서식 필드 목록:\n` +
          targetFormSchema.fields
            .map((f: any) => `- ID: "${f.id}", 라벨: "${f.label}", 지침: "${f.guidance || ''}"`)
            .join("\n") +
          `\n위 추가 필드에 해당하는 내용이 업로드 문서에 있으면 customFields 객체에 { [fieldId]: "추출내용" } 형태로 담아주세요.`
        : "";

    const prompt = `
당신은 대한민국 정부지원사업 사업계획서(PSST 표준 양식) 전문 분석 AI입니다.
업로드된 기존 사업계획서 텍스트를 읽고, 표준 PSST 및 맞춤 서식 필드에 맞춰 구조화된 JSON 데이터로 정확히 매핑 추출하세요.

[주의사항]
1. 원문에 기재된 사실만을 바탕으로 추출하고 허구의 내용을 지어내지 마세요.
2. 원문에 해당 항목의 내용이 없으면 빈 문자열("")로 두세요.
3. 마크다운 기호 없이 오직 유효한 JSON 객체만 반환하세요.
4. 개인정보(주민번호, 개인휴대폰 등)는 마스킹된 상태를 유지하세요.

${customFieldGuide}

[출력 JSON 스키마]
{
  "itemName": "창업 아이템명 (또는 기술/과제명)",
  "itemDescription": "창업 아이템 핵심 개요 및 한 줄 요약",
  "problemBackground": "문제인식 (개발 배경, 고객 페인포인트, 시장 문제점)",
  "solutionOverview": "실현가능성 (제품/서비스 개발 방안, 핵심 기술, 차별성)",
  "marketAnalysis": "성장전략 (타깃 시장, 경쟁사 분석, 비즈니스 모델 및 BM)",
  "revenueModel": "성장전략 (수익 모델, 마케팅/판로 확보 전략, 매출 계획)",
  "teamBackground": "팀 구성 (대표자 역량, 팀원 구성, 채용 및 협력 계획)",
  "customFields": {}
}

[업로드된 사업계획서 원문]:
${text.slice(0, 80_000)}
`;

    let mappedData: MappedPsstPlan | null = null;
    let lastError: any = null;

    for (const modelName of FAST_MODELS) {
      try {
        console.log(`🤖 [Import Plan Map] Calling Gemini model: ${modelName}`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
        });

        const responseText = response.text || "";
        const jsonStr = cleanJsonString(responseText);
        const parsedJson = JSON.parse(jsonStr);
        const validated = MappedPsstPlanSchema.safeParse(parsedJson);

        if (validated.success) {
          mappedData = validated.data;
          console.log(`✅ [Import Plan Map] Successfully mapped plan with model: ${modelName}`);
          break;
        } else {
          console.warn(`⚠️ [Import Plan Map] Schema validation error on model ${modelName}:`, validated.error);
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`⚠️ [Import Plan Map] Model ${modelName} failed:`, err.message);
      }
    }

    if (!mappedData) {
      console.error("[Import Plan Map] All models failed:", lastError?.message);
      return NextResponse.json(
        { success: false, error: "사업계획서 항목 매핑에 실패했습니다. 다시 시도해 주세요." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      mappedPlan: mappedData,
    });
  } catch (error: any) {
    console.error("[Import Plan Map Route] Fatal error:", error);
    return NextResponse.json(
      { success: false, error: "사업계획서 자동 매핑 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
