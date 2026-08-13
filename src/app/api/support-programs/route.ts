import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const region = searchParams.get("region") || "";
    const category = searchParams.get("category") || "";
    const organizer = searchParams.get("organizer") || "";

    const whereClause: any = {};

    if (query) {
      whereClause.OR = [
        { title: { contains: query } },
        { organizer: { contains: query } },
        { targetDescription: { contains: query } },
      ];
    }

    if (region && region !== "전체") {
      whereClause.region = { contains: region };
    }

    if (category && category !== "전체") {
      whereClause.category = { contains: category };
    }

    if (organizer) {
      whereClause.organizer = { contains: organizer };
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
