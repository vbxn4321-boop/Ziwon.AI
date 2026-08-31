"use client";

import React from "react";
import {
  Clock,
  Flame,
  Sparkles,
  AlertTriangle,
  Layers,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { ProgramCard, SupportProgram } from "../ProgramCard";

interface ProgramListGridProps {
  programs: SupportProgram[];
  totalCount: number;
  loading: boolean;
  currentPage: number;
  totalPages: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  onProgramClick: (id: string) => void;
  onResetFilters: () => void;
  timeFilter: "today" | "recent" | "urgent" | "all";
  onlyClosed: boolean;
}

export const ProgramListGrid: React.FC<ProgramListGridProps> = ({
  programs,
  totalCount,
  loading,
  currentPage,
  totalPages,
  pageSize = 9,
  onPageChange,
  onProgramClick,
  onResetFilters,
  timeFilter,
  onlyClosed,
}) => {
  // Generate 5-page window around current page
  const getPageNumbers = (current: number, total: number, maxVisible = 5) => {
    if (total <= maxVisible) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    let start = Math.max(1, current - Math.floor(maxVisible / 2));
    let end = start + maxVisible - 1;
    if (end > total) {
      end = total;
      start = Math.max(1, end - maxVisible + 1);
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const pageNumbers = getPageNumbers(currentPage, totalPages, 5);

  const startItemIndex = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItemIndex = Math.min(currentPage * pageSize, totalCount);

  return (
    <main
      id="program-list-section"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 w-full flex-1 space-y-5"
    >
      {/* Active Filter Section Header */}
      <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
        <h2 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
          {onlyClosed ? (
            <>
              <Clock className="w-4 h-4 text-rose-600" />
              <span>🔴 마감 완료된 공고 목록</span>
            </>
          ) : timeFilter === "today" ? (
            <>
              <Flame className="w-4 h-4 text-blue-600 animate-pulse" />
              <span>🔥 오늘 새로 수집된 신규 지원사업</span>
            </>
          ) : timeFilter === "recent" ? (
            <>
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>✨ 최근 3일간 수집된 신규 지원사업</span>
            </>
          ) : timeFilter === "urgent" ? (
            <>
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>🚨 마감 7일 이내 임박 지원사업</span>
            </>
          ) : (
            <>
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>⚡ 전체 진행 중 지원사업 목록</span>
            </>
          )}
          <span className="text-xs font-normal text-slate-500 ml-2">
            (총 {totalCount.toLocaleString()}개 공고 중 {startItemIndex}-{endItemIndex}번째)
          </span>
        </h2>

        {totalPages > 1 && (
          <span className="text-xs font-bold text-slate-500">
            페이지 <span className="text-blue-600 font-extrabold">{currentPage}</span> / {totalPages}
          </span>
        )}
      </div>

      {/* Program Card Grid Feed */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {[...Array(pageSize)].map((_, i) => (
            <div
              key={i}
              className="bg-white p-6 rounded-2xl space-y-4 animate-pulse border border-slate-200"
            >
              <div className="flex justify-between items-center">
                <div className="h-5 w-20 bg-slate-200 rounded-full" />
                <div className="h-5 w-16 bg-slate-200 rounded-full" />
              </div>
              <div className="h-6 w-3/4 bg-slate-200 rounded-lg" />
              <div className="h-4 w-1/2 bg-slate-200 rounded-lg" />
            </div>
          ))}
        </div>
      ) : programs.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3 shadow-xs">
          <p className="text-slate-600 text-sm">선택한 조건에 일치하는 공고가 없습니다.</p>
          <button
            onClick={onResetFilters}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer"
          >
            필터 초기화
          </button>
        </div>
      ) : (
        <div className="space-y-6 pt-2">
          {/* 3x3 Cards Grid (9 items per page) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {programs.map((prog) => (
              <ProgramCard
                key={prog.id}
                prog={prog}
                onClick={() => onProgramClick(prog.id)}
              />
            ))}
          </div>

          {/* Numbered Page Pagination Controller */}
          {totalPages > 1 && (
            <div className="pt-6 pb-8 flex flex-col items-center justify-center space-y-3">
              <nav
                className="inline-flex items-center space-x-1.5 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-xs"
                aria-label="공고 페이지 이동"
              >
                {/* First Page Button */}
                <button
                  type="button"
                  onClick={() => onPageChange(1)}
                  disabled={currentPage === 1}
                  title="첫 페이지"
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-all"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>

                {/* Prev Page Button */}
                <button
                  type="button"
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  title="이전 페이지"
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Page Number Buttons */}
                <div className="flex items-center space-x-1 px-1">
                  {pageNumbers.map((num) => {
                    const isActive = num === currentPage;
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => onPageChange(num)}
                        className={`min-w-9 h-9 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                          isActive
                            ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30 scale-105"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        }`}
                        aria-current={isActive ? "page" : undefined}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>

                {/* Next Page Button */}
                <button
                  type="button"
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  title="다음 페이지"
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Last Page Button */}
                <button
                  type="button"
                  onClick={() => onPageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  title="마지막 페이지"
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-all"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </nav>
            </div>
          )}
        </div>
      )}
    </main>
  );
};
