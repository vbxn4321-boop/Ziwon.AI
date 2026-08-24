"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, LayoutGrid, ShieldCheck, Database, Server, User, LogIn, LogOut, Building2, FolderHeart } from "lucide-react";
import { supabase, clearLocalAuth, getJwtToken } from "@/lib/supabase-client";
import { checkBackendHealth, backendLogout } from "@/lib/backend-client";
import AuthModal from "@/components/auth/AuthModal";
import CompanyProfileModal from "@/components/auth/CompanyProfileModal";
import SavedPlansModal from "@/components/auth/SavedPlansModal";

interface HeaderProps {
  activeNavTab: "notices" | "psst";
  setActiveNavTab: (tab: "notices" | "psst") => void;
  mainPortalMode: "bizinfo" | "kstartup";
  setMainPortalMode: (mode: "bizinfo" | "kstartup") => void;
  totalCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeNavTab,
  setActiveNavTab,
  mainPortalMode,
  setMainPortalMode,
  totalCount,
}) => {
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  // Modals state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showSavedPlansModal, setShowSavedPlansModal] = useState(false);

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
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: Logo & DB Live Badge & Backend Status */}
          <div className="flex items-center space-x-3">
            <div
              onClick={() => setActiveNavTab("notices")}
              className="flex items-center space-x-2 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <span className="text-white font-black text-sm tracking-wider">Z</span>
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-base tracking-tight text-white flex items-center">
                  Ziwon<span className="text-purple-400">.AI</span>
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-md bg-blue-500/10 text-blue-400 text-[10px] font-bold border border-blue-500/20">
                    2026
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Right: Navigation, Stats & Auth */}
          <div className="flex items-center space-x-3">
            {/* Top Main Navigation Tabs */}
            <div className="flex items-center p-1 bg-slate-900/90 border border-slate-800/80 rounded-2xl text-xs">
              <button
                onClick={() => setActiveNavTab("notices")}
                className={`px-3 sm:px-3.5 py-1.5 rounded-xl font-medium transition-all flex items-center space-x-1.5 ${
                  activeNavTab === "notices"
                    ? "bg-slate-800 text-white shadow-md font-bold border border-slate-700"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5 text-blue-400" />
                <span>지원사업 공고 탐색</span>
              </button>

              <button
                onClick={() => setActiveNavTab("psst")}
                className={`px-3 sm:px-3.5 py-1.5 rounded-xl font-medium transition-all flex items-center space-x-1.5 ${
                  activeNavTab === "psst"
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>AI 사업계획서</span>
                <span className="px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-extrabold border border-purple-500/30">
                  PSST
                </span>
              </button>
            </div>

            {/* User Auth Buttons / Profile Menu */}
            {!mounted ? (
              <div className="h-8 w-24 bg-slate-900/60 rounded-xl" />
            ) : sessionUser ? (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowSavedPlansModal(true)}
                  className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                  title="내 보관함"
                >
                  <FolderHeart className="w-3.5 h-3.5 text-purple-400" />
                  <span className="hidden sm:inline">내 보관함</span>
                </button>

                <button
                  onClick={() => setShowCompanyModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                  <span className="font-bold">{displayName}</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-red-400 border border-slate-800 text-xs transition-colors cursor-pointer"
                  title="로그아웃"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-600/30 flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>로그인 / 회원가입</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Global Auth & User Modals */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      <CompanyProfileModal
        isOpen={showCompanyModal}
        onClose={() => setShowCompanyModal(false)}
      />

      <SavedPlansModal
        isOpen={showSavedPlansModal}
        onClose={() => setShowSavedPlansModal(false)}
      />
    </>
  );
};
