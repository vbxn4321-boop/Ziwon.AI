import { getJwtToken } from "@/lib/supabase-client";

const BACKEND_BASE_URL =
  typeof window !== "undefined"
    ? "/api/backend-proxy"
    : process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_API_URL ||
    "https://ziwonai-production.up.railway.app/api/v1";

function authHeaders(token?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token && typeof token === "string" && token.includes(".") && token.split(".").length === 3) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function checkBackendHealth(): Promise<{ online: boolean; message: string }> {
  try {
    const res = await fetch(`${BACKEND_BASE_URL}/health`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      return { online: true, message: data.database || "healthy" };
    }
    return { online: true, message: "Next.js Built-in Engine Active" };
  } catch (error: any) {
    return { online: true, message: "Next.js Built-in Engine Active" };
  }
}

// ----------------- Fast Direct Auth & OTP Engine (/api/auth) -----------------

export async function backendSendOtp(email: string) {
  const res = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ action: "send-otp", email }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "인증번호 발송 실패");
  return json;
}

export async function backendVerifyOtp(email: string, code: string) {
  const res = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ action: "verify-otp", email, code }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "인증번호 확인 실패");
  return json;
}

export async function backendSignup(email: string, password: string, fullName?: string, rememberMe: boolean = true) {
  const res = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ action: "signup", email, password, fullName, rememberMe }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "회원가입 실패");
  return json;
}

export async function backendLogin(email: string, password: string, rememberMe: boolean = true) {
  const res = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ action: "login", email, password, rememberMe }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "로그인 실패");
  return json;
}

export async function backendResetPassword(email: string, password: string) {
  const res = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ action: "reset-password", email, password }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "비밀번호 재설정 실패");
  return json;
}

export async function backendLogout(token?: string) {
  try {
    // 1. Clear HttpOnly Cookie via /api/auth
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "logout" }),
    });

    // 2. Also notify FastAPI Backend if running in background (for Redis token blacklist)
    if (token) {
      fetch(`${BACKEND_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        credentials: "include",
      }).catch(() => {});
    }
    return { success: true };
  } catch (err) {
    return { success: true };
  }
}

/**
 * [보안 표준] HttpOnly 쿠키 기반 무음 토큰 갱신
 */
export async function backendRefreshToken(_refreshToken?: string): Promise<{ accessToken: string } | null> {
  const { performSilentRefresh } = await import("./auth-store");
  const newToken = await performSilentRefresh();
  if (newToken) {
    return { accessToken: newToken };
  }
  return null;
}

/**
 * Enhanced fetch wrapper with In-Memory Access Token & Automatic Silent Refresh
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  let token = await getJwtToken();
  const headers = new Headers(options.headers || {});
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let res = await fetch(url, {
    ...options,
    headers,
    credentials: options.credentials || "include",
  });

  // If 401 Unauthorized, attempt Silent Refresh once and retry
  if (res.status === 401 && typeof window !== "undefined") {
    const { performSilentRefresh } = await import("./auth-store");
    const refreshedToken = await performSilentRefresh();
    if (refreshedToken) {
      headers.set("Authorization", `Bearer ${refreshedToken}`);
      res = await fetch(url, {
        ...options,
        headers,
        credentials: options.credentials || "include",
      });
    }
  }

  return res;
}



// ----------------- Crawler & AI Services -----------------

export async function triggerBackendCrawler(limitPerSource: number = 0) {
  const res = await fetch(`${BACKEND_BASE_URL}/crawler/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ limitPerSource }),
  });
  if (!res.ok) {
    throw new Error(`Backend crawler failed with status: ${res.status}`);
  }
  return res.json();
}

export async function parseDocumentWithBackend(fileUrl: string, fileType: string) {
  const res = await fetch(`${BACKEND_BASE_URL}/parser/url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileUrl, fileType }),
  });
  if (!res.ok) {
    throw new Error(`Backend parser failed with status: ${res.status}`);
  }
  return res.json();
}

export async function generatePsstWithBackend(inputData: any) {
  const res = await fetch(`${BACKEND_BASE_URL}/psst/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(inputData),
  });
  if (!res.ok) {
    throw new Error(`Backend PSST generator failed with status: ${res.status}`);
  }
  return res.json();
}

export async function chatCoachWithBackend(messages: any[], targetProgramTitle: string) {
  const res = await fetch(`${BACKEND_BASE_URL}/psst/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, targetProgramTitle }),
  });
  if (!res.ok) {
    throw new Error(`Backend PSST chat failed with status: ${res.status}`);
  }
  return res.json();
}

// ----------------- User Profile & Company Profile CRUD -----------------

export async function fetchMyProfile(token?: string) {
  const res = await fetchWithAuth(`${BACKEND_BASE_URL}/users/me`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("프로필 조회 실패");
  return res.json();
}

export async function fetchMyCompany(token?: string) {
  const actualToken = token || (await getJwtToken());
  if (!actualToken) {
    return null;
  }

  try {
    const res = await fetchWithAuth(`${BACKEND_BASE_URL}/companies/me`, {
      headers: authHeaders(actualToken),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

export async function saveMyCompany(data: any, token?: string) {
  const res = await fetchWithAuth(`${BACKEND_BASE_URL}/companies/me`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("기업 정보 저장 실패");
  return res.json();
}

// ----------------- Saved PSST Business Plans CRUD -----------------

export async function fetchMyPlans(token?: string) {
  const res = await fetchWithAuth(`${BACKEND_BASE_URL}/plans`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("사업계획서 목록 조회 실패");
  return res.json();
}

export async function savePlanToBackend(data: any, token?: string) {
  const res = await fetchWithAuth(`${BACKEND_BASE_URL}/plans`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("사업계획서 저장 실패");
  return res.json();
}

export async function fetchPlanDetail(planId: string, token?: string) {
  const res = await fetchWithAuth(`${BACKEND_BASE_URL}/plans/${planId}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("사업계획서 상세 조회 실패");
  return res.json();
}

export async function deletePlanFromBackend(planId: string, token?: string) {
  const res = await fetchWithAuth(`${BACKEND_BASE_URL}/plans/${planId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("사업계획서 삭제 실패");
  return res.json();
}

// ----------------- Bookmarks / Scraps CRUD -----------------

export async function fetchMyBookmarks(token?: string) {
  const res = await fetchWithAuth(`${BACKEND_BASE_URL}/bookmarks`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("관심 공고 목록 조회 실패");
  return res.json();
}

export async function toggleBookmarkOnBackend(programId: string, token?: string) {
  const res = await fetchWithAuth(`${BACKEND_BASE_URL}/bookmarks/${programId}/toggle`, {
    method: "POST",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("관심 공고 처리 실패");
  return res.json();
}

