"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Sparkles,
  LayoutGrid,
  Building2,
  BriefcaseBusiness,
  ShieldCheck,
  User,
  LogIn,
  LogOut,
  FolderHeart,
} from "lucide-react";
import { supabase, clearLocalAuth, getJwtToken } from "@/lib/supabase-client";
import { checkBackendHealth, backendLogout } from "@/lib/backend-client";
import { initAuthStore, getInMemoryUser, getInMemoryToken } from "@/lib/auth-store";
import CompanyProfileModal from "@/components/auth/CompanyProfileModal";
import SavedPlansModal from "@/components/auth/SavedPlansModal";

interface HeaderProps {
  activeNavTab?: "notices" | "psst";
  setActiveNavTab?: (tab: "notices" | "psst") => void;
  mainPortalMode?: "bizinfo" | "kstartup" | "all";
  setMainPortalMode?: (mode: "bizinfo" | "kstartup") => void;
  totalCount?: number;
  onSelectPlan?: (planData: any) => void;
  onOpenBookmarkedProgram?: (programId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeNavTab = "notices",
  setActiveNavTab,
  mainPortalMode = "bizinfo",
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

  const syncCurrentUser = () => {
    const memUser = getInMemoryUser();
    if (memUser) {
      setSessionUser(memUser);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSessionUser(session.user);
      } else {
        const currentUser = getInMemoryUser();
        setSessionUser(currentUser || null);
      }
    });
  };

  useEffect(() => {
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

    // [보안 표준] 앱 마운트 시 HttpOnly 쿠키 기반 무음 세션 복원
    initAuthStore().then((user) => {
      if (user) {
        setSessionUser(user);
      } else {
        syncCurrentUser();
      }
    });

    const handleLocalAuthChange = (e?: any) => {
      if (e?.detail?.user !== undefined) {
        setSessionUser(e.detail.user);
      } else {
        syncCurrentUser();
      }
    };
    window.addEventListener("ziwon_auth_change", handleLocalAuthChange);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setSessionUser(session.user);
      } else {
        syncCurrentUser();
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
      } else {
        await backendLogout();
      }
    } catch (e) {
      console.warn("Logout error:", e);
    }
    clearLocalAuth();
    await supabase.auth.signOut();
    setSessionUser(null);
    window.location.href = "/";
  };

  const displayName =
    sessionUser?.name ||
    sessionUser?.user_metadata?.full_name ||
    sessionUser?.email?.split("@")[0] ||
    "대표자";

  const navLinks = [
    { href: "/explore", label: "🌱 초간편 탐색", icon: Sparkles, id: "explore" },
    { href: "/dashboard", label: "🏢 맞춤 대시보드", icon: Building2, id: "dashboard" },
    { href: "/consultant", label: "💼 PSST 전문가", icon: BriefcaseBusiness, id: "consultant" },
  ];

  const handleNavClick = async (e: React.MouseEvent, item: (typeof navLinks)[0]) => {
    if (item.id === "dashboard" || item.id === "consultant") {
      const token = await getJwtToken();
      if (!sessionUser && !token) {
        e.preventDefault();
        router.push(`/login?redirect=${encodeURIComponent(item.href)}`);
      }
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 backdrop-blur-md shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: Logo (로그인 상태일 때는 /dashboard로 직행, 비로그인 시 메인 랜딩 / 로 이동) */}
          <div className="flex items-center space-x-3">
            <Link
              href={sessionUser ? "/dashboard" : "/"}
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

          {/* Center: 3 Persona Direct Routes (Desktop) */}
          <nav className="hidden md:flex items-center p-1 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold">
            {navLinks.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item)}
                  className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer ${
                    isActive
                      ? "bg-white text-blue-700 font-extrabold shadow-2xs border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-blue-600" : "text-slate-500"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right: Auth & Profile */}
          <div className="flex items-center space-x-2">
            {mounted &&
              (sessionUser?.role === "ADMIN" || sessionUser?.email === "qjawls2617@naver.com") && (
                <Link
                  href="/admin"
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/40 text-[11px] font-bold transition-all flex items-center space-x-1 shadow-xs"
                  title="운영 관리자 센터 (관리자 전용)"
                >
                  <span>⚙️ 관리자</span>
                </Link>
              )}
            {mounted && sessionUser ? (
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowSavedPlansModal(true)}
                  title="저장된 사업계획서 보관함"
                  className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center space-x-1.5"
                >
                  <FolderHeart className="w-3.5 h-3.5 text-rose-500" />
                  <span className="hidden sm:inline">보관함</span>
                </button>

                <Link
                  href="/mypage"
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center space-x-1.5 ${
                    pathname === "/mypage"
                      ? "bg-blue-600 text-white border-blue-600 shadow-blue-500/20"
                      : "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                  }`}
                  title="마이페이지로 이동"
                >
                  <User className="w-3.5 h-3.5" />
                  <span className="max-w-[100px] truncate">{displayName}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    pathname === "/mypage" ? "bg-white/20 text-white" : "bg-blue-200/60 text-blue-800"
                  }`}>
                    MY
                  </span>
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  title="로그아웃"
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-sm shadow-blue-600/20 transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>로그인 / 회원가입</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Profile & Saved Plan Modals */}
      <CompanyProfileModal
        isOpen={showCompanyModal}
        onClose={() => setShowCompanyModal(false)}
        onSaved={() => {
          setShowCompanyModal(false);
          window.dispatchEvent(new Event("ziwon_auth_change"));
        }}
      />

      <SavedPlansModal
        isOpen={showSavedPlansModal}
        onClose={() => setShowSavedPlansModal(false)}
        onSelectPlan={(plan) => {
          setShowSavedPlansModal(false);
          if (onSelectPlan) {
            onSelectPlan(plan);
          } else {
            router.push(`/consultant?planId=${plan.id}`);
          }
        }}
      />
    </>
  );
};
