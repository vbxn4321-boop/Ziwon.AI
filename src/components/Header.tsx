"use client";

import React from "react";
import { Sparkles, LayoutGrid, Compass, ShieldCheck, Database, FileText } from "lucide-react";

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
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Logo & DB Live Badge */}
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-500 p-[1px] cursor-pointer" onClick={() => setActiveNavTab("notices")}>
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
                <span>{totalCount ? `${totalCount.toLocaleString()}건` : "1,570건"} 실시간 DB 동기화</span>
              </span>
            </div>
          </div>
        </div>

        {/* Center / Right: Main Navigation Tabs */}
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

          {/* Sub Portal Switcher (Only visible when activeNavTab === 'notices') */}
          {activeNavTab === "notices" && (
            <div className="hidden md:flex bg-slate-900/90 p-1 rounded-xl border border-slate-800 space-x-1 text-xs">
              <button
                onClick={() => setMainPortalMode("bizinfo")}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1 ${
                  mainPortalMode === "bizinfo"
                    ? "bg-blue-600 text-white font-bold shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>기업마당</span>
              </button>
              <button
                onClick={() => setMainPortalMode("kstartup")}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1 ${
                  mainPortalMode === "kstartup"
                    ? "bg-purple-600 text-white font-bold shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>K-Startup</span>
              </button>
            </div>
          )}

          <button className="hidden lg:flex px-3 py-1.5 text-xs font-medium rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>(주)지윈에이아이</span>
          </button>
        </div>
      </div>
    </header>
  );
};
