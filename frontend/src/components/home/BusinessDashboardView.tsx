"use client";

import React from "react";
import { BentoHeroSection } from "./BentoHeroSection";
import { RecommendationCarousel } from "./RecommendationCarousel";
import { FilterSection, FilterItem } from "./FilterSection";
import { ProgramListGrid } from "./ProgramListGrid";
import { StatsData } from "./LiveBriefingBanner";
import { SupportProgram } from "../ProgramCard";

interface BusinessDashboardViewProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSearch: (e: React.FormEvent) => void;
  onQuickTagClick: (tag: string) => void;
  stats: StatsData;
  timeFilter: "today" | "recent" | "urgent" | "all";
  setTimeFilter: (f: "today" | "recent" | "urgent" | "all") => void;
  sortOption: "latest" | "deadline";
  setSortOption: (s: "latest" | "deadline") => void;
  onlyClosed: boolean;
  setOnlyClosed: (c: boolean) => void;
  onNavigateToPsst: () => void;
  myCompany: any;
  isLoggedIn: boolean;
  recommendedPrograms: SupportProgram[];
  loadingRecommended: boolean;
  onOpenCompanyModal: () => void;
  mainPortalMode: "all" | "bizinfo" | "kstartup";
  setMainPortalMode: (m: "all" | "bizinfo" | "kstartup") => void;
  resetAllFilters: () => void;
  filterTabMode: "category" | "ministry" | "region" | "stage";
  setFilterTabMode: (t: "category" | "ministry" | "region" | "stage") => void;
  isFilterExpanded: boolean;
  setIsFilterExpanded: (e: boolean | ((p: boolean) => boolean)) => void;
  totalCount: number;
  dbCategories: FilterItem[];
  dbOrganizers: FilterItem[];
  dbRegions: FilterItem[];
  selectedCategory: string;
  setSelectedCategory: (c: string) => void;
  selectedOrganizer: string;
  setSelectedOrganizer: (o: string) => void;
  selectedRegion: string;
  setSelectedRegion: (r: string) => void;
  selectedStage: string;
  setSelectedStage: (s: string) => void;
  organizerSegment: "all" | "public" | "private";
  setOrganizerSegment: (s: "all" | "public" | "private") => void;
  organizerSearch: string;
  setOrganizerSearch: (s: string) => void;
  programs: SupportProgram[];
  loading: boolean;
  page: number;
  onPageChange: (p: number) => void;
  onProgramClick: (id: string) => void;
}

export const BusinessDashboardView: React.FC<BusinessDashboardViewProps> = ({
  searchQuery,
  setSearchQuery,
  onSearch,
  onQuickTagClick,
  stats,
  timeFilter,
  setTimeFilter,
  sortOption,
  setSortOption,
  onlyClosed,
  setOnlyClosed,
  onNavigateToPsst,
  myCompany,
  isLoggedIn,
  recommendedPrograms,
  loadingRecommended,
  onOpenCompanyModal,
  mainPortalMode,
  setMainPortalMode,
  resetAllFilters,
  filterTabMode,
  setFilterTabMode,
  isFilterExpanded,
  setIsFilterExpanded,
  totalCount,
  dbCategories,
  dbOrganizers,
  dbRegions,
  selectedCategory,
  setSelectedCategory,
  selectedOrganizer,
  setSelectedOrganizer,
  selectedRegion,
  setSelectedRegion,
  selectedStage,
  setSelectedStage,
  organizerSegment,
  setOrganizerSegment,
  organizerSearch,
  setOrganizerSearch,
  programs,
  loading,
  page,
  onPageChange,
  onProgramClick,
}) => {
  return (
    <div className="space-y-6">
      {/* 1. Bento Grid Hero & Real-time Live Stats */}
      <BentoHeroSection
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearch={onSearch}
        onQuickTagClick={onQuickTagClick}
        stats={stats}
        timeFilter={timeFilter}
        setTimeFilter={setTimeFilter}
        setSortOption={setSortOption}
        onlyClosed={onlyClosed}
        setOnlyClosed={setOnlyClosed}
        onNavigateToPsst={onNavigateToPsst}
      />

      {/* 2. Registered Company Personalized Recommendations */}
      <RecommendationCarousel
        myCompany={myCompany}
        isLoggedIn={isLoggedIn}
        recommendedPrograms={recommendedPrograms}
        loadingRecommended={loadingRecommended}
        onOpenCompanyModal={onOpenCompanyModal}
        onProgramClick={onProgramClick}
      />

      {/* 3. Comprehensive Smart Filters for Businesses */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <FilterSection
          mainPortalMode={mainPortalMode}
          setMainPortalMode={setMainPortalMode}
          sortOption={sortOption}
          setSortOption={setSortOption}
          onlyClosed={onlyClosed}
          setOnlyClosed={setOnlyClosed}
          resetAllFilters={resetAllFilters}
          filterTabMode={filterTabMode}
          setFilterTabMode={setFilterTabMode}
          isFilterExpanded={isFilterExpanded}
          setIsFilterExpanded={setIsFilterExpanded}
          totalCount={totalCount}
          dbCategories={dbCategories}
          dbOrganizers={dbOrganizers}
          dbRegions={dbRegions}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          selectedOrganizer={selectedOrganizer}
          setSelectedOrganizer={setSelectedOrganizer}
          selectedRegion={selectedRegion}
          setSelectedRegion={setSelectedRegion}
          selectedStage={selectedStage}
          setSelectedStage={setSelectedStage}
          organizerSegment={organizerSegment}
          setOrganizerSegment={setOrganizerSegment}
          organizerSearch={organizerSearch}
          setOrganizerSearch={setOrganizerSearch}
        />
      </div>

      {/* 4. Support Program Feed Grid (9 per page) */}
      <ProgramListGrid
        programs={programs}
        totalCount={totalCount}
        loading={loading}
        currentPage={page}
        totalPages={Math.max(1, Math.ceil(totalCount / 9))}
        pageSize={9}
        onPageChange={onPageChange}
        onProgramClick={onProgramClick}
        onResetFilters={resetAllFilters}
        timeFilter={timeFilter}
        onlyClosed={onlyClosed}
      />
    </div>
  );
};
