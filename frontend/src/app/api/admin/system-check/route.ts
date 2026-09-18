import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAdminRequest } from "@/lib/auth/admin-guard";

export const runtime = "nodejs";
export const maxDuration = 15;

type CheckResult = { name: string; status: "PASS" | "WARN" | "FAIL"; detail: string; durationMs: number };

async function runCheck(name: string, fn: () => Promise<{ status: CheckResult["status"]; detail: string }>): Promise<CheckResult> {
  const started = performance.now();
  try {
    const result = await fn();
    return { name, ...result, durationMs: Math.round(performance.now() - started) };
  } catch (error) {
    return { name, status: "FAIL", detail: error instanceof Error ? error.message : "검사 중 오류가 발생했습니다.", durationMs: Math.round(performance.now() - started) };
  }
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) return auth.response;

  const checks = await Promise.all([
    runCheck("데이터베이스 연결", async () => {
      await prisma.$queryRaw`SELECT 1`;
      return { status: "PASS", detail: "Prisma 연결 및 기본 쿼리 정상" };
    }),
    runCheck("지원사업 데이터", async () => {
      const [programs, documents] = await Promise.all([
        prisma.supportProgram.count(),
        prisma.supportDocument.count(),
      ]);
      return programs > 0
        ? { status: "PASS", detail: `공고 ${programs.toLocaleString()}건, 첨부문서 ${documents.toLocaleString()}건` }
        : { status: "WARN", detail: "지원사업 데이터가 없습니다." };
    }),
    runCheck("문서 처리 대기열", async () => {
      const pending = await prisma.supportDocument.count({ where: { status: "PENDING" } });
      return pending > 1000
        ? { status: "WARN", detail: `처리 대기 문서 ${pending.toLocaleString()}건` }
        : { status: "PASS", detail: `처리 대기 문서 ${pending.toLocaleString()}건` };
    }),
    runCheck("필수 환경설정", async () => {
      const required = ["DATABASE_URL", "JWT_SECRET"];
      const missing = required.filter((key) => !process.env[key]);
      return missing.length
        ? { status: "FAIL", detail: `누락: ${missing.join(", ")}` }
        : { status: "PASS", detail: "DATABASE_URL, JWT_SECRET 설정됨" };
    }),
    runCheck("FastAPI 백엔드", async () => {
      const base = process.env.BACKEND_API_URL;
      if (!base) return { status: "WARN", detail: "BACKEND_API_URL이 설정되지 않았습니다." };
      const response = await fetch(`${base.replace(/\/$/, "")}/health`, { signal: AbortSignal.timeout(4000), cache: "no-store" });
      return response.ok
        ? { status: "PASS", detail: `백엔드 응답 ${response.status}` }
        : { status: "FAIL", detail: `백엔드 응답 ${response.status}` };
    }),
  ]);

  const failed = checks.filter((check) => check.status === "FAIL").length;
  const warnings = checks.filter((check) => check.status === "WARN").length;
  return NextResponse.json({
    success: true,
    data: { checkedAt: new Date().toISOString(), checks, summary: { total: checks.length, failed, warnings, passed: checks.length - failed - warnings } },
  });
}
