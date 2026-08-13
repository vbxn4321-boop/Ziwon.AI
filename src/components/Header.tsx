"use client";

import React from "react";
import { Sparkles, LayoutGrid, Compass, ShieldCheck, Database } from "lucide-react";

interface HeaderProps {
  mainPortalMode: "bizinfo" | "kstartup";
  setMainPortalMode: (mode: "bizinfo" | "kstartup") => void;
}

export const Header: React.FC<HeaderProps> = ({ mainPortalMode, setMainPortalMode }) => {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-500 p-[1px]">
            <div className="h-full w-full bg-slate-950 rounded-[11px] flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-blue-400" />
            </div>
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              Ziwon.AI
            </span>
            <span className="ml-2 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 inline-flex items-center space-x-1">
              <Database className="w-3 h-3 text-blue-400" />
              <span>1,570건 DB 실시간 카운팅 동기화</span>
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="bg-slate-900/90 p-1 rounded-xl border border-slate-800 flex space-x-1 text-xs">
            <button
              onClick={() => setMainPortalMode("bizinfo")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1.5 ${
                mainPortalMode === "bizinfo"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>기업마당 포털</span>
            </button>
            <button
              onClick={() => setMainPortalMode("kstartup")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1.5 ${
                mainPortalMode === "kstartup"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>K-Startup 네비게이션</span>
            </button>
          </div>

          <button className="px-3.5 py-1.5 text-xs font-medium rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>(주)지윈에이아이</span>
          </button>
        </div>
      </div>
    </header>
  );
};
