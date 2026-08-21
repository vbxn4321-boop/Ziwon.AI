import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const programs = await prisma.supportProgram.findMany({
      select: {
        category: true,
        region: true,
        organizer: true,
        createdAt: true,
        endDate: true,
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

    programs.forEach((p) => {
      // 1. Live Briefing Stats
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

      // 2. Filters
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
    });

    // Convert to sorted object array with counts
    const categories = [
      { name: "전체", count: totalCount },
      ...Object.entries(categoryCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
    ];

    const regions = [
      { name: "전체", count: totalCount },
      ...Object.entries(regionCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
    ];

    const organizers = [
      { name: "전체", count: totalCount },
      ...Object.entries(organizerCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
    ];

    return NextResponse.json({
      success: true,
      totalCount,
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
    });
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
