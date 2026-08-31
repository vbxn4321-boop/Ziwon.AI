import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const onlyClosed = searchParams.get("onlyClosed") === "true";
    const statusMode = searchParams.get("statusMode") || (onlyClosed ? "closed" : "active");
    const source = searchParams.get("source") || "";
    const timeFilter = searchParams.get("timeFilter") || "all";

    const programs = await prisma.supportProgram.findMany({
      select: {
        category: true,
        region: true,
        organizer: true,
        createdAt: true,
        endDate: true,
        sources: {
          select: {
            sourceType: true,
          },
        },
      },
    });

    const totalCount = programs.length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const sevenDaysLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    sevenDaysLater.setHours(23, 59, 59, 999);

    let todayCount = 0;
    let recentCount = 0;
    let urgentCount = 0;
    let activeCount = 0;

    // Count occurrences for Categories, Regions, and Organizers
    const categoryCounts: Record<string, number> = {};
    const regionCounts: Record<string, number> = {};
    const organizerCounts: Record<string, number> = {};

    let targetCount = 0;

    programs.forEach((p) => {
      // 1. Live Briefing Stats (전체 DB 기준)
      const createdAt = new Date(p.createdAt);
      if (createdAt >= oneDayAgo) {
        todayCount++;
      }
      if (createdAt >= threeDaysAgo) {
        recentCount++;
      }

      const isOngoing = !p.endDate || new Date(p.endDate) >= today;
      if (isOngoing) {
        activeCount++;
        if (p.endDate && new Date(p.endDate) <= sevenDaysLater) {
          urgentCount++;
        }
      }

      // 2. 현재 상태(진행 중 vs 마감) 및 포털 출처에 부합하는지 판정
      let matchesStatus = false;
      if (statusMode === "closed") {
        matchesStatus = Boolean(p.endDate && new Date(p.endDate) < today);
      } else if (statusMode === "active") {
        matchesStatus = isOngoing;
      } else {
        matchesStatus = true;
      }

      let matchesSource = true;
      if (source && source !== "all" && source !== "ALL") {
        matchesSource = p.sources?.some((s) => s.sourceType === source) ?? false;
      }

      // 3. 상단 시간 필터(오늘 신규, 최근 3일, 마감임박, 전체) 일치 판정
      let matchesTime = true;
      if (timeFilter === "today") {
        matchesTime = createdAt >= oneDayAgo;
      } else if (timeFilter === "recent") {
        matchesTime = createdAt >= threeDaysAgo;
      } else if (timeFilter === "urgent") {
        matchesTime = isOngoing && Boolean(p.endDate && new Date(p.endDate) <= sevenDaysLater);
      }

      // 4. 필터 칩 개수는 사용자가 선택한 상단 조건(상태, 출처, 시간범위)과 완벽히 동기화
      if (matchesStatus && matchesSource && matchesTime) {
        targetCount++;
        if (p.category) {
          const cat = p.category.trim();
          categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        }
        if (p.region) {
          const reg = p.region.trim();
          regionCounts[reg] = (regionCounts[reg] || 0) + 1;
        }
        if (p.organizer) {
          const org = p.organizer.trim();
          organizerCounts[org] = (organizerCounts[org] || 0) + 1;
        }
      }
    });

    // Convert to sorted object array with counts
    const categories = [
      { name: "전체", count: targetCount },
      ...Object.entries(categoryCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
    ];

    const regions = [
      { name: "전체", count: targetCount },
      ...Object.entries(regionCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
    ];

    const organizers = [
      { name: "전체", count: targetCount },
      ...Object.entries(organizerCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
    ];

    return NextResponse.json(
      {
        success: true,
        totalCount,
        targetCount,
        stats: {
          totalCount,
          activeCount,
          todayCount,
          recentCount,
          urgentCount,
        },
        data: {
          categories,
          regions,
          organizers,
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        },
      }
    );
  } catch (error: any) {
    console.error("API /api/filters Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch dynamic DB filters",
      details: String(error),
      stats: {
        totalCount: 0,
        activeCount: 0,
        todayCount: 0,
        recentCount: 0,
        urgentCount: 0,
      },
      data: {
        categories: [{ name: "전체", count: 0 }],
        regions: [{ name: "전체", count: 0 }],
        organizers: [{ name: "전체", count: 0 }],
      },
    });
  }
}
