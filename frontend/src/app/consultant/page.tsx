"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";
import { PsstPlanGenerator } from "@/components/PsstPlanGenerator";
import { ConsultantDirectorySection } from "@/components/consultant/ConsultantDirectorySection";
import { fetchPlanDetail } from "@/lib/backend-client";
import { getJwtToken } from "@/lib/supabase-client";
import {
  FileText,
  Sparkles,
  Users,
  ShieldCheck,
  Award,
  ArrowRight,
  CheckCircle2,
  Zap,
  BookOpen,
} from "lucide-react";

function ConsultantContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedTargetProgramForPlan, setSelectedTargetProgramForPlan] = useState<string>("");
  const [selectedPlanToLoad, setSelectedPlanToLoad] = useState<any>(null);
  const [isFullStudioOpen, setIsFullStudioOpen] = useState(false);

  // Auth Guard
  useEffect(() => {
    const checkAuth = async () => {
      const token = await getJwtToken();
      if (!token) {
        router.push("/login?redirect=/consultant");
      }
    };
    checkAuth();
  }, [router]);

  // Check URL params for direct plan opening
  useEffect(() => {
    const planId = searchParams.get("planId");
    if (planId) {
      getJwtToken().then((token) => {
        if (token) {
          fetchPlanDetail(planId, token).then((plan) => {
            if (plan) {
              setSelectedPlanToLoad(plan);
              setIsFullStudioOpen(true);
            }
          });
        }
      });
    }

    const targetTitle = searchParams.get("targetTitle") || searchParams.get("programTitle");
    if (targetTitle) {
      setSelectedTargetProgramForPlan(targetTitle);
      setIsFullStudioOpen(true);
    }
  }, [searchParams]);

  // If user opens the full studio mode
  if (isFullStudioOpen) {
    return (
      <main className="w-full h-screen flex flex-col overflow-hidden">
        <PsstPlanGenerator
          initialProgramTitle={selectedTargetProgramForPlan || undefined}
          initialPlanData={selectedPlanToLoad}
          onBackToNotices={() => {
            setIsFullStudioOpen(false);
            setSelectedPlanToLoad(null);
            setSelectedTargetProgramForPlan("");
          }}
        />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col selection:bg-blue-600 selection:text-white font-sans antialiased">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-8 space-y-12">
        {/* 1. Top Hero Title & AI Plan Studio Launch Banner */}
        <section className="bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-950 border border-slate-800 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden">
          {/* Background Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6 max-w-3xl">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-extrabold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>2026 중기부·창진원 표준 PSST 공인 서식 AI 엔진</span>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-snug">
                PSST 전문가 AI 사업계획서 스튜디오
                <span className="block text-blue-400 text-xl sm:text-3xl mt-1">
                  10초 자동 작성부터 공인 컨설턴트 1:1 첨삭까지
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                문제인식(Problem) • 실현가능성(Solution) • 성장전략(Scale-up) • 팀구성(Team) 4대 항목을 정부 심사 기준에 맞춘 전문 문체로 자동 생성하고, 전문 컨설턴트의 1:1 서류 검토를 받아보세요.
              </p>
            </div>

            {/* Quick Action Badges */}
            <div className="flex flex-wrap gap-2 pt-1 text-xs text-slate-300">
              <span className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-white/10 border border-white/15">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>예창패·초창패·디딤돌 R&D 호환</span>
              </span>
              <span className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-white/10 border border-white/15">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Gemini AI 초고속 초안 생성</span>
              </span>
              <span className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-white/10 border border-white/15">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span>수석 심사역 1:1 매칭 지원</span>
              </span>
            </div>

            {/* Main Studio Launch CTA Button */}
            <div className="pt-3 flex items-center flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setIsFullStudioOpen(true)}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center space-x-2.5 cursor-pointer group"
              >
                <FileText className="w-4 h-4" />
                <span>AI 사업계획서 스튜디오 바로 시작하기</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <span className="text-xs text-slate-400 font-medium">
                * 기업 정보가 자동 반영되어 1분 만에 초안 완성
              </span>
            </div>
          </div>
        </section>

        {/* 2. PSST 4-Step Key Framework Preview Cards */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">PSST 4대 표준 평가 프레임워크</h2>
              <p className="text-xs text-slate-500">정부지원사업 심사위원이 채점하는 필수 4대 핵심 항목을 완벽하게 커버합니다.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-2xs hover:border-blue-400 transition-colors">
              <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 font-black text-xs flex items-center justify-center">
                P
              </div>
              <h3 className="font-extrabold text-sm text-slate-900">1. 문제인식 (Problem)</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                창업 아이템의 개발 동기, 기존 시장의 문제점 및 고객 페인포인트, 시장 진입 필요성을 구체적으로 도출합니다.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-2xs hover:border-blue-400 transition-colors">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 font-black text-xs flex items-center justify-center">
                S
              </div>
              <h3 className="font-extrabold text-sm text-slate-900">2. 실현가능성 (Solution)</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                아이템의 차별화된 개발 방안, 핵심 기술 및 서비스 구현 로드맵, 목표 시장 경쟁력 확보 방안을 구조화합니다.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-2xs hover:border-blue-400 transition-colors">
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 font-black text-xs flex items-center justify-center">
                S
              </div>
              <h3 className="font-extrabold text-sm text-slate-900">3. 성장전략 (Scale-up)</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                비즈니스 모델(BM), 판로 개척 및 마케팅 전략, 정부지원금 소요 예산 및 자금 조달 계획을 수립합니다.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-2xs hover:border-blue-400 transition-colors">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 font-black text-xs flex items-center justify-center">
                T
              </div>
              <h3 className="font-extrabold text-sm text-slate-900">4. 팀구성 (Team)</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                대표자 및 핵심 인력의 전문성, 업무 분장, 추가 고용 계획 및 사회적 가치/ESG 창출 계획을 어필합니다.
              </p>
            </div>
          </div>
        </section>

        {/* 3. Recommended Expert Consultants Directory Section (Bottom) */}
        <ConsultantDirectorySection />
      </main>

      <Footer />
    </div>
  );
}

export default function ConsultantPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center">로딩 중...</div>}>
      <ConsultantContent />
    </Suspense>
  );
}
