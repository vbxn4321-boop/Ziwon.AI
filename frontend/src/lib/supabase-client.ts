import { createClient } from "@supabase/supabase-js";
import {
  getInMemoryToken,
  setInMemoryAuth,
  clearInMemoryAuth,
  performSilentRefresh,
} from "./auth-store";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dwyugsqiocpnycwzuxsk.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * [보안 표준] 인메모리 Access Token 반환 (없으면 HttpOnly 쿠키 기반 무음 자동 갱신)
 */
export async function getJwtToken(): Promise<string | null> {
  // 1. 메모리에 유효한 Access Token이 있는지 확인
  const inMem = getInMemoryToken();
  if (inMem) return inMem;

  // 2. 없으면 HttpOnly 쿠키를 이용해 백그라운드 Silent Refresh 시도
  if (typeof window !== "undefined") {
    const refreshed = await performSilentRefresh();
    if (refreshed) return refreshed;
  }

  // 3. Supabase OAuth 세션 확인 (소셜 로그인용)
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch {
    return null;
  }
}

/**
 * Refresh Token은 HttpOnly 쿠키로 보호되므로 JS에서 직접 조회할 수 없습니다.
 */
export function getRefreshToken(): string | null {
  return null;
}

/**
 * 로그인/회원가입 성공 시 메모리에 인증 정보 저장
 */
export function saveLocalAuth(token: string, user: any, _refreshToken?: string | null, rememberMe: boolean = true) {
  setInMemoryAuth(token, user, rememberMe);
}

/**
 * 로그아웃 시 메모리 인증 정보 초기화
 */
export function clearLocalAuth() {
  clearInMemoryAuth();
}


