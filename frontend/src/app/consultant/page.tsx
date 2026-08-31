"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";
import { ConsultantWorkspaceView } from "@/components/home/ConsultantWorkspaceView";
import { FilterItem } from "@/components/home/FilterSection";
import { PsstPlanGenerator } from "@/components/PsstPlanGenerator";
import { SupportProgram } from "@/components/ProgramCard";
import { fetchPlanDetail } from "@/lib/backend-client";
import { getJwtToken, supabase } from "@/lib/supabase-client";

function ConsultantContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Auth Guard
  useEffect(() => {
    const checkAuth = async () => {
      const localToken =
        typeof window !== "undefined" ? localStorage.getItem("ziwon_auth_token") : null;
      if (localToken) return;

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push("/login?redirect=/consultant");
      }
    };
    checkAuth();
  }, [router]);

  const [activeTab, setActiveTab] = useState<"workspace" | "psst">("workspace");
  const [selectedTargetProgramForPlan, setSelectedTargetProgramForPlan] = useState<string>("");
  const [selectedPlanToLoad, setSelectedPlanToLoad] = useState<any>(null);

  const [programs, setPrograms] = useState<SupportProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters & State
  const [timeFilter, setTimeFilter] = useState<"today" | "recent" | "urgent" | "all">("all");
  const [sortOption, setSortOption] = useState<"latest" | "deadline">("latest");
  const [onlyClosed, setOnlyClosed] = useState(false);

  const [dbCategories, setDbCategories] = useState<FilterItem[]>([]);
  const [dbOrganizers, setDbOrganizers] = useState<FilterItem[]>([]);
  const [dbRegions, setDbRegions] = useState<FilterItem[]>([]);

  const [mainPortalMode, setMainPortalMode] = useState<"all" | "bizinfo" | "kstartup">("all");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedOrganizer, setSelectedOrganizer] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedStage, setSelectedStage] = useState("");
  const [filterTabMode, setFilterTabMode] = useState<"category" | "ministry" | "region" | "stage">("category");
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [organizerSegment, setOrganizerSegment] = useState<"all" | "public" | "private">("all");
  const [organizerSearch, setOrganizerSearch] = useState("");

  // Check URL params for direct plan opening
  useEffect(() => {
    const planId = searchParams.get("planId");
    if (planId) {
      getJwtToken().then((token) => {
        if (token) {
          fetchPlanDetail(planId, token).then((plan) => {
            if (plan) {
              setSelectedPlanToLoad(plan);
              setActiveTab("psst");
            }
          });
        }
      });
    }

    const targetTitle = searchParams.get("targetTitle");
    if (targetTitle) {
      setSelectedTargetProgramForPlan(targetTitle);
      setActiveTab("psst");
    }
  }, [searchParams]);

  const fetchFilters = async () => {
    try {
      const res = await fetch("/api/filters");
      const data = await res.json();
      if (data.success) {
        if (data.stats) {
          // stats if needed
        }
        const catList = data.categories || data.data?.categories || [];
        const orgList = data.organizers || data.data?.organizers || [];
        const regList = data.regions || data.data?.regions || [];
        setDbCategories(catList);
        setDbOrganizers(orgList);
        setDbRegions(regList);
      }
    } catch (e) {
      console.warn("Failed to load filters:", e);
    }
  };

  // In-memory SWR Caching
  const programsCache = useRef(new Map<string, { programs: SupportProgram[]; total: number }>());

  const fetchPrograms = async (skipCache = false) => {
    const cacheKey = JSON.stringify({
      page,
      searchQuery: searchQuery.trim(),
      selectedCategory,
      selectedOrganizer,
      selectedRegion,
      selectedStage,
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
      sort: sortOption,
      onlyClosed: onlyClosed ? "true" : "false",
    });

    if (mainPortalMode !== "all") {
      params.set("portal", mainPortalMode);
    }

    // 1. Instant Cache Hit (Stale: 0ms 즉시 화면 표시)
    if (!skipCache && programsCache.current.has(cacheKey)) {
      const cached = programsCache.current.get(cacheKey)!;
      setPrograms(cached.programs);
      setTotalCount(cached.total);
      setLoading(false);

      // 2. Background Revalidation (While-Revalidate: 백그라운드에서 신규 데이터 자동 갱신)
      fetch(`/api/support-programs?${params.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          const freshList = data.programs || data.data || [];
          const freshTotal = data.total || data.totalCount || 0;
          programsCache.current.set(cacheKey, { programs: freshList, total: freshTotal });
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

      // In-memory cache save
      programsCache.current.set(cacheKey, { programs: programList, total });

      setPrograms(programList);
      setTotalCount(total);
    } catch (e) {
      console.error("Failed to load programs:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchPrograms();
  }, [
    page,
    searchQuery,
    selectedCategory,
    selectedOrganizer,
    selectedRegion,
    selectedStage,
    sortOption,
    onlyClosed,
    mainPortalMode,
  ]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPrograms(true);
  };

  const handleResetFilters = () => {
    setSelectedCategory("");
    setSelectedOrganizer("");
    setSelectedRegion("");
    setSelectedStage("");
    setSearchQuery("");
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col selection:bg-blue-600 selection:text-white font-sans antialiased">
      <Header
        activeNavTab={activeTab === "psst" ? "psst" : "notices"}
        totalCount={totalCount}
        onSelectPlan={(plan) => {
          setSelectedPlanToLoad(plan);
          setActiveTab("psst");
        }}
      />

      {activeTab === "psst" ? (
        <main className="w-full flex-1 flex flex-col overflow-hidden">
          <PsstPlanGenerator
            initialProgramTitle={selectedTargetProgramForPlan || undefined}
            initialPlanData={selectedPlanToLoad}
            onBackToNotices={() => {
              setActiveTab("workspace");
              setSelectedPlanToLoad(null);
              setSelectedTargetProgramForPlan("");
            }}
          />
        </main>
      ) : (
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-6">
          <ConsultantWorkspaceView
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onSearch={handleSearch}
            onQuickTagClick={(tag) => {
              setSearchQuery(tag);
              setPage(1);
            }}
            onNavigateToPsst={(targetTitle?: string) => {
              if (targetTitle) setSelectedTargetProgramForPlan(targetTitle);
              setSelectedPlanToLoad(null);
              setActiveTab("psst");
            }}
            mainPortalMode={mainPortalMode}
            setMainPortalMode={(m) => {
              setMainPortalMode(m);
              setPage(1);
            }}
            sortOption={sortOption}
            setSortOption={setSortOption}
            onlyClosed={onlyClosed}
            setOnlyClosed={(c) => {
              setOnlyClosed(c);
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
              window.scrollTo({ top: 300, behavior: "smooth" });
            }}
            onProgramClick={(id: string) => router.push(`/programs/${id}`)}
            timeFilter={timeFilter}
          />
        </main>
      )}

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
