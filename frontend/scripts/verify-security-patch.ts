/**
 * Phase 1 보안 패치 검증 스크립트.
 *
 *   npx tsx scripts/verify-security-patch.ts
 *
 * 실제 공격 페이로드를 만들어 차단되는지 확인합니다.
 * 네트워크가 필요한 항목은 실패해도 전체를 실패시키지 않고 SKIP 으로 표시합니다.
 */

import crypto from "crypto";
import { verifyAccessToken } from "../src/lib/auth/verify-token";
import { assertUrlIsSafe, BlockedUrlError } from "../src/lib/security/safe-fetch";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-for-verification-only-32b";
const SECRET = process.env.JWT_SECRET;

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    console.log(`  PASS  ${name}`);
    passed++;
  } else {
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

function b64(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

function sign(header: string, payload: string, secret = SECRET): string {
  return crypto.createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
}

function makeToken(payload: Record<string, unknown>, secret = SECRET): string {
  const h = b64({ alg: "HS256", typ: "JWT" });
  const p = b64(payload);
  return `${h}.${p}.${sign(h, p, secret)}`;
}

const future = Math.floor(Date.now() / 1000) + 3600;
const past = Math.floor(Date.now() / 1000) - 10;

function runJwtChecks() {
  console.log("\n[1] JWT 검증 — 관리자 인증 우회 차단");

  check(
    "정상 access 토큰은 통과",
    verifyAccessToken(makeToken({ sub: "u1", type: "access", exp: future })).valid
  );

  // 실제 취약점: 서명 없이 Supabase 토큰인 척하던 페이로드
  const forgedHeader = b64({ alg: "HS256", typ: "JWT" });
  const forgedPayload = b64({
    sub: "attacker",
    aud: "authenticated",
    email: "admin@example.com",
    exp: future,
  });

  check(
    "위조 Supabase 토큰(aud=authenticated, 서명 없음) 거부",
    !verifyAccessToken(`${forgedHeader}.${forgedPayload}.anysignaturehere`).valid
  );

  check(
    "iss=supabase 위조 토큰 거부",
    !verifyAccessToken(
      `${forgedHeader}.${b64({ sub: "x", iss: "https://x.supabase.co", exp: future })}.zzz`
    ).valid
  );

  check(
    "refresh 토큰을 access 자리에 쓰면 거부",
    !verifyAccessToken(makeToken({ sub: "u1", type: "refresh", exp: future })).valid
  );

  check(
    "만료된 토큰 거부",
    !verifyAccessToken(makeToken({ sub: "u1", type: "access", exp: past })).valid
  );

  check(
    "다른 시크릿으로 서명한 토큰 거부",
    !verifyAccessToken(makeToken({ sub: "u1", type: "access", exp: future }, "wrong-secret")).valid
  );

  // timingSafeEqual 길이 불일치 크래시 회귀 방지
  let threw = false;
  let shortSigAccepted = true;
  try {
    shortSigAccepted = verifyAccessToken(`${forgedHeader}.${forgedPayload}.x`).valid;
  } catch {
    threw = true;
  }
  check(
    "짧은 서명이 예외를 던지지 않고 거부됨",
    !threw && !shortSigAccepted,
    threw ? "예외 발생(timingSafeEqual 길이 불일치)" : ""
  );

  check("점 3개가 아닌 토큰 거부", !verifyAccessToken("not.a.valid.jwt.at.all").valid);
  check("빈 문자열 거부", !verifyAccessToken("").valid);
}

async function expectBlocked(url: string, label: string) {
  try {
    await assertUrlIsSafe(url);
    check(label, false, "통과되어 버림");
  } catch (e) {
    check(label, e instanceof BlockedUrlError, `예상 밖 예외: ${(e as Error).message}`);
  }
}

async function runSsrfChecks() {
  console.log("\n[2] SSRF — 내부망 목적지 차단");

  await expectBlocked("http://169.254.169.254/latest/meta-data/", "클라우드 메타데이터(169.254.169.254)");
  await expectBlocked("http://127.0.0.1:8000/admin", "루프백(127.0.0.1)");
  await expectBlocked("http://localhost:3000/", "localhost");
  await expectBlocked("http://10.0.0.5/internal", "사설 대역 10/8");
  await expectBlocked("http://192.168.1.1/", "사설 대역 192.168/16");
  await expectBlocked("http://172.16.0.1/", "사설 대역 172.16/12");
  await expectBlocked("http://[::1]/", "IPv6 루프백");
  await expectBlocked("http://[::ffff:169.254.169.254]/", "IPv4 매핑 IPv6 우회");
  await expectBlocked("file:///etc/passwd", "file:// 프로토콜");
  await expectBlocked("gopher://127.0.0.1:6379/_INFO", "gopher:// 프로토콜");
  await expectBlocked("http://0.0.0.0/", "0.0.0.0");

  // 정상 공고 도메인은 통과해야 합니다 (네트워크 필요)
  try {
    await assertUrlIsSafe("https://www.bizinfo.go.kr/");
    check("정상 공고 도메인(bizinfo.go.kr) 통과", true);
  } catch (e) {
    console.log(`  SKIP  정상 도메인 확인 (DNS 불가: ${(e as Error).message})`);
  }
}

async function main() {
  runJwtChecks();
  await runSsrfChecks();
  console.log(`\n결과: ${passed}건 통과, ${failed}건 실패\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
