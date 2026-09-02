"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";
import { BusinessDashboardView } from "@/components/home/BusinessDashboardView";
import { FilterItem } from "@/components/home/FilterSection";
import { StatsData } from "@/components/home/LiveBriefingBanner";
import CompanyProfileModal from "@/components/auth/CompanyProfileModal";
import { SupportProgram } from "@/components/ProgramCard";
import { supabase, getJwtToken } from "@/lib/supabase-client";
import { getInMemoryUser } from "@/lib/auth-store";
import { fetchMyCompany } from "@/lib/backend-client";

// Module-level global cache that survives page unmounts during router navigation
const globalDashboardCache = new Map<string, { programs: SupportProgram[]; total: number }>();
const globalDashboardFiltersCache = new Map<string, any>();
let globalSavedDashboardState: {
  searchQuery: string;
  selectedCategory: string;
  selectedOrganizer: string;
  selectedRegion: string;
  selectedStage: string;
  timeFilter: "today" | "recent" | "urgent" | "all";
  sortOption: "latest" | "deadline";
  onlyClosed: boolean;
  mainPortalMode: "all" | "bizinfo" | "kstartup";
  page: number;
  scrollY: number;
} | null = null;

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(() => globalSavedDashboardState?.searchQuery || "");
  const [selectedCategory, setSelectedCategory] = useState(() => globalSavedDashboardState?.selectedCategory || "");
  const [selectedOrganizer, setSelectedOrganizer] = useState(() => globalSavedDashboardState?.selectedOrganizer || "");
  const [selectedRegion, setSelectedRegion] = useState(() => globalSavedDashboardState?.selectedRegion || "");
  const [selectedStage, setSelectedStage] = useState(() => globalSavedDashboardState?.selectedStage || "");
  const [timeFilter, setTimeFilter] = useState<"today" | "recent" | "urgent" | "all">(() => globalSavedDashboardState?.timeFilter || "all");
  const [sortOption, setSortOption] = useState<"latest" | "deadline">(() => globalSavedDashboardState?.sortOption || "latest");
  const [onlyClosed, setOnlyClosed] = useState(() => globalSavedDashboardState?.onlyClosed || false);
  const [mainPortalMode, setMainPortalMode] = useState<"all" | "bizinfo" | "kstartup">(() => globalSavedDashboardState?.mainPortalMode || "all");
  const [page, setPage] = useState(() => globalSavedDashboardState?.page || 1);

  const initialKey = JSON.stringify({
    page: globalSavedDashboardState?.page || 1,
    searchQuery: (globalSavedDashboardState?.searchQuery || "").trim(),
    selectedCategory: globalSavedDashboardState?.selectedCategory || "",
    selectedOrganizer: globalSavedDashboardState?.selectedOrganizer || "",
    selectedRegion: globalSavedDashboardState?.selectedRegion || "",
    selectedStage: globalSavedDashboardState?.selectedStage || "",
    timeFilter: globalSavedDashboardState?.timeFilter || "all",
    sortOption: globalSavedDashboardState?.sortOption || "latest",
    onlyClosed: globalSavedDashboardState?.onlyClosed || false,
    mainPortalMode: globalSavedDashboardState?.mainPortalMode || "all",
  });

  const initialCached = globalDashboardCache.get(initialKey);

  const [totalCount, setTotalCount] = useState(() => initialCached?.total || 0);
  const [programs, setPrograms] = useState<SupportProgram[]>(() => initialCached?.programs || []);
  const [loading, setLoading] = useState(() => !initialCached);

  // Restore scroll position on back navigation
  useEffect(() => {
    if (globalSavedDashboardState?.scrollY) {
      const savedY = globalSavedDashboardState.scrollY;
      requestAnimationFrame(() => {
        window.scrollTo({ top: savedY, behavior: "instant" as any });
      });
    }
  }, []);

  // Stats & Dynamic Filters
  const [stats, setStats] = useState<StatsData>({
    totalCount: 1662,
    activeCount: 1662,
    todayCount: 0,
    recentCount: 60,
    urgentCount: 223,
  });
  const [dbCategories, setDbCategories] = useState<FilterItem[]>([]);
  const [dbOrganizers, setDbOrganizers] = useState<FilterItem[]>([]);
  const [dbRegions, setDbRegions] = useState<FilterItem[]>([]);

  const [filterTabMode, setFilterTabMode] = useState<"category" | "ministry" | "region" | "stage">("category");
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [organizerSegment, setOrganizerSegment] = useState<"all" | "public" | "private">("all");
  const [organizerSearch, setOrganizerSearch] = useState("");

  // Auth & Profile
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [myCompany, setMyCompany] = useState<any>(null);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [recommendedPrograms, setRecommendedPrograms] = useState<SupportProgram[]>([]);
  const [loadingRecommended, setLoadingRecommended] = useState(false);

  // Recommendations Loader
  const fetchTailoredRecommendations = async (company: any) => {
    if (!company) return;
    try {
      setLoadingRecommended(true);
      const res = await fetch(`/api/support-programs?limit=4&sortBy=deadline`);
      if (res.ok) {
        const json = await res.json();
        setRecommendedPrograms(json.data || []);
      }
    } catch (e) {
      console.warn("Failed to load recommendations:", e);
    } finally {
      setLoadingRecommended(false);
    }
  };

  const syncUserAndCompany = async () => {
    let currentUser: any = getInMemoryUser();

    if (!currentUser) {
      const token = await getJwtToken();
      if (token) {
        currentUser = getInMemoryUser();
      }
    }

    if (!currentUser) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        currentUser = session.user;
      }
    }

    if (currentUser) {
      setIsLoggedIn(true);
      try {
        const comp = await fetchMyCompany();
        setMyCompany(comp);
        if (comp) {
          fetchTailoredRecommendations(comp);
        }
      } catch (e) {
        console.warn("Failed to fetch company profile:", e);
      }
    } else {
      setIsLoggedIn(false);
      setMyCompany(null);
      setRecommendedPrograms([]);
      router.push("/login?redirect=/dashboard");
    }
  };

  useEffect(() => {
    syncUserAndCompany();

    const handleAuthChange = () => syncUserAndCompany();
    window.addEventListener("ziwon_auth_change", handleAuthChange);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        syncUserAndCompany();
      }
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("ziwon_auth_change", handleAuthChange);
    };
  }, []);

  const fetchFilters = async () => {
    const cacheKey = `filters_${onlyClosed}`;
    if (globalDashboardFiltersCache.has(cacheKey)) {
      const data = globalDashboardFiltersCache.get(cacheKey);
      if (data.stats) setStats(data.stats);
      setDbCategories(data.categories);
      setDbOrganizers(data.organizers);
      setDbRegions(data.regions);
      return;
    }

    try {
      const params = new URLSearchParams();
      if (onlyClosed) params.set("onlyClosed", "true");

      const res = await fetch(`/api/filters?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        const catList = data.categories || data.data?.categories || [];
        const orgList = data.organizers || data.data?.organizers || [];
        const regList = data.regions || data.data?.regions || [];
        if (data.stats) setStats(data.stats);
        setDbCategories(catList);
        setDbOrganizers(orgList);
        setDbRegions(regList);

        globalDashboardFiltersCache.set(cacheKey, {
          stats: data.stats,
          categories: catList,
          organizers: orgList,
          regions: regList,
        });
      }
    } catch (e) {
      console.warn("Failed to fetch filters:", e);
    }
  };

  useEffect(() => {
    fetchFilters();
  }, [onlyClosed]);

  const fetchPrograms = async (skipCache = false) => {
    const cacheKey = JSON.stringify({
      page,
      searchQuery: searchQuery.trim(),
      selectedCategory,
      selectedOrganizer,
      selectedRegion,
      selectedStage,
      timeFilter,
      sortOption,
      onlyClosed,
      mainPortalMode,
    });

    const params = new URLSearchParams({
      page: page.toString(),
      limit: "9",
      search: searchQuery,
      category: selectedCategory,
      organizer: selectedOrganizer,
      region: selectedRegion,
      stage: selectedStage,
      timeFilter,
      sort: sortOption,
      onlyClosed: onlyClosed ? "true" : "false",
    });

    if (mainPortalMode !== "all") {
      params.set("portal", mainPortalMode);
    }

    // 1. Instant Cache Hit (Stale: 0ms 즉시 화면 표시)
    if (!skipCache && globalDashboardCache.has(cacheKey)) {
      const cached = globalDashboardCache.get(cacheKey)!;
      setPrograms(cached.programs);
      setTotalCount(cached.total);
      setLoading(false);

      // 2. Background Revalidation (While-Revalidate: 백그라운드에서 조용히 최신 데이터 검증 및 신규 공고 자동 업데이트)
      fetch(`/api/support-programs?${params.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          const freshList = data.programs || data.data || [];
          const freshTotal = data.total || data.totalCount || 0;
          globalDashboardCache.set(cacheKey, { programs: freshList, total: freshTotal });
          // 새로운 공고가 추가되었거나 변경되었으면 부드럽게 화면 갱신
          if (
            freshTotal !== cached.total ||
            JSON.stringify(freshList.map((p: any) => p.id)) !==
              JSON.stringify(cached.programs.map((p: any) => p.id))
          ) {
            setPrograms(freshList);
            setTotalCount(freshTotal);
          }
        })
        .catch(() => {});
      return;
    }

    // 3. Cache Miss: 최초 로드 시에만 로딩 표시 후 서버 데이터 조회
    setLoading(true);
    try {
      const res = await fetch(`/api/support-programs?${params.toString()}`);
      const data = await res.json();
      const programList = data.programs || data.data || [];
      const total = data.total || data.totalCount || 0;

      // Global cache save
      globalDashboardCache.set(cacheKey, { programs: programList, total });

      setPrograms(programList);
      setTotalCount(total);
    } catch (e) {
      console.error("Failed to load programs:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, [
    page,
    searchQuery,
    selectedCategory,
    selectedOrganizer,
    selectedRegion,
    selectedStage,
    timeFilter,
    sortOption,
    onlyClosed,
    mainPortalMode,
  ]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPrograms(true);
  };

  const handleQuickTagClick = (tag: string) => {
    setSearchQuery(tag);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSelectedCategory("");
    setSelectedOrganizer("");
    setSelectedRegion("");
    setSelectedStage("");
    setSearchQuery("");
    setTimeFilter("all");
    setOnlyClosed(false);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col selection:bg-blue-600 selection:text-white font-sans antialiased">
      <Header activeNavTab="notices" totalCount={totalCount} />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-6">
        <BusinessDashboardView
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSearch={handleSearch}
          onQuickTagClick={handleQuickTagClick}
          stats={stats}
          timeFilter={timeFilter}
          setTimeFilter={(f) => {
            setTimeFilter(f);
            setPage(1);
          }}
          sortOption={sortOption}
          setSortOption={setSortOption}
          onlyClosed={onlyClosed}
          setOnlyClosed={(c) => {
            setOnlyClosed(c);
            setPage(1);
          }}
          onNavigateToPsst={() => router.push("/consultant")}
          myCompany={myCompany}
          isLoggedIn={isLoggedIn}
          recommendedPrograms={recommendedPrograms}
          loadingRecommended={loadingRecommended}
          onOpenCompanyModal={() => {
            if (!isLoggedIn) router.push("/login");
            else setIsCompanyModalOpen(true);
          }}
          mainPortalMode={mainPortalMode}
          setMainPortalMode={(m) => {
            setMainPortalMode(m);
            setPage(1);
          }}
          resetAllFilters={handleResetFilters}
          filterTabMode={filterTabMode}
          setFilterTabMode={setFilterTabMode}
          isFilterExpanded={isFilterExpanded}
          setIsFilterExpanded={setIsFilterExpanded}
          totalCount={totalCount}
          dbCategories={dbCategories}
          dbOrganizers={dbOrganizers}
          dbRegions={dbRegions}
          selectedCategory={selectedCategory}
          setSelectedCategory={(c) => {
            setSelectedCategory(c);
            setPage(1);
          }}
          selectedOrganizer={selectedOrganizer}
          setSelectedOrganizer={(o) => {
            setSelectedOrganizer(o);
            setPage(1);
          }}
          selectedRegion={selectedRegion}
          setSelectedRegion={(r) => {
            setSelectedRegion(r);
            setPage(1);
          }}
          selectedStage={selectedStage}
          setSelectedStage={(s) => {
            setSelectedStage(s);
            setPage(1);
          }}
          organizerSegment={organizerSegment}
          setOrganizerSegment={setOrganizerSegment}
          organizerSearch={organizerSearch}
          setOrganizerSearch={setOrganizerSearch}
          programs={programs}
          loading={loading}
          page={page}
          onPageChange={(p) => {
            setPage(p);
            window.scrollTo({ top: 400, behavior: "smooth" });
          }}
          onProgramClick={(id: string) => {
            globalSavedDashboardState = {
              searchQuery,
              selectedCategory,
              selectedOrganizer,
              selectedRegion,
              selectedStage,
              timeFilter,
              sortOption,
              onlyClosed,
              mainPortalMode,
              page,
              scrollY: window.scrollY,
            };
            router.push(`/programs/${id}`);
          }}
        />
      </main>

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

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center">로딩 중...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
