"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Header } from "../components/Header";
import { SupportProgram } from "../components/ProgramCard";
import { PsstPlanGenerator } from "../components/PsstPlanGenerator";
import Footer from "../components/Footer";
import CompanyProfileModal from "../components/auth/CompanyProfileModal";
import { fetchPlanDetail, fetchMyCompany } from "@/lib/backend-client";
import { supabase, getJwtToken } from "@/lib/supabase-client";

// Modularized Sub-Components
import { LiveBriefingBanner, StatsData } from "@/components/home/LiveBriefingBanner";
import { RecommendationCarousel } from "@/components/home/RecommendationCarousel";
import { FilterSection, FilterItem } from "@/components/home/FilterSection";
import { ProgramListGrid } from "@/components/home/ProgramListGrid";

// Memory cache store for instant navigation restoration (SWR pattern)
const memoryProgramsCache = new Map<
  string,
  {
    programs: SupportProgram[];
    total: number;
    hasMore: boolean;
    timestamp: number;
  }
>();

let memoryFiltersCache: {
  categories: FilterItem[];
  regions: FilterItem[];
  organizers: FilterItem[];
  stats: StatsData;
  timestamp: number;
} | null = null;

function HomePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [activeNavTab, setActiveNavTab] = useState<"notices" | "psst">("notices");
  const [selectedTargetProgramForPlan, setSelectedTargetProgramForPlan] = useState<string>("");
  const [selectedPlanToLoad, setSelectedPlanToLoad] = useState<any>(null);

  const [programs, setPrograms] = useState<SupportProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // User Company Profile & Tailored Recommendations
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [myCompany, setMyCompany] = useState<any>(null);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [recommendedPrograms, setRecommendedPrograms] = useState<SupportProgram[]>([]);
  const [loadingRecommended, setLoadingRecommended] = useState(false);

  // Live Feed Notification for Newly Collected Notices
  const [newlyArrivedPrograms, setNewlyArrivedPrograms] = useState<SupportProgram[]>([]);

  // 1. Time / Curation Quick Filter: 'today' | 'recent' | 'urgent' | 'all'
  const [timeFilter, setTimeFilter] = useState<"today" | "recent" | "urgent" | "all">("all");

  // 2. Sort Options: 'latest' | 'deadline'
  const [sortOption, setSortOption] = useState<"latest" | "deadline">("latest");

  // 3. Closed Notice Mode Filter
  const [onlyClosed, setOnlyClosed] = useState(false);

  // 4. Live DB Briefing Stats
  const [stats, setStats] = useState<StatsData>(
    memoryFiltersCache?.stats || {
      totalCount: 0,
      activeCount: 0,
      todayCount: 0,
      recentCount: 0,
      urgentCount: 0,
    }
  );

  const [dbCategories, setDbCategories] = useState<FilterItem[]>(
    memoryFiltersCache?.categories || [{ name: "전체", count: 0 }]
  );
  const [dbRegions, setDbRegions] = useState<FilterItem[]>(
    memoryFiltersCache?.regions || [{ name: "전체", count: 0 }]
  );
  const [dbOrganizers, setDbOrganizers] = useState<FilterItem[]>(
    memoryFiltersCache?.organizers || [{ name: "전체", count: 0 }]
  );

  // Top Nav Unified Portal Filter: 'all' | 'bizinfo' | 'kstartup'
  const [mainPortalMode, setMainPortalMode] = useState<"all" | "bizinfo" | "kstartup">("all");

  // Unified Smart Sub-Filter Tab Mode: 'category' | 'ministry' | 'region' | 'stage'
  const [filterTabMode, setFilterTabMode] = useState<"category" | "ministry" | "region" | "stage">("category");
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [selectedOrganizer, setSelectedOrganizer] = useState("전체");
  const [selectedRegion, setSelectedRegion] = useState("전체");
  const [selectedStage, setSelectedStage] = useState("전체");

  // Filter Expansion & Sub-segment states
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [organizerSegment, setOrganizerSegment] = useState<"all" | "public" | "private">("all");
  const [organizerSearch, setOrganizerSearch] = useState("");

  const getFilterKey = (query = searchQuery) => {
    return `${mainPortalMode}_${filterTabMode}_${selectedCategory}_${selectedOrganizer}_${selectedRegion}_${selectedStage}_${timeFilter}_${sortOption}_${onlyClosed}_${query.trim()}`;
  };

  // 1. Initial Load & Auth Sync
  useEffect(() => {
    fetchFiltersFromDb();
    loadUserCompanyProfile();

    const handleAuthChange = () => {
      loadUserCompanyProfile();
    };
    window.addEventListener("ziwon_auth_change", handleAuthChange);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUserCompanyProfile();
    });

    return () => {
      window.removeEventListener("ziwon_auth_change", handleAuthChange);
      subscription.unsubscribe();
    };
  }, []);

  // Process URL Query Parameters
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const planIdParam = searchParams.get("planId");
    const programTitleParam = searchParams.get("programTitle");

    if (tabParam === "psst") {
      setActiveNavTab("psst");
      if (programTitleParam) {
        setSelectedTargetProgramForPlan(programTitleParam);
      }
      if (planIdParam) {
        (async () => {
          try {
            const token = await getJwtToken();
            if (token) {
              const plan = await fetchPlanDetail(token, planIdParam);
              if (plan && plan.planJson) {
                const parsed = JSON.parse(plan.planJson);
                setSelectedPlanToLoad(parsed);
                setSelectedTargetProgramForPlan(plan.targetProgramTitle || plan.title || "");
              }
            }
          } catch (err) {
            console.error("Failed to load plan from URL:", err);
          }
        })();
      }
    } else {
      setActiveNavTab("notices");
    }
  }, [searchParams]);

  // Load User Company Profile
  const loadUserCompanyProfile = async () => {
    try {
      const token = await getJwtToken();
      if (!token) {
        setIsLoggedIn(false);
        setMyCompany(null);
        setRecommendedPrograms([]);
        return;
      }
      setIsLoggedIn(true);
      const comp = await fetchMyCompany(token);
      if (comp && comp.name) {
        setMyCompany(comp);
        fetchTailoredRecommendations(comp);
      } else {
        setMyCompany(null);
        setRecommendedPrograms([]);
      }
    } catch (e) {
      console.warn("Failed to load company profile:", e);
      setIsLoggedIn(false);
      setMyCompany(null);
      setRecommendedPrograms([]);
    }
  };

  // Fetch Tailored Recommendations
  const fetchTailoredRecommendations = async (company: any) => {
    try {
      setLoadingRecommended(true);
      const params = new URLSearchParams();
      params.set("limit", "10");
      params.set("onlyActive", "true");
      if (company.region && company.region !== "전국") {
        params.set("region", company.region);
      }
      if (company.industry) {
        params.set("industry", company.industry);
      }
      const res = await fetch(`/api/support-programs?${params.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setRecommendedPrograms(json.data);
      }
    } catch (e) {
      console.error("Failed to fetch recommendations:", e);
    } finally {
      setLoadingRecommended(false);
    }
  };

  // Fetch Dynamic DB Filters & Live Briefing Stats
  const fetchFiltersFromDb = async (
    portalMode = mainPortalMode,
    closed = onlyClosed,
    time = timeFilter
  ) => {
    try {
      const params = new URLSearchParams();
      if (portalMode === "bizinfo") params.set("source", "BIZINFO");
      if (portalMode === "kstartup") params.set("source", "K_STARTUP");
      if (closed) params.set("onlyClosed", "true");
      if (time && time !== "all") params.set("timeFilter", time);

      const res = await fetch(`/api/filters?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        const cats = json.data.categories || [{ name: "전체", count: 0 }];
        const regs = json.data.regions || [{ name: "전체", count: 0 }];
        const orgs = json.data.organizers || [{ name: "전체", count: 0 }];
        const newStats = json.stats || {
          totalCount: json.totalCount || 0,
          activeCount: json.stats?.activeCount || 0,
          todayCount: json.stats?.todayCount || 0,
          recentCount: json.stats?.recentCount || 0,
          urgentCount: json.stats?.urgentCount || 0,
        };

        setDbCategories(cats);
        setDbRegions(regs);
        setDbOrganizers(orgs);
        setStats(newStats);
      }
    } catch (error) {
      console.error("Failed to fetch dynamic DB filters:", error);
    }
  };

  useEffect(() => {
    fetchFiltersFromDb(mainPortalMode, onlyClosed, timeFilter);
  }, [mainPortalMode, onlyClosed, timeFilter]);

  // Fetch Support Programs from API
  const fetchPrograms = async (
    pageNumber = 1,
    query = searchQuery,
    isInitial = false
  ) => {
    try {
      if (pageNumber === 1) setLoading(true);
      else setLoadingMore(true);

      const cacheKey = getFilterKey(query);
      if (
        pageNumber === 1 &&
        isInitial &&
        memoryProgramsCache.has(cacheKey)
      ) {
        const cached = memoryProgramsCache.get(cacheKey)!;
        if (Date.now() - cached.timestamp < 1000 * 60 * 3) {
          setPrograms(cached.programs);
          setTotalCount(cached.total);
          setHasMore(cached.hasMore);
          setLoading(false);
          return;
        }
      }

      const params = new URLSearchParams();
      params.set("page", String(pageNumber));
      params.set("limit", "9");

      if (mainPortalMode === "bizinfo") params.set("source", "BIZINFO");
      if (mainPortalMode === "kstartup") params.set("source", "K_STARTUP");

      if (selectedCategory !== "전체") params.set("category", selectedCategory);
      if (selectedOrganizer !== "전체") params.set("organizer", selectedOrganizer);
      if (selectedRegion !== "전체") params.set("region", selectedRegion);
      if (selectedStage !== "전체") params.set("stage", selectedStage);

      if (onlyClosed) {
        params.set("onlyClosed", "true");
      } else {
        if (timeFilter === "today") params.set("timeFilter", "today");
        else if (timeFilter === "recent") params.set("timeFilter", "recent");
        else if (timeFilter === "urgent") {
          params.set("timeFilter", "urgent");
          params.set("sort", "deadline");
        } else {
          params.set("timeFilter", "all");
          params.set("onlyActive", "true");
        }
      }

      if (sortOption === "deadline" && timeFilter !== "urgent") {
        params.set("sort", "deadline");
      }

      if (query.trim()) params.set("q", query.trim());

      const res = await fetch(`/api/support-programs?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        const newPrograms = json.data || [];
        const total = json.total ?? json.totalCount ?? json.pagination?.total ?? 0;

        setPrograms(newPrograms);
        setTotalCount(total);
        setHasMore(false);

        if (pageNumber === 1) {
          memoryProgramsCache.set(cacheKey, {
            programs: newPrograms,
            total,
            hasMore: false,
            timestamp: Date.now(),
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch programs:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Trigger Fetch when Filters Change
  useEffect(() => {
    setPage(1);
    fetchPrograms(1, searchQuery, true);
  }, [
    mainPortalMode,
    filterTabMode,
    selectedCategory,
    selectedOrganizer,
    selectedRegion,
    selectedStage,
    timeFilter,
    sortOption,
    onlyClosed,
  ]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPrograms(1, searchQuery);
  };

  const handleQuickTagClick = (tag: string) => {
    setSearchQuery(tag);
    setPage(1);
    fetchPrograms(1, tag);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchPrograms(newPage, searchQuery);
    const targetEl = document.getElementById("program-list-section");
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 480, behavior: "smooth" });
    }
  };

  const resetAllFilters = () => {
    setMainPortalMode("all");
    setFilterTabMode("category");
    setSelectedCategory("전체");
    setSelectedOrganizer("전체");
    setSelectedRegion("전체");
    setSelectedStage("전체");
    setTimeFilter("all");
    setSortOption("latest");
    setOnlyClosed(false);
    setSearchQuery("");
    setOrganizerSearch("");
    setOrganizerSegment("all");
    setIsFilterExpanded(false);
    setPage(1);
  };

  const handleApplyNewPrograms = () => {
    setPrograms((prev) => [...newlyArrivedPrograms, ...prev]);
    setNewlyArrivedPrograms([]);
    window.scrollTo({ top: 400, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col selection:bg-blue-600 selection:text-white font-sans antialiased">
      <Header
        activeNavTab={activeNavTab}
        setActiveNavTab={(tab: "notices" | "psst") => {
          setActiveNavTab(tab);
          if (tab === "psst") {
            setSelectedPlanToLoad(null);
            setSelectedTargetProgramForPlan("");
          }
        }}
        mainPortalMode={mainPortalMode === "all" ? "bizinfo" : mainPortalMode}
        setMainPortalMode={setMainPortalMode}
        totalCount={totalCount}
      />

      {/* VIEW 1: PSST BUSINESS PLAN GENERATOR */}
      {activeNavTab === "psst" ? (
        <main className="w-full flex-1 flex flex-col overflow-hidden">
          <PsstPlanGenerator
            initialProgramTitle={selectedTargetProgramForPlan}
            initialPlanData={selectedPlanToLoad}
            onBackToNotices={() => {
              setActiveNavTab("notices");
              setSelectedPlanToLoad(null);
            }}
          />
        </main>
      ) : (
        /* VIEW 2: SUPPORT PROGRAM NOTICES */
        <div className="flex-1 flex flex-col space-y-6">
          {/* Floating Toast Notification for Fresh Incoming Programs */}
          {newlyArrivedPrograms.length > 0 && (
            <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce">
              <button
                onClick={handleApplyNewPrograms}
                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-extrabold text-xs shadow-2xl shadow-blue-500/30 border border-blue-400 flex items-center space-x-2 cursor-pointer hover:scale-105 transition-transform"
              >
                <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
                <span>새로 수집된 공고 {newlyArrivedPrograms.length}건이 있습니다 [지금 보기 ↻]</span>
              </button>
            </div>
          )}

          {/* 1. Hero & Live Briefing Stats Section */}
          <LiveBriefingBanner
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onSearch={handleSearch}
            onQuickTagClick={handleQuickTagClick}
            stats={stats}
            timeFilter={timeFilter}
            setTimeFilter={setTimeFilter}
            setSortOption={setSortOption}
            onlyClosed={onlyClosed}
            setOnlyClosed={setOnlyClosed}
          />

          {/* 2. Personalized Recommendation Auto-Carousel */}
          <RecommendationCarousel
            myCompany={myCompany}
            isLoggedIn={isLoggedIn}
            recommendedPrograms={recommendedPrograms}
            loadingRecommended={loadingRecommended}
            onOpenCompanyModal={() => {
              if (!isLoggedIn) {
                router.push("/login");
              } else {
                setIsCompanyModalOpen(true);
              }
            }}
            onProgramClick={(id) => router.push(`/programs/${id}`)}
          />

          {/* 3. Unified Smart Filter Section */}
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

          {/* 4. Support Program Card Feed Grid */}
          <ProgramListGrid
            programs={programs}
            totalCount={totalCount}
            loading={loading}
            currentPage={page}
            totalPages={Math.max(1, Math.ceil(totalCount / 9))}
            pageSize={9}
            onPageChange={handlePageChange}
            onProgramClick={(id) => router.push(`/programs/${id}`)}
            onResetFilters={resetAllFilters}
            timeFilter={timeFilter}
            onlyClosed={onlyClosed}
          />
        </div>
      )}

      {/* Company Profile Modal */}
      <CompanyProfileModal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        onSaved={(comp) => {
          setMyCompany(comp);
          setIsCompanyModalOpen(false);
          if (comp) fetchTailoredRecommendations(comp);
        }}
      />

      <Footer />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] text-slate-500 text-xs">
          지원사업 공고를 불러오는 중입니다...
        </div>
      }
    >
      <HomePageContent />
    </Suspense>
  );
}
