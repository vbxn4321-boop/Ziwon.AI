import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dwyugsqiocpnycwzuxsk.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export async function getJwtToken(): Promise<string | null> {
  // 1. Check local session storage token first (Fast Native JWT)
  if (typeof window !== "undefined") {
    const localToken = localStorage.getItem("ziwon_auth_token");
    if (localToken) return localToken;
  }

  // 2. Check Supabase OAuth session
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

export function getRefreshToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("ziwon_refresh_token");
  }
  return null;
}

export function saveLocalAuth(token: string, user: any, refreshToken?: string | null) {
  if (typeof window !== "undefined") {
    localStorage.setItem("ziwon_auth_token", token);
    localStorage.setItem("ziwon_auth_user", JSON.stringify(user));
    if (refreshToken) {
      localStorage.setItem("ziwon_refresh_token", refreshToken);
    }
    window.dispatchEvent(new Event("ziwon_auth_change"));
  }
}

export function clearLocalAuth() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("ziwon_auth_token");
    localStorage.removeItem("ziwon_refresh_token");
    localStorage.removeItem("ziwon_auth_user");
    window.dispatchEvent(new Event("ziwon_auth_change"));
  }
}

