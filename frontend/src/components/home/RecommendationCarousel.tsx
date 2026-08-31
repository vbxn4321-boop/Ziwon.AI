"use client";

import React, { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Building2,
  ChevronRight,
  ChevronLeft,
  Pause,
  Play,
  LogIn,
} from "lucide-react";
import { ProgramCard, SupportProgram } from "../ProgramCard";

interface RecommendationCarouselProps {
  myCompany: any;
  isLoggedIn?: boolean;
  recommendedPrograms: SupportProgram[];
  loadingRecommended: boolean;
  onOpenCompanyModal: () => void;
  onProgramClick: (id: string) => void;
}

export const RecommendationCarousel: React.FC<RecommendationCarouselProps> = ({
  myCompany,
  isLoggedIn = false,
  recommendedPrograms,
  loadingRecommended,
  onOpenCompanyModal,
  onProgramClick,
}) => {
  const router = useRouter();
  const carouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const getCardStep = () => {
    if (carouselRef.current) {
      const firstChild = carouselRef.current.firstElementChild as HTMLElement;
      if (firstChild) {
        return firstChild.offsetWidth + 16; // card width + gap (16px)
      }
    }
    return 336;
  };

  const checkScrollability = () => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
      const step = getCardStep();
      const idx = Math.min(
        Math.max(0, Math.round(scrollLeft / step)),
        recommendedPrograms.length - 1
      );
      setCurrentSlideIndex(idx);
    }
  };

  const scrollToIndex = (index: number) => {
    if (carouselRef.current && recommendedPrograms.length > 0) {
      const safeIndex = Math.min(Math.max(0, index), recommendedPrograms.length - 1);
      const step = getCardStep();
      const targetLeft = safeIndex * step;
      carouselRef.current.scrollTo({ left: targetLeft, behavior: "smooth" });
      setCurrentSlideIndex(safeIndex);
      setTimeout(checkScrollability, 350);
    }
  };

  const handleScrollCarousel = (direction: "left" | "right") => {
    if (recommendedPrograms.length === 0) return;
    if (direction === "left") {
      const prevIdx = (currentSlideIndex - 1 + recommendedPrograms.length) % recommendedPrograms.length;
      scrollToIndex(prevIdx);
    } else {
      const nextIdx = (currentSlideIndex + 1) % recommendedPrograms.length;
      scrollToIndex(nextIdx);
    }
  };

  // Auto-play rolling effect (rolls every 3.2s when autoplay is on and user is not hovering)
  useEffect(() => {
    if (!isAutoPlay || isHovered || recommendedPrograms.length <= 1) return;

    const interval = setInterval(() => {
      if (carouselRef.current && recommendedPrograms.length > 0) {
        const nextIdx = (currentSlideIndex + 1) % recommendedPrograms.length;
        scrollToIndex(nextIdx);
      }
    }, 3200);

    return () => clearInterval(interval);
  }, [isAutoPlay, isHovered, recommendedPrograms, currentSlideIndex]);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
      {isLoggedIn && myCompany ? (
        /* 1. Logged in and has company profile: Show Active Recommendation Carousel */
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onTouchStart={() => setIsHovered(true)}
          onTouchEnd={() => setTimeout(() => setIsHovered(false), 2500)}
          className="bg-gradient-to-br from-blue-50/90 via-indigo-50/40 to-white border border-blue-200/90 rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm relative overflow-hidden group"
        >
          {/* Decorative background glow */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-400/10 rounded-full blur-2xl pointer-events-none" />

          {/* Header Toolbar */}
          <div className="flex items-center justify-between flex-wrap gap-3 border-b border-blue-200/60 pb-3 relative z-10">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xs flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <h3 className="font-extrabold text-base sm:text-lg text-slate-900">
                    🎯 <span className="text-blue-700">{myCompany.name}</span> 님을 위한 맞춤 추천 지원사업
                  </h3>
                  {recommendedPrograms.length > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[11px] font-bold shadow-2xs">
                      {recommendedPrograms.length}개 추천
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  🏢 {myCompany.industry || "전체 업종"} • 📍 {myCompany.region || "전국"} 소재 기업 조건 맞춤 알고리즘 매칭
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onOpenCompanyModal}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-blue-700 border border-blue-200 font-bold text-xs transition-all cursor-pointer shadow-2xs flex items-center space-x-1.5"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>기업 정보 변경</span>
              </button>
            </div>
          </div>

          {/* Carousel Content */}
          {loadingRecommended ? (
            <div className="text-center py-12 text-xs text-slate-500 flex flex-col items-center justify-center space-y-2">
              <Sparkles className="w-6 h-6 animate-pulse text-blue-500" />
              <span>내 기업 조건에 맞춘 최적의 지원사업을 분석 및 추천 중입니다...</span>
            </div>
          ) : recommendedPrograms.length > 0 ? (
            <div className="relative space-y-4">
              <div
                ref={carouselRef}
                onScroll={checkScrollability}
                className="flex space-x-4 overflow-x-auto scrollbar-none py-1 scroll-smooth"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {recommendedPrograms.map((prog) => (
                  <div
                    key={prog.id}
                    className="w-[280px] sm:w-[320px] md:w-[340px] flex-shrink-0 flex flex-col transition-all duration-300 transform hover:-translate-y-1"
                  >
                    <ProgramCard prog={prog} onClick={() => onProgramClick(prog.id)} />
                  </div>
                ))}
              </div>

              {/* Navigation Indicators and Autoplay Control */}
              {recommendedPrograms.length > 1 && (
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center space-x-1.5">
                    {recommendedPrograms.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => scrollToIndex(i)}
                        className={`h-2 rounded-full transition-all cursor-pointer ${
                          i === currentSlideIndex
                            ? "w-6 bg-blue-600 shadow-2xs"
                            : "w-2 bg-blue-200 hover:bg-blue-300"
                        }`}
                        aria-label={`추천 공고 ${i + 1}번 보기`}
                      />
                    ))}
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => handleScrollCarousel("left")}
                      aria-label="이전 추천 공고"
                      className="w-9 h-9 rounded-full bg-white border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-slate-300 text-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsAutoPlay(!isAutoPlay)}
                      title={isAutoPlay ? "자동 롤링 일시정지" : "자동 롤링 재생"}
                      aria-label={isAutoPlay ? "자동 롤링 일시정지" : "자동 롤링 재생"}
                      className={`w-9 h-9 rounded-full border shadow-sm flex items-center justify-center transition-all cursor-pointer shadow-2xs ${
                        isAutoPlay
                          ? "bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100"
                          : "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700"
                      }`}
                    >
                      {isAutoPlay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleScrollCarousel("right")}
                      aria-label="다음 추천 공고"
                      className="w-9 h-9 rounded-full bg-white border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-slate-300 text-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-slate-500 space-y-2">
              <p>현재 기업 조건에 딱 맞는 전용 추천 공고를 조회 중입니다.</p>
              <p className="text-slate-400">아래 전체 공고 검색에서 원하는 지원사업을 탐색해 보세요.</p>
            </div>
          )}
        </div>
      ) : isLoggedIn && !myCompany ? (
        /* 2. Logged in BUT profile not registered yet */
        <div className="bg-white border border-blue-200/80 rounded-3xl p-5 sm:p-6 flex items-center justify-between flex-wrap gap-4 shadow-xs">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center flex-shrink-0 text-blue-600 shadow-2xs">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm sm:text-base text-slate-900">
                내 기업 맞춤형 지원사업만 1초 만에 모아보세요
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                기업 프로필(업력, 업종, 소재지)을 등록하면 자동 롤링 캐러셀로 합격 확률이 높은 전용 공고를 자동 추천해 드립니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenCompanyModal}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-sm shadow-blue-600/20 cursor-pointer transition-all flex items-center space-x-1.5"
          >
            <span>기업 프로필 등록하기</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        /* 3. Not Logged In: Guide user to Log in */
        <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white border border-blue-200/80 rounded-3xl p-5 sm:p-6 flex items-center justify-between flex-wrap gap-4 shadow-xs">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center flex-shrink-0 text-white shadow-sm shadow-blue-600/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm sm:text-base text-slate-900">
                로그인하고 내 기업 맞춤 지원사업을 추천받아 보세요
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                로그인 후 기업 정보(업력, 업종, 소재지)를 등록하시면 합격률 높은 맞춤형 정부지원사업을 1초 만에 큐레이션해 드립니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-sm shadow-blue-600/25 cursor-pointer transition-all flex items-center space-x-1.5"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>로그인하고 맞춤 공고 보기</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </section>
  );
};
