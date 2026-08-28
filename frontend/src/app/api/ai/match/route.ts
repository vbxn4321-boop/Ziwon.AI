import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/db";

const CASCADE_MODELS = [
  process.env.AI_GENERAL_MODEL || "gemini-2.0-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const company = body.company || body.companyProfile;
    let program = body.program;

    if (!program && body.programId) {
      program = await prisma.supportProgram.findUnique({
        where: { id: body.programId },
      });
    }

    if (!company || !program) {
      return NextResponse.json({ error: "기업 프로필 또는 공고 정보를 찾을 수 없습니다. 기업 정보를 먼저 등록해 주세요." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
      return NextResponse.json({ error: "AI 분석 API 키가 설정되지 않았습니다." }, { status: 500 });
    }

    // 업력 계산
    const foundedDate = company.foundedDate ? new Date(company.foundedDate) : null;
    const ageYears = foundedDate
      ? Math.floor((Date.now() - foundedDate.getTime()) / (1000 * 60 * 60 * 24 * 365))
      : null;

    const prompt = `
[역할]
당신은 대한민국 중소벤처기업부 전문 심사위원입니다.
아래 기업 정보와 지원사업 공고를 비교 분석하여, 이 기업이 해당 공고에 얼마나 적합한지 0~100점으로 평가하십시오.

[기업 정보]
- 기업명: ${company.name || "미입력"}
- 산업 분야: ${company.industry || "미입력"}
- 소재지: ${company.region || "미입력"}
- 업력: ${ageYears !== null ? `${ageYears}년` : "미입력"}
- 상시 근로자: ${company.employeeCount || 1}명
- 최근 매출액: ${company.revenue ? `${Number(company.revenue).toLocaleString()}원` : "미입력"}
- 특허/지식재산권: ${company.hasPatents ? "보유" : "미보유"}
- 벤처/이노비즈 인증: ${company.hasCertifications ? "보유" : "미보유"}
- 수출 실적: ${company.isExporting ? "보유" : "미보유"}
- 핵심 아이템: ${company.coreItemSummary || "미입력"}

[지원사업 공고 정보]
- 사업명: ${program.title}
- 주관기관: ${program.organizer}
- 지원 분야: ${program.category}
- 지원 지역: ${program.region}
- 지원 대상: ${program.targetDescription || "미상세"}
- 예산/지원규모: ${program.budget || "미상세"}

[평가 지침]
다음 4개 항목을 각각 25점 만점으로 평가하십시오:
1. 지역 적합도 (25점): 기업 소재지와 공고 지원지역 일치 여부
2. 산업/분야 적합도 (25점): 기업 산업분야와 공고 지원분야 일치 여부
3. 기업 규모/업력 조건 (25점): 업력, 매출, 인원 수가 지원대상 조건에 부합하는지
4. 특화 가점 (25점): 특허/인증/수출 실적 등 우대 조건 부합 여부

반드시 다음 JSON 형식으로만 응답하십시오:
{
  "totalScore": 숫자(0~100),
  "grade": "S" | "A" | "B" | "C" | "D",
  "gradeLabel": "매우 적합" | "적합" | "보통" | "미흡" | "부적합",
  "items": [
    { "label": "지역 적합도", "score": 숫자, "maxScore": 25, "comment": "한 줄 코멘트" },
    { "label": "산업/분야 적합도", "score": 숫자, "maxScore": 25, "comment": "한 줄 코멘트" },
    { "label": "기업 규모/업력", "score": 숫자, "maxScore": 25, "comment": "한 줄 코멘트" },
    { "label": "특화 가점", "score": 숫자, "maxScore": 25, "comment": "한 줄 코멘트" }
  ],
  "recommendation": "2~3문장으로 이 기업에게 이 공고를 추천하거나 주의사항을 설명하는 전문가 의견",
  "keyRisks": ["주요 리스크 항목 1", "주요 리스크 항목 2"],
  "keyStrengths": ["주요 강점 항목 1", "주요 강점 항목 2"]
}
`;

    const ai = new GoogleGenAI({ apiKey });
    const candidateModels = CASCADE_MODELS.filter((v, i, a) => a.indexOf(v) === i && !!v);

    let lastError: any = null;
    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        });

        const text = response.text;
        if (!text) continue;

        const clean = text.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
        const result = JSON.parse(clean);

        return NextResponse.json({ success: true, result, data: result });
      } catch (e) {
        lastError = e;
        console.error(`[AI Match] Model ${modelName} failed:`, e);
      }
    }

    console.error("[AI Match] All models failed:", lastError);
    return NextResponse.json({ error: "AI 매칭 분석에 실패했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });

  } catch (err: any) {
    console.error("[AI Match] Request error:", err);
    return NextResponse.json({ error: err.message || "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
