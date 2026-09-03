import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActiveUsersStats } from "@/lib/telemetry/active-user-tracker";
import { verifyAdminRequest } from "@/lib/auth/admin-guard";

export async function GET(req: NextRequest) {
  try {
    // [보안 1순위] 최고 관리자 권한 서버단 철저 검증
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) {
      return auth.response;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 0. Real-time Active Users & User Metrics
    const userTelemetry = getActiveUsersStats(90);
    const totalUsers = await prisma.user.count();
    const totalCompanies = await prisma.company.count();
    const totalSavedPlans = await prisma.savedPsstPlan.count();

    // 1. Total programs
    const totalPrograms = await prisma.supportProgram.count();

    // 2. Active vs Closed programs
    const activePrograms = await prisma.supportProgram.count({
      where: {
        OR: [{ endDate: null }, { endDate: { gte: today } }],
      },
    });

    // 3. Source counts
    const bizinfoCount = await prisma.supportSource.count({
      where: { sourceType: "BIZINFO" },
    });
    const kstartupCount = await prisma.supportSource.count({
      where: { sourceType: "K_STARTUP" },
    });

    // 4. Programs with dual sources (Merged)
    const dualSourcePrograms = await prisma.supportProgram.findMany({
      where: {
        AND: [
          { sources: { some: { sourceType: "BIZINFO" } } },
          { sources: { some: { sourceType: "K_STARTUP" } } },
        ],
      },
      include: {
        sources: true,
        documents: true,
      },
      take: 20,
    });

    const mergedCount = await prisma.supportProgram.count({
      where: {
        AND: [
          { sources: { some: { sourceType: "BIZINFO" } } },
          { sources: { some: { sourceType: "K_STARTUP" } } },
        ],
      },
    });

    // 5. Document pre-scraping stats
    const programsWithDocs = await prisma.supportProgram.count({
      where: {
        documents: { some: {} },
      },
    });

    const activeProgramsWithDocs = await prisma.supportProgram.count({
      where: {
        OR: [{ endDate: null }, { endDate: { gte: today } }],
        documents: { some: {} },
      },
    });

    const activeProgramsMissingDocs = activePrograms - activeProgramsWithDocs;

    // 6. Recent Crawl Logs
    const crawlLogs = await prisma.crawlLog.findMany({
      orderBy: { executedAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      data: {
        userStats: {
          activeUsersNow: userTelemetry.activeUsersNow,
          loggedInUsers: userTelemetry.loggedInUsers,
          guestUsers: userTelemetry.guestUsers,
          todayVisitors: userTelemetry.todayVisitors,
          totalUsers,
          totalCompanies,
          totalSavedPlans,
          activePages: userTelemetry.activePages,
        },
        totalPrograms,
        activePrograms,
        bizinfoCount,
        kstartupCount,
        mergedCount,
        programsWithDocs,
        activeProgramsWithDocs,
        activeProgramsMissingDocs,
        dualSourcePrograms: dualSourcePrograms.map((p) => ({
          id: p.id,
          title: p.title,
          organizer: p.organizer,
          endDate: p.endDate,
          docCount: p.documents.length,
          sources: p.sources.map((s) => ({
            type: s.sourceType,
            url: s.sourceUrl,
            rawTitle: s.rawTitle,
          })),
        })),
        crawlLogs: crawlLogs.map((l) => ({
          id: l.id,
          sourceType: l.sourceType,
          status: l.status,
          itemCount: l.itemCount,
          executedAt: l.executedAt,
        })),
      },
    });
  } catch (error: any) {
    console.error("[Admin Stats API Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load admin stats" },
      { status: 500 }
    );
  }
}
