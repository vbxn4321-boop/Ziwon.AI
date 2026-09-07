/**
 * SSRF 방어용 서버 사이드 fetch 래퍼.
 *
 * 왜 호스트명 화이트리스트가 아닌가:
 *   공고 첨부파일 URL은 attachment-scraper 가 공고 원문 페이지의 origin 기준으로
 *   절대화합니다(toAbsoluteUrl). 기업마당 공고는 지자체·테크노파크·진흥원 등
 *   외부 기관 사이트로 링크가 나가므로 fileUrl 의 도메인은 사실상 열려 있습니다.
 *   몇 개 도메인만 허용하면 정상 첨부 상당수가 함께 막힙니다.
 *
 * 그래서 "어느 도메인인가"가 아니라 "어느 IP로 나가는가"를 막습니다.
 * 공인 IP로 나가는 요청은 전부 통과시키고, 내부망·루프백·링크로컬(클라우드
 * 메타데이터 포함)로 향하는 요청만 거부합니다. 리다이렉트는 수동으로 따라가며
 * 홉마다 다시 검사합니다 — 허용된 도메인이 302 로 내부 IP를 가리키는 우회를
 * 막기 위해서입니다.
 *
 * 남는 위험: DNS 리바인딩(검사 시점과 연결 시점 사이에 응답이 바뀌는 경우)은
 * 이 방식으로 완전히 막히지 않습니다. 완전 차단은 검증된 IP로 직접 소켓을 열고
 * Host 헤더를 붙이는 커스텀 agent 가 필요합니다. 실용적 공격 경로는 아래 검사로
 * 차단되지만, 이 한계는 알고 쓰는 편이 낫습니다.
 */

import dns from "dns";

export class BlockedUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BlockedUrlError";
  }
}

/** 점 표기 IPv4 문자열을 32비트 정수로. 형식이 아니면 null. */
function ipv4ToInt(address: string): number | null {
  const parts = address.split(".");
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    value = value * 256 + octet;
  }
  return value >>> 0;
}

/** CIDR 표기의 차단 대역. 공인 인터넷이 아닌 모든 것. */
const BLOCKED_V4_CIDRS: ReadonlyArray<[string, number]> = [
  ["0.0.0.0", 8], // 현재 네트워크
  ["10.0.0.0", 8], // 사설
  ["100.64.0.0", 10], // CGNAT
  ["127.0.0.0", 8], // 루프백
  ["169.254.0.0", 16], // 링크로컬 — 클라우드 메타데이터(169.254.169.254)
  ["172.16.0.0", 12], // 사설
  ["192.0.0.0", 24], // IETF 프로토콜 할당
  ["192.0.2.0", 24], // TEST-NET-1
  ["192.168.0.0", 16], // 사설
  ["198.18.0.0", 15], // 벤치마크
  ["198.51.100.0", 24], // TEST-NET-2
  ["203.0.113.0", 24], // TEST-NET-3
  ["224.0.0.0", 4], // 멀티캐스트
  ["240.0.0.0", 4], // 예약 + 브로드캐스트
];

function isBlockedIpv4(address: string): boolean {
  const value = ipv4ToInt(address);
  if (value === null) return true; // 파싱 불가 = 거부
  for (const [network, bits] of BLOCKED_V4_CIDRS) {
    const base = ipv4ToInt(network);
    if (base === null) continue;
    // bits=0 인 경우 <<32 는 정의되지 않으므로 별도 처리(현재 목록엔 없음)
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    if ((value & mask) >>> 0 === (base & mask) >>> 0) return true;
  }
  return false;
}

function isBlockedIpv6(address: string): boolean {
  const addr = address.toLowerCase().split("%")[0]; // 존 인덱스 제거

  // IPv4 매핑/변환 주소는 내장된 v4 주소로 판정 (::ffff:169.254.169.254 우회 차단)
  const embedded = addr.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (embedded) return isBlockedIpv4(embedded[1]);

  if (addr === "::" || addr === "::1") return true;
  if (addr.startsWith("::ffff:")) return true; // 16진 표기의 v4 매핑
  if (addr.startsWith("64:ff9b:")) return true; // NAT64
  if (addr.startsWith("2002:")) return true; // 6to4 — 내장 v4 검증이 어려워 차단

  const head = parseInt(addr.split(":")[0] || "0", 16);
  if (Number.isNaN(head)) return true;
  if ((head & 0xfe00) === 0xfc00) return true; // fc00::/7 ULA
  if ((head & 0xffc0) === 0xfe80) return true; // fe80::/10 링크로컬
  if ((head & 0xff00) === 0xff00) return true; // ff00::/8 멀티캐스트

  return false;
}

/**
 * URL 을 검증합니다. 통과하지 못하면 BlockedUrlError 를 던집니다.
 */
export async function assertUrlIsSafe(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new BlockedUrlError("올바른 URL 형식이 아닙니다.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    // file:, ftp:, gopher:, data: 등 차단
    throw new BlockedUrlError(`허용되지 않은 프로토콜입니다: ${url.protocol}`);
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, ""); // IPv6 리터럴 대괄호 제거
  if (!hostname) {
    throw new BlockedUrlError("호스트명이 없습니다.");
  }

  let resolved: dns.LookupAddress[];
  try {
    resolved = await dns.promises.lookup(hostname, { all: true });
  } catch {
    throw new BlockedUrlError(`호스트명을 확인할 수 없습니다: ${hostname}`);
  }

  if (resolved.length === 0) {
    throw new BlockedUrlError(`호스트명을 확인할 수 없습니다: ${hostname}`);
  }

  // 하나라도 내부 주소로 해석되면 거부 (라운드로빈으로 우회하는 것을 막음)
  for (const { address, family } of resolved) {
    const blocked = family === 6 ? isBlockedIpv6(address) : isBlockedIpv4(address);
    if (blocked) {
      throw new BlockedUrlError(
        `내부 네트워크 주소로 향하는 요청은 차단됩니다. (${hostname})`
      );
    }
  }

  return url;
}

export interface SafeFetchOptions extends Omit<RequestInit, "redirect"> {
  /** 따라갈 리다이렉트 최대 횟수. 기본 5. */
  maxRedirects?: number;
}

/**
 * 매 홉마다 목적지를 재검증하면서 리다이렉트를 수동으로 따라가는 fetch.
 */
export async function safeFetch(
  rawUrl: string,
  options: SafeFetchOptions = {}
): Promise<Response> {
  const { maxRedirects = 5, ...init } = options;

  let currentUrl = rawUrl;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const validated = await assertUrlIsSafe(currentUrl);

    const response = await fetch(validated.toString(), {
      ...init,
      redirect: "manual",
    });

    const isRedirect =
      response.status >= 300 && response.status < 400 && response.headers.has("location");

    if (!isRedirect) {
      return response;
    }

    const location = response.headers.get("location") as string;
    // 상대 경로 Location 도 처리
    currentUrl = new URL(location, validated).toString();
  }

  throw new BlockedUrlError(`리다이렉트가 ${maxRedirects}회를 초과했습니다.`);
}
