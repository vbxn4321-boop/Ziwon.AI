"use client";

import React, { useMemo } from "react";
import {
  Sparkles,
  Building2,
  MapPin,
  Briefcase,
  Layers,
  RotateCcw,
  Check,
  Zap,
} from "lucide-react";

interface QuickOnboardingBarProps {
  selectedStage: string;
  onSelectStage: (stage: string) => void;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  selectedRegion: string;
  onSelectRegion: (region: string) => void;
  onResetAll: () => void;
  totalFilteredCount: number;
}

const STAGES = ["전체", "예비창업자", "1년 미만", "3년 미만", "7년 미만", "10년 미만"];
const CATEGORIES = ["전체", "기술", "경영", "금융", "수출", "인력", "창업", "시설/입지지원"];
const REGIONS = ["전국", "서울", "경기", "인천", "대전", "부산", "대구", "광주"];

export const QuickOnboardingBar: React.FC<QuickOnboardingBarProps> = ({
  selectedStage,
  onSelectStage,
  selectedCategory,
  onSelectCategory,
  selectedRegion,
  onSelectRegion,
  onResetAll,
  totalFilteredCount,
}) => {
  const isCustomized =
    selectedStage !== "전체" ||
    selectedCategory !== "전체" ||
    (selectedRegion !== "전체" && selectedRegion !== "전국");

  // Dynamic AI Contextual Smart Coaching Tip
  const coachingTip = useMemo(() => {
    if (selectedStage === "예비창업자") {
      return "💡 예비창업자 대표님! 시제품 제작 및 사업화 자금(최대 1억원)을 지원하는 '예비창업패키지'와 '청년창업사관학교'를 우선 확인해 보세요.";
    }
    if (selectedStage === "3년 미만" || selectedStage === "1년 미만") {
      return "💡 3년 미만 초기 스타트업이시군요! '초기창업패키지(최대 1억원)' 및 '디딤돌 첫걸음 R&D' 사업에 지원하여 초기 데스밸리를 극복해 보세요.";
    }
    if (selectedStage === "7년 미만") {
      return "💡 도약기 기업이시군요! 스케일업과 매출 확대를 위한 '창업도약패키지(최대 3억원)' 및 '스케일업 TIPS' 공고를 추천합니다.";
    }
    if (selectedCategory === "기술") {
      return "💡 기술개발(R&D) 지원을 원하시는군요! 중기부 '디딤돌 R&D(최대 1.2억)' 및 '민관공동창업자발굴육성(TIPS)'을 집중 분석해 보세요.";
    }
    if (selectedCategory === "수출") {
      return "💡 해외 진출을 준비 중이시군요! 해외 마케팅, 전시회, 인증비용을 바우처로 지원하는 '수출바우처' 사업을 강력 추천합니다.";
    }
    if (selectedCategory === "금융") {
      return "💡 정책자금 융자 및 보증 지원을 확인 중이시군요! 신용보증기금(Start-up NEST)과 중진공 정책자금 직접대출을 함께 검토해 보세요.";
    }
    return "💡 내 기업의 '업력', '관심분야', '소재지' 칩을 톡톡 누르면 0.1초 만에 최적의 지원사업만 선별 큐레이션됩니다.";
  }, [selectedStage, selectedCategory, selectedRegion]);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
      <div className="bg-white border border-blue-200/90 rounded-3xl p-4 sm:p-5 space-y-4 shadow-sm relative overflow-hidden">
        {/* Top Header: Title & AI Coaching Tip */}
        <div className="flex items-center justify-between flex-wrap gap-2.5 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-2xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                  3초 퀵 온보딩 맞춤 큐레이션
                </h3>
                {isCustomized && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-black animate-pulse flex items-center space-x-1">
                    <Zap className="w-3 h-3 text-blue-600" />
                    <span>실시간 맞춤 필터링 가동 중</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                기업 조건 3가지를 선택하면 전체 {totalFilteredCount.toLocaleString()}건 중 합격률 높은 공고만 즉시 정렬됩니다.
              </p>
            </div>
          </div>

          {isCustomized && (
            <button
              type="button"
              onClick={onResetAll}
              className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>조건 초기화</span>
            </button>
          )}
        </div>

        {/* Dynamic AI Coaching Tip Banner */}
        <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-blue-50/40 p-3 rounded-2xl border border-blue-100 text-xs font-medium text-slate-800 flex items-start space-x-2 leading-relaxed">
          <span className="text-blue-600 font-extrabold shrink-0 mt-0.5">AI 스마트 코칭:</span>
          <p className="flex-1 text-slate-700">{coachingTip}</p>
        </div>

        {/* 3-Step Interactive Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1 text-xs">
          {/* Step 1: 창업 업력 */}
          <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center space-x-1.5 text-slate-700 font-bold text-[11px]">
              <Briefcase className="w-3.5 h-3.5 text-blue-600" />
              <span>1단계: 창업 업력</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {STAGES.map((stg) => {
                const isSelected = selectedStage === stg;
                return (
                  <button
                    key={stg}
                    type="button"
                    onClick={() => onSelectStage(stg)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer border shadow-2xs flex items-center space-x-1 ${
                      isSelected
                        ? "bg-blue-600 text-white border-blue-600 font-bold shadow-xs"
                        : "bg-white text-slate-700 hover:bg-slate-100 border-slate-200"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                    <span>{stg}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: 관심 지원 분야 */}
          <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center space-x-1.5 text-slate-700 font-bold text-[11px]">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>2단계: 관심 지원 분야</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => onSelectCategory(cat)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer border shadow-2xs flex items-center space-x-1 ${
                      isSelected
                        ? "bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs"
                        : "bg-white text-slate-700 hover:bg-slate-100 border-slate-200"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                    <span>{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: 기업 소재지 */}
          <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center space-x-1.5 text-slate-700 font-bold text-[11px]">
              <MapPin className="w-3.5 h-3.5 text-rose-600" />
              <span>3단계: 기업 소재지</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {REGIONS.map((reg) => {
                const isSelected = selectedRegion === reg;
                return (
                  <button
                    key={reg}
                    type="button"
                    onClick={() => onSelectRegion(reg)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer border shadow-2xs flex items-center space-x-1 ${
                      isSelected
                        ? "bg-rose-600 text-white border-rose-600 font-bold shadow-xs"
                        : "bg-white text-slate-700 hover:bg-slate-100 border-slate-200"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                    <span>{reg}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
