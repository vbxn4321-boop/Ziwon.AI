import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { scrapeMissingAttachments } from "@/lib/parser/attachment-scraper";
import { verifyAdminRequest, logAdminAction } from "@/lib/auth/admin-guard";

export const maxDuration = 120; // 2분: 사전 스크래핑 워커와 동일한 배치 한도

/**
 * 한 번의 호출에서 스크래핑에 쓸 수 있는 시간 예산.
 * maxDuration(120초)에 닿으면 응답 자체가 잘려 결과를 못 돌려주므로,
 * 여유를 두고 멈춘 뒤 남은 건수를 알려준다. 클라이언트가 이어서 다음 라운드를 돈다.
 */
const TIME_BUDGET_MS = 95_000;

/** 원문 사이트 보호를 위한 공고 간 처리 텀 */
const THROTTLE_MS = 1500;

/**
 * 재적재가 필요한 SupportDocument 를 골라내는 조건.
 *
 * 1. `.zip.hwpx` 레거시 행 — 예전 확장자 판별 버그로 일반 ZIP 뒤에 강제로
 *    .hwpx 를 붙여 저장한 것. HWPX 뷰어에 넘어가 "지원하지 않는 포맷" 에러가 난다.
 * 2. entryPath 없이 방치된 `.zip` 행 — ZIP 압축을 못 풀어 내부 문서로
 *    쪼개지지 못한 채 통째로 PENDING 에 머무른 것 (본문 텍스트도 비어 있다).
 *
 * 둘 다 지금 파서로 다시 스크래핑하면 정상적으로 갈립니다: (1)은 ZIP 확장자를
 * 유지, (2)는 ZIP 내부 문서를 entryPath 로 분리해 저장합니다.
 */
function brokenZipWhere() {
  return {
    OR: [
      { fileName: { endsWith: ".zip.hwpx", mode: "insensitive" as const } },
      {
        fileName: { endsWith: ".zip", mode: "insensitive" as const },
        entryPath: null,
        OR: [{ extractedText: null }, { extractedText: "" }],
      },
    ],
  };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) return auth.response;

    // 손상된 문서가 속한 공고 단위로 묶는다 (공고 하나에 손상 문서가 여러 개일 수 있음)
    const brokenDocs = await prisma.supportDocument.findMany({
      where: brokenZipWhere(),
      select: { id: true, fileName: true, fileType: true, supportProgramId: true },
      orderBy: { createdAt: "desc" },
    });

    const programIds = [...new Set(brokenDocs.map((d) => d.supportProgramId))];
    const programs = await prisma.supportProgram.findMany({
      where: { id: { in: programIds } },
      include: { sources: true },
    });
    const programMap = new Map(programs.map((p) => [p.id, p]));

    const queue = programIds
      .map((id) => {
        const prog = programMap.get(id);
        const docs = brokenDocs.filter((d) => d.supportProgramId === id);
        return {
          id,
          title: prog?.title || "(삭제된 공고)",
          organizer: prog?.organizer || "",
          sourceUrl: prog?.sources[0]?.sourceUrl || null,
          brokenFileNames: docs.map((d) => d.fileName),
        };
      })
      .slice(0, 50);

    return NextResponse.json({
      success: true,
      data: {
        brokenDocCount: brokenDocs.length,
        programCount: programIds.length,
        queue,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch broken ZIP queue" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) return auth.response;

    const startedAt = Date.now();
    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Math.max(Number(body.limit) || 5, 1), 100);

    // 이미 시도한 공고는 제외한다. 재적재에 실패한 공고는 손상 상태가 그대로 남아
    // 다음 라운드에서도 조회되므로, 이 목록이 없으면 같은 공고를 무한히 다시 잡는다.
    const excludeProgramIds: string[] = Array.isArray(body.excludeProgramIds)
      ? body.excludeProgramIds.filter((id: unknown) => typeof id === "string").slice(0, 1000)
      : [];

    const brokenDocs = await prisma.supportDocument.findMany({
      where: brokenZipWhere(),
      select: { supportProgramId: true },
    });
    const allBrokenProgramIds = [...new Set(brokenDocs.map((d) => d.supportProgramId))].filter(
      (id) => !excludeProgramIds.includes(id)
    );
    const programIds = allBrokenProgramIds.slice(0, limit);

    if (programIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: "재적재가 필요한 손상된 ZIP 첨부파일이 없습니다.",
        data: { processedCount: 0, results: [], remaining: 0, stoppedEarly: false },
      });
    }

    const programs = await prisma.supportProgram.findMany({
      where: { id: { in: programIds } },
      include: { sources: true },
    });

    const results = [];

    for (let i = 0; i < programs.length; i++) {
      const prog = programs[i];
      const sourceUrl = prog.sources[0]?.sourceUrl;

      if (!sourceUrl) {
        results.push({ id: prog.id, title: prog.title, status: "SKIPPED", reason: "No source URL", docCount: 0 });
        continue;
      }

      try {
        console.log(`[Admin Reprocess-Broken-Zip]: (${i + 1}/${programs.length}) Processing '${prog.title}'...`);
        // scrapeMissingAttachments 는 해당 공고의 문서를 전부 지우고 새로 적재하므로
        // 손상된 ZIP 행뿐 아니라 정상 행도 최신 파서로 다시 검증된다.
        const docs = await scrapeMissingAttachments(prog.id, sourceUrl);
        results.push({
          id: prog.id,
          title: prog.title,
          status: docs.length > 0 ? "SUCCESS" : "NO_ATTACHMENTS_FOUND",
          docCount: docs.length,
          files: docs.map((d) => d.fileName),
        });
      } catch (err: any) {
        console.error(`[Admin Reprocess-Broken-Zip Error] Failed for ${prog.id}:`, err);
        results.push({ id: prog.id, title: prog.title, status: "FAILED", error: err.message, docCount: 0 });
      }

      // 서버리스 실행 시간이 바닥나기 전에 멈추고, 남은 건수를 응답에 담아 보낸다
      if (Date.now() - startedAt > TIME_BUDGET_MS) {
        console.log(
          "[Admin Reprocess-Broken-Zip]: 시간 예산 소진, " +
            (i + 1) + "/" + programs.length + " 처리 후 중단"
        );
        break;
      }

      // 원문 사이트 보호를 위한 순차 처리 텀 (사전 스크래핑 워커와 동일)
      if (i < programs.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, THROTTLE_MS));
      }
    }

    const successCount = results.filter((r) => r.status === "SUCCESS").length;
    const noDocCount = results.filter((r) => r.status === "NO_ATTACHMENTS_FOUND").length;
    const failedCount = results.filter((r) => r.status === "FAILED" || r.status === "SKIPPED").length;

    // 시간 예산으로 중간에 끊겼을 수 있으므로 실제 처리한 건수는 results 기준으로 센다
    const processedCount = results.length;
    const stoppedEarly = processedCount < programs.length;
    // 이번 라운드에서 손대지 않고 남은 손상 공고 수
    const remaining = allBrokenProgramIds.length - processedCount;

    const statusDetails = `총 ${processedCount}건 재적재 ➔ ${successCount}건 성공${
      noDocCount > 0 ? ` (원문 파일 없음: ${noDocCount}건)` : ""
    }${failedCount > 0 ? ` (오류: ${failedCount}건)` : ""}${
      remaining > 0 ? ` · 남은 공고 ${remaining}건` : ""
    }`;

    await logAdminAction(auth.user.email, "REPROCESS_BROKEN_ZIP", successCount, statusDetails);

    return NextResponse.json({
      success: true,
      message: statusDetails,
      data: {
        processedCount,
        successCount,
        noDocCount,
        failedCount,
        results,
        remaining,
        stoppedEarly,
        // 클라이언트가 다음 라운드에서 제외할 수 있도록 이번에 시도한 공고 ID 를 돌려준다
        processedProgramIds: results.map((r) => r.id),
      },
    });
  } catch (error: any) {
    console.error("[Admin Reprocess-Broken-Zip Batch Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Reprocess batch execution failed" },
      { status: 500 }
    );
  }
}
