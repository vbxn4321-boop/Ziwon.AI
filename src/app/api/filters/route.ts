import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const programs = await prisma.supportProgram.findMany({
      select: {
        category: true,
        region: true,
        organizer: true,
      },
    });

    const totalCount = programs.length;

    // Count occurrences for Categories, Regions, and Organizers
    const categoryCounts: Record<string, number> = {};
    const regionCounts: Record<string, number> = {};
    const organizerCounts: Record<string, number> = {};

    programs.forEach((p) => {
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
      data: {
        categories: [{ name: "전체", count: 0 }],
        regions: [{ name: "전체", count: 0 }],
        organizers: [{ name: "전체", count: 0 }],
      },
    });
  }
}
