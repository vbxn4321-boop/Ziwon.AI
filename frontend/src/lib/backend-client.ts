// Frontend Auth & Backend API Client

const BACKEND_BASE_URL = process.env.BACKEND_API_URL || "http://localhost:8000/api/v1";

function authHeaders(token?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
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
    body: JSON.stringify({ action: "verify-otp", email, code }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "인증번호 확인 실패");
  return json;
}

export async function backendSignup(email: string, password: string, fullName?: string) {
  const res = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "signup", email, password, fullName }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "회원가입 실패");
  return json;
}

export async function backendLogin(email: string, password: string) {
  const res = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", email, password }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "로그인 실패");
  return json;
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

export async function fetchMyProfile(token: string) {
  const res = await fetch(`${BACKEND_BASE_URL}/users/me`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("프로필 조회 실패");
  return res.json();
}

export async function fetchMyCompany(token: string) {
  const res = await fetch(`${BACKEND_BASE_URL}/companies/me`, {
    headers: authHeaders(token),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function saveMyCompany(data: any, token: string) {
  const res = await fetch(`${BACKEND_BASE_URL}/companies/me`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("기업 정보 저장 실패");
  return res.json();
}

// ----------------- Saved PSST Business Plans CRUD -----------------

export async function fetchMyPlans(token: string) {
  const res = await fetch(`${BACKEND_BASE_URL}/plans`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("사업계획서 목록 조회 실패");
  return res.json();
}

export async function savePlanToBackend(data: any, token: string) {
  const res = await fetch(`${BACKEND_BASE_URL}/plans`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("사업계획서 저장 실패");
  return res.json();
}

export async function fetchPlanDetail(planId: string, token: string) {
  const res = await fetch(`${BACKEND_BASE_URL}/plans/${planId}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("사업계획서 상세 조회 실패");
  return res.json();
}

export async function deletePlanFromBackend(planId: string, token: string) {
  const res = await fetch(`${BACKEND_BASE_URL}/plans/${planId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("사업계획서 삭제 실패");
  return res.json();
}

// ----------------- Bookmarks / Scraps CRUD -----------------

export async function fetchMyBookmarks(token: string) {
  const res = await fetch(`${BACKEND_BASE_URL}/bookmarks`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("관심 공고 목록 조회 실패");
  return res.json();
}

export async function toggleBookmarkOnBackend(programId: string, token: string) {
  const res = await fetch(`${BACKEND_BASE_URL}/bookmarks/${programId}/toggle`, {
    method: "POST",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("관심 공고 처리 실패");
  return res.json();
}
