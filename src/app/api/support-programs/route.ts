import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const region = searchParams.get("region") || "";
    const category = searchParams.get("category") || "";
    const organizer = searchParams.get("organizer") || "";
    const targetAge = searchParams.get("targetAge") || "";
    const founderStage = searchParams.get("founderStage") || "";
    const statusMode = searchParams.get("statusMode") || (searchParams.get("onlyClosed") === "true" ? "closed" : "active");

    // Pagination & Limit for ultra-fast response
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20"), 1), 100);
    const page = Math.max(parseInt(searchParams.get("page") || "1"), 1);
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    // 1. Expired Notice Filtering Logic
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (statusMode === "closed") {
      // 마감된 공고만 보기: endDate가 존재하고 오늘 이전인 공고
      whereClause.AND = [
        { endDate: { not: null } },
        { endDate: { lt: today } },
      ];
    } else if (statusMode === "active") {
      // 진행중 공고만 보기 (기본값): endDate가 없거나(상시) 마감일이 오늘 이후인 공고
      whereClause.AND = [
        {
          OR: [
            { endDate: null },
            { endDate: { gte: today } },
          ],
        },
      ];
    }
    // statusMode === "all" 인 경우 별도 날짜 조건 없음


    // 2. Keyword Search Filter
    if (query) {
      const searchOR = [
        { title: { contains: query } },
        { organizer: { contains: query } },
        { targetDescription: { contains: query } },
        { category: { contains: query } },
      ];

      if (whereClause.AND) {
        whereClause.AND.push({ OR: searchOR });
      } else {
        whereClause.OR = searchOR;
      }
    }

    // 3. Region Filter
    if (region && region !== "전체") {
      whereClause.region = { contains: region };
    }

    // 4. Category Filter
    if (category && category !== "전체") {
      if (category.includes("R&D") || category.includes("기술")) {
        whereClause.category = { contains: "기술" };
      } else {
        whereClause.category = { contains: category };
      }
    }

    // 5. Organizer Filter
    if (organizer && organizer !== "전체") {
      whereClause.organizer = { contains: organizer };
    }

    // 6. Founder Stage Filter
    if (founderStage && founderStage !== "전체") {
      whereClause.targetDescription = { contains: founderStage };
    }

    // Execute count and paginated query concurrently
    const [total, programs] = await Promise.all([
      prisma.supportProgram.count({ where: whereClause }),
      prisma.supportProgram.findMany({
        where: whereClause,
        include: {
          sources: true,
          documents: true,
          analyses: {
            take: 1,
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: skip,
      }),
    ]);

    return NextResponse.json({
      success: true,
      total,
      page,
      limit,
      hasMore: skip + programs.length < total,
      statusMode,
      data: programs,
    });
  } catch (error: any) {
    console.error("API /api/support-programs Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch support programs",
      details: String(error),
      total: 0,
      page: 1,
      limit: 18,
      hasMore: false,
      statusMode: "active",
      data: [],
    });
  }
}

