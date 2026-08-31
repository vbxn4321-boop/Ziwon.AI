import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function normalizeRegionName(region?: string): string {
  if (!region) return "";
  const r = region.trim();
  if (r.startsWith("서울")) return "서울";
  if (r.startsWith("경기")) return "경기";
  if (r.startsWith("인천")) return "인천";
  if (r.startsWith("부산")) return "부산";
  if (r.startsWith("대구")) return "대구";
  if (r.startsWith("광주")) return "광주";
  if (r.startsWith("대전")) return "대전";
  if (r.startsWith("울산")) return "울산";
  if (r.startsWith("세종")) return "세종";
  if (r.startsWith("강원")) return "강원";
  if (r.startsWith("충북") || r.startsWith("충청북")) return "충북";
  if (r.startsWith("충남") || r.startsWith("충청남")) return "충남";
  if (r.startsWith("전북") || r.startsWith("전라북")) return "전북";
  if (r.startsWith("전남") || r.startsWith("전라남")) return "전남";
  if (r.startsWith("경북") || r.startsWith("경상북")) return "경북";
  if (r.startsWith("경남") || r.startsWith("경상남")) return "경남";
  if (r.startsWith("제주")) return "제주";
  return r;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const regionParam = searchParams.get("region") || "";
    const industryParam = searchParams.get("industry") || searchParams.get("category") || "";
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "6"), 1), 20);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Base Active Status condition
    const activeCondition = {
      OR: [
        { endDate: null },
        { endDate: { gte: today } },
      ],
    };

    const normRegion = normalizeRegionName(regionParam);

    // 2. Region Conditions: match specific region OR '전국'
    const regionCondition = normRegion
      ? {
          OR: [
            { region: { contains: normRegion, mode: "insensitive" as const } },
            { region: { contains: "전국", mode: "insensitive" as const } },
          ],
        }
      : null;

    // 3. Extract keywords from industry/category (e.g. "IT, 여행" -> ["IT", "여행"])
    const rawKeywords = industryParam
      .split(/[,/|\s]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 0 && k !== "전체");

    const keywordOrConditions: any[] = [];
    rawKeywords.forEach((kw) => {
      keywordOrConditions.push(
        { title: { contains: kw, mode: "insensitive" as const } },
        { targetDescription: { contains: kw, mode: "insensitive" as const } },
        { category: { contains: kw, mode: "insensitive" as const } }
      );
    });

    let matchedPrograms: any[] = [];

    const includeRelations = {
      sources: true,
      documents: true,
      analyses: true,
    };

    // Step 1: Try searching with active + region + industry keywords
    if (keywordOrConditions.length > 0) {
      const andClauses: any[] = [activeCondition, { OR: keywordOrConditions }];
      if (regionCondition) andClauses.push(regionCondition);

      matchedPrograms = await prisma.supportProgram.findMany({
        where: {
          AND: andClauses,
        },
        include: includeRelations,
        orderBy: [{ createdAt: "desc" }],
        take: limit,
      });
    }

    // Step 2: If we don't have enough programs, relax to Region + Active programs
    if (matchedPrograms.length < limit) {
      const existingIds = matchedPrograms.map((p) => p.id);
      const remainingLimit = limit - matchedPrograms.length;

      const andClauses: any[] = [activeCondition];
      if (regionCondition) andClauses.push(regionCondition);
      if (existingIds.length > 0) {
        andClauses.push({ id: { notIn: existingIds } });
      }

      const regionPrograms = await prisma.supportProgram.findMany({
        where: {
          AND: andClauses,
        },
        include: includeRelations,
        orderBy: [{ createdAt: "desc" }],
        take: remainingLimit,
      });

      matchedPrograms = [...matchedPrograms, ...regionPrograms];
    }

    // Step 3: Fallback guarantee (Latest top active programs nationwide)
    if (matchedPrograms.length < limit) {
      const existingIds = matchedPrograms.map((p) => p.id);
      const remainingLimit = limit - matchedPrograms.length;

      const andClauses: any[] = [activeCondition];
      if (existingIds.length > 0) {
        andClauses.push({ id: { notIn: existingIds } });
      }

      const fallbackPrograms = await prisma.supportProgram.findMany({
        where: {
          AND: andClauses,
        },
        include: includeRelations,
        orderBy: [{ createdAt: "desc" }],
        take: remainingLimit,
      });

      matchedPrograms = [...matchedPrograms, ...fallbackPrograms];
    }

    return NextResponse.json({
      success: true,
      count: matchedPrograms.length,
      programs: matchedPrograms,
      data: matchedPrograms,
    });
  } catch (error: any) {
    console.error("API /api/support-programs/recommendations Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch recommendations",
        programs: [],
        data: [],
      },
      { status: 500 }
    );
  }
}
