/**
 * SupportDocument.status 의 잘못된 'READY' 값을 정리합니다.
 *
 *   확인만 (기본):  npx tsx scripts/backfill-ready-status.ts
 *   실제 적용:      npx tsx scripts/backfill-ready-status.ts --apply
 *   되돌리기:       npx tsx scripts/backfill-ready-status.ts --rollback
 *
 * 배경:
 *   backend/app/services/scraper_service.py 가 문서를 저장할 때 status 를 'READY' 로
 *   넣고 있었습니다. 스키마가 정의한 값은 PENDING / PARSED / FAILED 뿐이고,
 *   후속 분석 파이프라인은 where status = 'PENDING' 으로 대상을 고릅니다.
 *   그래서 파이썬이 수집한 문서는 어느 쪽에도 잡히지 않고 방치되어 있었습니다.
 *   (파이썬 쪽 코드는 이미 수정했고, 이 스크립트는 남아 있는 기존 행을 정리합니다.)
 *
 * 판정 기준은 Next.js attachment-scraper 와 동일합니다:
 *   본문 50자 초과 -> PARSED (추출 성공)
 *   그 외          -> PENDING (파이프라인이 재시도)
 */

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient({ log: ["error"] });
const SNAPSHOT = path.join(process.cwd(), "ready-status-rollback.json");

const apply = process.argv.includes("--apply");
const rollback = process.argv.includes("--rollback");

async function doRollback() {
  if (!fs.existsSync(SNAPSHOT)) {
    console.error(`롤백 스냅샷이 없습니다: ${SNAPSHOT}`);
    process.exit(1);
  }
  const snap = JSON.parse(fs.readFileSync(SNAPSHOT, "utf-8")) as {
    takenAt: string;
    ids: string[];
  };
  console.log(`스냅샷 ${snap.takenAt} 기준 ${snap.ids.length}건을 'READY' 로 되돌립니다.`);
  const res = await prisma.supportDocument.updateMany({
    where: { id: { in: snap.ids } },
    data: { status: "READY" },
  });
  console.log(`  복원 완료: ${res.count}건`);
}

async function main() {
  if (rollback) {
    await doRollback();
    return;
  }

  const docs = await prisma.supportDocument.findMany({
    where: { status: "READY" },
    select: { id: true, fileName: true, extractedText: true },
  });

  if (docs.length === 0) {
    console.log("정리할 'READY' 문서가 없습니다.");
    return;
  }

  const toParsed = docs.filter((d) => (d.extractedText?.length ?? 0) > 50);
  const toPending = docs.filter((d) => (d.extractedText?.length ?? 0) <= 50);

  console.log(`'READY' 문서 ${docs.length}건 발견`);
  console.log(`  -> PARSED  ${toParsed.length}건 (본문 추출 성공)`);
  console.log(`  -> PENDING ${toPending.length}건 (재처리 대상)`);

  if (!apply) {
    console.log("\n[확인 모드] 실제로 적용하려면 --apply 를 붙여 다시 실행하세요.");
    return;
  }

  // 되돌릴 수 있도록 현재 대상 목록을 먼저 저장
  fs.writeFileSync(
    SNAPSHOT,
    JSON.stringify(
      { takenAt: new Date().toISOString(), previousStatus: "READY", ids: docs.map((d) => d.id) },
      null,
      2
    )
  );
  console.log(`\n롤백 스냅샷 저장: ${SNAPSHOT}`);

  const r1 = await prisma.supportDocument.updateMany({
    where: { id: { in: toParsed.map((d) => d.id) } },
    data: { status: "PARSED" },
  });
  const r2 = await prisma.supportDocument.updateMany({
    where: { id: { in: toPending.map((d) => d.id) } },
    data: { status: "PENDING" },
  });
  console.log(`적용 완료: PARSED ${r1.count}건, PENDING ${r2.count}건`);

  const after = await prisma.supportDocument.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  console.log("\n적용 후 분포:");
  for (const row of after) {
    console.log(`  ${row.status.padEnd(10)} ${row._count._all}건`);
  }
}

main()
  .catch((e) => {
    console.error("실패:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
