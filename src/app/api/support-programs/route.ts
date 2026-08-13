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
    const includeClosed = searchParams.get("includeClosed") === "true"; // Default: active notices only

    const whereClause: any = {};

    // 1. Expired Notice Filtering Logic
    // If includeClosed is FALSE, only return ongoing programs (endDate >= Today or null/always open)
    if (!includeClosed) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      whereClause.AND = [
        {
          OR: [
            { endDate: null }, // 상시 모집
            { endDate: { gte: today } }, // 마감일이 오늘 이후인 진행 중 공고
          ],
        },
      ];
    }

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

    const programs = await prisma.supportProgram.findMany({
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
    });

    return NextResponse.json({
      success: true,
      total: programs.length,
      includeClosed,
      data: programs,
    });
  } catch (error) {
    console.error("API /api/support-programs Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch support programs" },
      { status: 500 }
    );
  }
}
