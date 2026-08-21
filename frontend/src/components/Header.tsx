"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, LayoutGrid, ShieldCheck, Database, Server, User, LogIn, LogOut, Building2, FolderHeart } from "lucide-react";
import { supabase, clearLocalAuth } from "@/lib/supabase-client";
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
      setSessionUser(session?.user || null);
    });
  };

  useEffect(() => {
    // Check Python FastAPI backend status
    const checkBackend = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/v1/health", {
          method: "GET",
          signal: AbortSignal.timeout(2000),
        });
        setBackendOnline(res.ok);
      } catch {
        setBackendOnline(false);
      }
    };
    checkBackend();
    const interval = setInterval(checkBackend, 10000);

    syncCurrentUser();

    const handleLocalAuthChange = () => syncCurrentUser();
    window.addEventListener("ziwon_auth_change", handleLocalAuthChange);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user || null);
    });

    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
      window.removeEventListener("ziwon_auth_change", handleLocalAuthChange);
    };
  }, []);

  const handleLogout = async () => {
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
              className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-500 p-[1px] cursor-pointer"
              onClick={() => setActiveNavTab("notices")}
            >
              <div className="h-full w-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-blue-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span
                  onClick={() => setActiveNavTab("notices")}
                  className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent cursor-pointer"
                >
                  Ziwon.AI
                </span>
                <span className="hidden sm:inline-flex text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 items-center space-x-1">
                  <Database className="w-3 h-3 text-blue-400" />
                  <span>{totalCount ? `${totalCount.toLocaleString()}건` : "1,570건"} 실시간 DB</span>
                </span>

                {/* FastAPI Backend Status Live Indicator */}
                <span
                  className={`hidden md:inline-flex text-[10.5px] font-semibold px-2.5 py-0.5 rounded-full border items-center space-x-1 transition-all ${
                    backendOnline
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-sm"
                      : "bg-slate-800/80 text-slate-400 border-slate-700"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      backendOnline ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
                    }`}
                  />
                  <Server className="w-3 h-3" />
                  <span>{backendOnline ? "FastAPI 백엔드 연동됨" : "백엔드 대기 중"}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Center / Right: Main Navigation Tabs & User Profile */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Main Service Switcher */}
            <div className="bg-slate-900/90 p-1 rounded-2xl border border-slate-800 flex space-x-1 text-xs">
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
            {sessionUser ? (
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
