"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Sparkles, LayoutGrid, ShieldCheck, Database, Server, User, LogIn, LogOut, Building2, FolderHeart } from "lucide-react";
import { supabase, clearLocalAuth, getJwtToken } from "@/lib/supabase-client";
import { checkBackendHealth, backendLogout } from "@/lib/backend-client";
import CompanyProfileModal from "@/components/auth/CompanyProfileModal";
import SavedPlansModal from "@/components/auth/SavedPlansModal";

interface HeaderProps {
  activeNavTab: "notices" | "psst";
  setActiveNavTab: (tab: "notices" | "psst") => void;
  mainPortalMode: "bizinfo" | "kstartup";
  setMainPortalMode: (mode: "bizinfo" | "kstartup") => void;
  totalCount?: number;
  onSelectPlan?: (planData: any) => void;
  onOpenBookmarkedProgram?: (programId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeNavTab,
  setActiveNavTab,
  mainPortalMode,
  setMainPortalMode,
  totalCount,
  onSelectPlan,
  onOpenBookmarkedProgram,
}) => {
  const router = useRouter();
  const pathname = usePathname();

  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  // Modals state
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showSavedPlansModal, setShowSavedPlansModal] = useState(false);

  const handleNavClick = (tab: "notices" | "psst") => {
    if (pathname === "/") {
      setActiveNavTab(tab);
    } else {
      router.push(`/?tab=${tab}`);
    }
  };

  const syncCurrentUser = () => {
    if (typeof window !== "undefined") {
      const localUserStr = localStorage.getItem("ziwon_auth_user");
      if (localUserStr) {
        try {
          setSessionUser(JSON.parse(localUserStr));
          return;
        } catch {}
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSessionUser(session.user);
      } else {
        const localUserStr = typeof window !== "undefined" ? localStorage.getItem("ziwon_auth_user") : null;
        if (!localUserStr) {
          setSessionUser(null);
        }
      }
    });
  };

  useEffect(() => {
    // Check Python FastAPI backend status
    const checkBackend = async () => {
      try {
        const health = await checkBackendHealth();
        setBackendOnline(health.online);
      } catch {
        setBackendOnline(false);
      }
    };
    checkBackend();
    const interval = setInterval(checkBackend, 30000);

    setMounted(true);
    syncCurrentUser();

    const handleLocalAuthChange = () => syncCurrentUser();
    window.addEventListener("ziwon_auth_change", handleLocalAuthChange);

    // Supabase onAuthStateChange가 null을 반환해도 local JWT 유저를 덮어쓰지 않도록 방어
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setSessionUser(session.user);
      } else {
        const localUserStr = typeof window !== "undefined" ? localStorage.getItem("ziwon_auth_user") : null;
        if (!localUserStr) {
          setSessionUser(null);
        }
      }
    });

    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
      window.removeEventListener("ziwon_auth_change", handleLocalAuthChange);
    };
  }, []);

  const handleLogout = async () => {
    try {
      const token = await getJwtToken();
      if (token) {
        await backendLogout(token);
      }
    } catch (e) {
      console.warn("Logout error:", e);
    }
    clearLocalAuth();
    await supabase.auth.signOut();
    setSessionUser(null);
  };

  const displayName =
    sessionUser?.name ||
    sessionUser?.user_metadata?.full_name ||
    sessionUser?.email?.split("@")[0] ||
    "대표자";

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 backdrop-blur-md shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: Logo & DB Live Badge */}
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              onClick={() => handleNavClick("notices")}
              className="flex items-center space-x-2.5 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-500 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <span className="text-white font-black text-sm tracking-wider">Z</span>
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-base tracking-tight text-slate-900 flex items-center">
                  Ziwon<span className="text-blue-600">.AI</span>
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                    2026
                  </span>
                </span>
              </div>
            </Link>
          </div>

          {/* Right: Navigation, Stats & Auth */}
          <div className="flex items-center space-x-3">
            {/* Top Main Navigation Tabs */}
            <div className="flex items-center p-1 bg-slate-100 border border-slate-200 rounded-xl text-xs">
              <button
                onClick={() => handleNavClick("notices")}
                className={`px-3 sm:px-3.5 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1.5 cursor-pointer ${
                  pathname === "/" && activeNavTab === "notices"
                    ? "bg-white text-slate-900 shadow-xs font-bold border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5 text-blue-600" />
                <span>지원사업 공고 탐색</span>
              </button>

              <button
                onClick={() => handleNavClick("psst")}
                className={`px-3 sm:px-3.5 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1.5 cursor-pointer ${
                  pathname === "/" && activeNavTab === "psst"
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                <span>AI 사업계획서</span>
                <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 text-[10px] font-extrabold border border-blue-200">
                  PSST
                </span>
              </button>
            </div>

            {/* User Auth Buttons / Profile Menu */}
            {!mounted ? (
              <div className="h-8 w-24 bg-slate-100 rounded-xl animate-pulse" />
            ) : sessionUser ? (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowSavedPlansModal(true)}
                  className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
                  title="내 보관함"
                >
                  <FolderHeart className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="hidden sm:inline">내 보관함</span>
                </button>

                <Link
                  href="/mypage"
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
                  title="마이페이지 (기업 정보 관리 & 내 보관함)"
                >
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  <span className="font-bold">{displayName}</span>
                  <span className="text-[10px] text-blue-600 font-semibold ml-0.5 bg-blue-50 px-1 rounded">MY</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl bg-white hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-200 text-xs transition-colors cursor-pointer shadow-2xs"
                  title="로그아웃"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-sm shadow-blue-600/20 flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>로그인 / 회원가입</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Global Auth & User Modals */}
      <CompanyProfileModal
        isOpen={showCompanyModal}
        onClose={() => setShowCompanyModal(false)}
      />

      <SavedPlansModal
        isOpen={showSavedPlansModal}
        onClose={() => setShowSavedPlansModal(false)}
        onSelectPlan={onSelectPlan}
        onOpenBookmarkedProgram={onOpenBookmarkedProgram}
      />
    </>
  );
};
