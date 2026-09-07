/**
 * [보안 표준] In-Memory Auth & Silent Refresh Store
 * 
 * - Access Token: 브라우저 JS 메모리 변수에만 보관 (XSS 완전 차단)
 * - Refresh Token: HttpOnly, Secure, SameSite=Lax 쿠키로 관리 (JS 접근 불가)
 * - 동시성 제어: 여러 API가 동시 401을 발생시켜도 Refresh 요청은 단 1회만 수행(Promise Deduplication)
 */

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

let inMemoryAccessToken: string | null = null;
let inMemoryUser: AuthUser | null = null;
let refreshPromise: Promise<string | null> | null = null;
let lastRefreshFailedAt = 0; // Cooldown for failed refresh attempts (5 seconds)
let isInitialized = false;

// 레거시 localStorage 토큰 잔재 안전 정리 (최초 1회 실행)
function cleanupLegacyLocalStorage() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("ziwon_auth_token");
    localStorage.removeItem("ziwon_refresh_token");
  } catch {}
}

/**
 * Access Token 및 사용자 정보를 메모리에 저장 (Remember Me에 따라 캐시 위치 분기)
 */
export function setInMemoryAuth(accessToken: string | null, user: AuthUser | null, rememberMe: boolean = true) {
  const prevToken = inMemoryAccessToken;
  const prevUserId = inMemoryUser?.id || inMemoryUser?.email || null;
  const newUserId = user?.id || user?.email || null;
  const hasChanged = prevToken !== accessToken || prevUserId !== newUserId;

  inMemoryAccessToken = accessToken;
  inMemoryUser = user;
  cleanupLegacyLocalStorage();

  if (typeof window !== "undefined") {
    if (user) {
      try {
        if (rememberMe) {
          localStorage.setItem("ziwon_auth_user", JSON.stringify(user));
          sessionStorage.removeItem("ziwon_auth_user");
        } else {
          sessionStorage.setItem("ziwon_auth_user", JSON.stringify(user));
          localStorage.removeItem("ziwon_auth_user");
        }
      } catch {}
    } else {
      try {
        localStorage.removeItem("ziwon_auth_user");
        sessionStorage.removeItem("ziwon_auth_user");
      } catch {}
    }

    // 유저/토큰 상태가 실제로 바뀌었을 때만 이벤트를 쏴서 무한 재호출 방지
    if (hasChanged) {
      window.dispatchEvent(new CustomEvent("ziwon_auth_change", { detail: { user } }));
    }
  }
}

/**
 * 현재 메모리에 있는 Access Token 반환
 */
export function getInMemoryToken(): string | null {
  return inMemoryAccessToken;
}

/**
 * 현재 메모리에 있는 사용자 정보 반환 (sessionStorage -> localStorage 순으로 안전 조회)
 */
export function getInMemoryUser(): AuthUser | null {
  if (inMemoryUser) return inMemoryUser;
  if (typeof window !== "undefined") {
    try {
      const sessionCached = sessionStorage.getItem("ziwon_auth_user");
      if (sessionCached) {
        inMemoryUser = JSON.parse(sessionCached);
        return inMemoryUser;
      }
      const localCached = localStorage.getItem("ziwon_auth_user");
      if (localCached) {
        inMemoryUser = JSON.parse(localCached);
        return inMemoryUser;
      }
    } catch {}
  }
  return null;
}

/**
 * 메모리 인증 정보 초기화
 */
export function clearInMemoryAuth() {
  setInMemoryAuth(null, null, false);
}

/**
 * HttpOnly 쿠키를 이용한 Silent Refresh (무음 토큰 재발급)
 * - Promise Deduplication: 진행 중인 갱신 요청이 있으면 동일 Promise를 반환하여 중복 요청 방지
 * - Failure Cooldown: 실패 시 5초간 재호출을 막아 401 네트워크 폭풍 방지
 */
export async function performSilentRefresh(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  // 토큰 갱신 실패 시 5초 동안은 서버로 다시 POST /api/auth를 쏘지 않고 즉시 반환하여 401 네트워크 폭풍 방지
  if (Date.now() - lastRefreshFailedAt < 5000) {
    return null;
  }

  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // HttpOnly 쿠키(ziwon_refresh_token) 자동 전송
        body: JSON.stringify({ action: "refresh" }),
      });

      if (!res.ok) {
        lastRefreshFailedAt = Date.now();
        // Refresh token 만료 또는 부재 -> 메모리 및 UI 상태 초기화
        clearInMemoryAuth();
        return null;
      }

      const data = await res.json();
      if (data.accessToken) {
        lastRefreshFailedAt = 0;
        const updatedUser = data.user || inMemoryUser;
        setInMemoryAuth(data.accessToken, updatedUser);
        return data.accessToken;
      }

      lastRefreshFailedAt = Date.now();
      clearInMemoryAuth();
      return null;
    } catch (err) {
      lastRefreshFailedAt = Date.now();
      console.warn("[AuthStore] Silent Refresh 실패:", err);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * 앱 마운트 시 최초 세션 복원 초기화
 */
export async function initAuthStore(): Promise<AuthUser | null> {
  if (isInitialized && inMemoryAccessToken) return inMemoryUser;
  cleanupLegacyLocalStorage();
  isInitialized = true;

  const token = await performSilentRefresh();
  if (token) {
    return inMemoryUser;
  }
  return null;
}
