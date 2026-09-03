/**
 * [실시간 동시 접속자 & 방문자 트래커]
 * 서버 인메모리 슬라이딩 윈도우 방식으로 최근 90초 이내에
 * 활동 신호(Heartbeat)를 보낸 고유 세션을 카운팅합니다.
 */

interface SessionEntry {
  lastSeen: number;
  path: string;
  isUser: boolean;
}

// Global scope preserve across Next.js dev reloads
declare global {
  var __ziwonActiveSessions: Map<string, SessionEntry> | undefined;
  var __ziwonTodayVisitors: Set<string> | undefined;
  var __ziwonTodayDate: string | undefined;
}

const activeSessions: Map<string, SessionEntry> =
  globalThis.__ziwonActiveSessions || (globalThis.__ziwonActiveSessions = new Map());

const todayVisitors: Set<string> =
  globalThis.__ziwonTodayVisitors || (globalThis.__ziwonTodayVisitors = new Set());

function checkDayReset() {
  const todayStr = new Date().toISOString().slice(0, 10);
  if (globalThis.__ziwonTodayDate !== todayStr) {
    globalThis.__ziwonTodayDate = todayStr;
    todayVisitors.clear();
  }
}

/**
 * 브라우저로부터의 심장박동(Heartbeat) 신호 기록
 */
export function recordHeartbeat(sessionId: string, path: string = "/", isUser: boolean = false) {
  if (!sessionId) return;
  checkDayReset();

  const now = Date.now();
  activeSessions.set(sessionId, {
    lastSeen: now,
    path,
    isUser,
  });

  todayVisitors.add(sessionId);
}

/**
 * 최근 90초 이내에 활성화된 고유 이용자 수 계산 (만료된 세션 자동 청소)
 */
export function getActiveUsersStats(windowSeconds = 90) {
  checkDayReset();
  const now = Date.now();
  const cutoff = now - windowSeconds * 1000;

  // Cleanup expired sessions
  for (const [id, entry] of activeSessions.entries()) {
    if (entry.lastSeen < cutoff) {
      activeSessions.delete(id);
    }
  }

  let userCount = 0;
  let guestCount = 0;
  const pathMap: Record<string, number> = {};

  for (const entry of activeSessions.values()) {
    if (entry.isUser) userCount++;
    else guestCount++;

    const basePage = entry.path.split("?")[0] || "/";
    pathMap[basePage] = (pathMap[basePage] || 0) + 1;
  }

  return {
    activeUsersNow: activeSessions.size,
    loggedInUsers: userCount,
    guestUsers: guestCount,
    todayVisitors: todayVisitors.size,
    activePages: pathMap,
  };
}
