"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles, Building2, BriefcaseBusiness } from "lucide-react";

import { getJwtToken } from "@/lib/supabase-client";

export type PersonaMode = "newbie" | "business" | "consultant";

interface TossGatewayHeroProps {
  currentMode?: PersonaMode;
  onSelectMode?: (mode: PersonaMode) => void;
}

export const TossGatewayHero: React.FC<TossGatewayHeroProps> = ({
  currentMode,
  onSelectMode,
}) => {
  const router = useRouter();

  const gateways = [
    {
      id: "newbie" as PersonaMode,
      route: "/explore",
      topBadge: {
        icon: Sparkles,
        title: "🌱 처음 이용자",
        sub: "모두의 지원사업",
      },
      cardSubtitle: "정부지원사업이 처음이라면",
      cardTitle: "초간편 맞춤 탐색",
      desc: "복잡한 서류 없이 3가지 기본 정보만으로 즉시 맞춤 공고를 추천받아보세요.",
      tags: ["#3초매칭", "#쉬운용어해설", "#필터링"],
      cta: "초간편 지원사업 찾기",
      badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      footerDesc: "누구나 1분 만에 끝내는 맞춤 공고 조회.",
      gradient: "from-[#090d16] via-[#0f172a] to-[#042f2e]",
      borderActive: "ring-4 ring-emerald-500/30 border-emerald-400",
    },
    {
      id: "business" as PersonaMode,
      route: "/dashboard",
      topBadge: {
        icon: Building2,
        title: "🏢 기업 대표님",
        sub: "맞춤 성장 관리",
      },
      cardSubtitle: "사업자등록을 마친 대표님을 위해",
      cardTitle: "기업 맞춤 대시보드",
      desc: "업력, 지역, 특허, 기술인증 정보를 바탕으로 우리 기업에 딱 맞는 공고를 관리합니다.",
      tags: ["#기업프로필", "#정밀적합도", "#D-Day알림"],
      cta: "기업 대시보드 입장",
      badgeColor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      footerDesc: "신청 가능한 최적의 정부지원 공고 캘린더.",
      gradient: "from-[#090d16] via-[#0f172a] to-[#1e1b4b]",
      borderActive: "ring-4 ring-blue-500/30 border-blue-400",
    },
    {
      id: "consultant" as PersonaMode,
      route: "/consultant",
      topBadge: {
        icon: BriefcaseBusiness,
        title: "💼 PSST 전문가",
        sub: "AI 사업계획서",
      },
      cardSubtitle: "선정 확률을 극대화하는",
      cardTitle: "AI 사업계획서 코치",
      desc: "선정 확률 92%의 PSST 표준 양식 기반으로 지원사업 합격 사업계획서를 자동 생성합니다.",
      tags: ["#PSST표준", "#AI자동작성", "#사업계획서"],
      cta: "PSST 코칭 시작하기",
      badgeColor: "bg-purple-500/10 text-purple-600 border-purple-500/20",
      footerDesc: "합격률을 높여주는 심사위원 배점표와 서식 자동 작성.",
      gradient: "from-[#090d16] via-[#111827] to-[#312e81]",
      borderActive: "ring-4 ring-purple-500/30 border-purple-400",
    },
  ];

  const handleCardClick = async (g: (typeof gateways)[0]) => {
    if (onSelectMode) {
      onSelectMode(g.id);
    }
    if (g.id === "business" || g.id === "consultant") {
      const localToken = await getJwtToken();
      if (!localToken) {
        router.push(`/login?redirect=${encodeURIComponent(g.route)}`);
        return;
      }
    }
    router.push(g.route);
  };

  return (
    <div className="w-full space-y-16">
      {/* 1. Full-Width Edge-to-Edge Hero Banner (토스 비즈니스 100% 꽉 찬 와이드 배너) */}
      <section className="relative w-full bg-[#0b1120] text-white min-h-[460px] sm:min-h-[540px] md:min-h-[580px] flex flex-col justify-center items-center text-center px-4 sm:px-6 lg:px-8 py-20 sm:py-28 overflow-hidden">
        {/* Cinematic Backdrop Lighting & Subtle Grid Texture */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b1120]/40 via-[#0b1120]/80 to-[#0b1120] z-0" />
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[350px] bg-blue-600/20 blur-[140px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto space-y-6">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight sm:leading-tight">
            정부지원사업의 모든 것<br />
            Ziwon과 쉽고 확실하게
          </h1>
          <p className="text-sm sm:text-lg text-slate-300 font-normal leading-relaxed max-w-2xl mx-auto">
            복잡한 공고문 분석부터 사업계획서 작성까지, 편하게 시작하세요.
          </p>
          <div className="pt-3 flex justify-center">
            <button
              onClick={() => router.push("/explore")}
              className="px-8 py-4 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm sm:text-base shadow-xl shadow-blue-600/30 transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              시작하기
            </button>
          </div>
        </div>
      </section>

      {/* 2. Toss Emotional Transition Copy & 3 Gateway Cards (Contained in max-w-7xl) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-12">
        <section className="text-center py-2 sm:py-4 space-y-2">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-snug">
            모든 비즈니스의 성장에 필요한 도전,<br />
            수많은 공고를 분석해 온 Ziwon이 함께할게요
          </h2>
        </section>

        {/* 3. 3-Gateway Cards Row */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
          {gateways.map((g) => {
            const isSelected = currentMode === g.id;
            const Icon = g.topBadge.icon;

            return (
              <div
                key={g.id}
                onClick={() => handleCardClick(g)}
                className={`flex flex-col justify-between rounded-3xl transition-all duration-300 cursor-pointer group hover:-translate-y-1.5 ${
                  isSelected
                    ? `${g.borderActive} shadow-xl scale-[1.01]`
                    : "border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md"
                }`}
              >
                {/* Top Header */}
                <div className="bg-white px-6 py-4 rounded-t-3xl border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-black text-slate-800 tracking-tight">
                      {g.topBadge.title}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">
                    {g.topBadge.sub}
                  </span>
                </div>

                {/* Main Body */}
                <div
                  className={`bg-gradient-to-br ${g.gradient} p-7 text-white flex-1 flex flex-col justify-between space-y-6 relative overflow-hidden`}
                >
                  <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

                  <div className="space-y-2 relative z-10">
                    <div className="inline-block px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-md text-[10px] font-bold text-blue-200 mb-1">
                      {g.cardSubtitle}
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black tracking-tight leading-snug text-white">
                      {g.cardTitle}
                    </h3>
                    <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line pt-1 opacity-90">
                      {g.desc}
                    </p>
                  </div>

                  {/* Capsule Action Button */}
                  <div className="pt-2 relative z-10">
                    <div
                      className={`inline-flex items-center space-x-2 px-5 py-2.5 rounded-full border text-xs font-black transition-all ${
                        isSelected
                          ? "bg-white text-slate-900 border-white shadow-md"
                          : "bg-white/15 backdrop-blur-md border-white/30 text-white group-hover:bg-white group-hover:text-slate-900"
                      }`}
                    >
                      <span>{g.cta}</span>
                      <div className="w-5 h-5 rounded-full bg-white/20 group-hover:bg-slate-900/10 flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-white px-6 py-4 rounded-b-3xl text-center border-t border-slate-100">
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    {g.footerDesc}
                  </p>
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
};
