"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  Zap,
  Building2,
  BriefcaseBusiness,
  Bot,
  ShieldCheck,
  FileText,
  ArrowRight,
  Database,
  Search,
  CheckCircle2,
} from "lucide-react";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";
import { TossGatewayHero } from "@/components/home/TossGatewayHero";

export default function HomePage() {
  const [stats, setStats] = useState({
    totalCount: 1662,
    activeCount: 1662,
    todayCount: 0,
    recentCount: 60,
    urgentCount: 223,
  });

  useEffect(() => {
    fetch("/api/filters")
      .then((r) => r.json())
      .then((j) => {
        if (j.success && j.stats) {
          setStats(j.stats);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col selection:bg-blue-600 selection:text-white font-sans antialiased">
      {/* Global Navigation Header */}
      <Header />

      <main className="flex-1 flex flex-col space-y-16 pb-16">
        {/* 1. 3-Gateway Hero (Toss Business Reference Style) */}
        <TossGatewayHero />

        {/* 2. Live Platform Stats & Trust Bar */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-y md:divide-y-0 md:divide-x divide-slate-100">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-500">실시간 진행 중 공고</span>
                <p className="text-2xl sm:text-3xl font-black text-slate-900">
                  {stats.activeCount.toLocaleString()}<span className="text-sm font-bold text-blue-600 ml-1">건</span>
                </p>
                <span className="text-[11px] text-slate-400">기업마당 & K-Startup 100% 동기화</span>
              </div>

              <div className="space-y-1 pt-4 md:pt-0">
                <span className="text-xs font-bold text-slate-500">최근 3일 신규 수집</span>
                <p className="text-2xl sm:text-3xl font-black text-indigo-600">
                  {stats.recentCount.toLocaleString()}<span className="text-sm font-bold ml-1">건</span>
                </p>
                <span className="text-[11px] text-slate-400">매시간 최신 공고 자동 크롤링</span>
              </div>

              <div className="space-y-1 pt-4 md:pt-0">
                <span className="text-xs font-bold text-slate-500">마감 임박 (D-7)</span>
                <p className="text-2xl sm:text-3xl font-black text-rose-600">
                  {stats.urgentCount.toLocaleString()}<span className="text-sm font-bold ml-1">건</span>
                </p>
                <span className="text-[11px] text-slate-400">접수 기한 놓침 방지 알림</span>
              </div>

              <div className="space-y-1 pt-4 md:pt-0">
                <span className="text-xs font-bold text-slate-500">AI 심사 분석 모델</span>
                <p className="text-2xl sm:text-3xl font-black text-purple-600">
                  Gemini 3.7<span className="text-sm font-bold ml-1">Pro</span>
                </p>
                <span className="text-[11px] text-slate-400">HWP/PDF 공고문 팩트 딥러닝</span>
              </div>
            </div>
          </div>
        </section>

        {/* 3. 3-Feature Showcase Grid (Why Ziwon.AI) */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              정부지원사업 합격, <br />
              <span className="text-blue-600">Ziwon.AI</span>와 함께하면 쉬워집니다
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              복잡한 40페이지 공고문을 읽지 않아도, AI가 핵심 자격과 사업계획서를 완성해 드립니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="bg-white border border-slate-200 rounded-3xl p-7 space-y-4 shadow-xs hover:border-blue-300 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
                <Search className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-black text-lg text-slate-900">3초 퀵 온보딩 매칭</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  창업 업력(예비/1년/3년/7년), 관심 분야(R&D/사업화/수출), 소재지만 선택하면 1,600여 개 공고 중 내 조건에 딱 맞는 공고만 0.1초 만에 걸러냅니다.
                </p>
              </div>
              <Link
                href="/explore"
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-blue-600 hover:text-blue-700"
              >
                <span>초간편 탐색 체험하기</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Feature 2 */}
            <div className="bg-white border border-slate-200 rounded-3xl p-7 space-y-4 shadow-xs hover:border-indigo-300 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-2xs">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-black text-lg text-slate-900">PSST 사업계획서 10초 생성</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  문제인식(P)·실현가능성(S)·성장전략(S)·팀구성(T) 표준 4대 항목을 정부 심사 기준에 맞춘 전문적인 비즈니스 문체로 즉시 도출하고 다운로드합니다.
                </p>
              </div>
              <Link
                href="/consultant"
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700"
              >
                <span>PSST AI 작성기 열기</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Feature 3 */}
            <div className="bg-white border border-slate-200 rounded-3xl p-7 space-y-4 shadow-xs hover:border-purple-300 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shadow-2xs">
                <Bot className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-black text-lg text-slate-900">심사위원 가점 정밀 분석</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  첨부된 HWP/PDF 공고문 원문을 파싱하여 필수 제출 서류 체크리스트, 탈락 방지 결격요건, 특허/인증 가점 요건을 100% 팩트 기반으로 진단합니다.
                </p>
              </div>
              <Link
                href="/dashboard"
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-purple-600 hover:text-purple-700"
              >
                <span>맞춤 대시보드 바로가기</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* 4. Bottom Full Banner CTA */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900 rounded-3xl p-8 sm:p-12 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-bold text-blue-200">
                1초 만에 무료로 시작하기
              </span>
              <h3 className="text-2xl sm:text-3xl font-black leading-tight">
                지금 바로 내 기업에 딱 맞는 <br />
                정부지원사업을 찾아보세요
              </h3>
              <p className="text-xs sm:text-sm text-slate-200">
                회원가입 없이도 모든 공고와 AI 퀵 온보딩 매칭을 즉시 체험하실 수 있습니다.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Link
                href="/explore"
                className="px-6 py-3.5 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 font-extrabold text-xs sm:text-sm shadow-md transition-all text-center"
              >
                🌱 처음 이용자 3초 매칭 시작
              </Link>
              <Link
                href="/dashboard"
                className="px-6 py-3.5 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-white font-extrabold text-xs sm:text-sm transition-all text-center"
              >
                🏢 실시간 맞춤 대시보드
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Global Footer */}
      <Footer />
    </div>
  );
}
