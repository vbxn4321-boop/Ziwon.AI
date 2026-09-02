"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";
import { NewbieModeView } from "@/components/home/NewbieModeView";
import CompanyProfileModal from "@/components/auth/CompanyProfileModal";
import { SupportProgram } from "@/components/ProgramCard";
import { supabase, getJwtToken } from "@/lib/supabase-client";
import { getInMemoryUser } from "@/lib/auth-store";
import { fetchMyCompany } from "@/lib/backend-client";

// Module-level global cache that survives page unmounts during router navigation
const globalExploreCache = new Map<string, { programs: SupportProgram[]; total: number }>();
let globalSavedExploreState: {
  searchQuery: string;
  selectedStage: string;
  selectedCategory: string;
  selectedRegion: string;
  page: number;
  scrollY: number;
} | null = null;

function ExploreContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(() => globalSavedExploreState?.searchQuery || "");
  const [selectedStage, setSelectedStage] = useState(() => globalSavedExploreState?.selectedStage || "");
  const [selectedCategory, setSelectedCategory] = useState(() => globalSavedExploreState?.selectedCategory || "");
  const [selectedRegion, setSelectedRegion] = useState(() => globalSavedExploreState?.selectedRegion || "");
  const [page, setPage] = useState(() => globalSavedExploreState?.page || 1);

  const initialKey = JSON.stringify({
    page: globalSavedExploreState?.page || 1,
    searchQuery: (globalSavedExploreState?.searchQuery || "").trim(),
    selectedStage: globalSavedExploreState?.selectedStage || "",
    selectedCategory: globalSavedExploreState?.selectedCategory || "",
    selectedRegion: globalSavedExploreState?.selectedRegion || "",
  });

  const initialCached = globalExploreCache.get(initialKey);

  const [totalCount, setTotalCount] = useState(() => initialCached?.total || 0);
  const [programs, setPrograms] = useState<SupportProgram[]>(() => initialCached?.programs || []);
  const [loading, setLoading] = useState(() => !initialCached);

  // Auth & Profile
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [myCompany, setMyCompany] = useState<any>(null);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [recommendedPrograms, setRecommendedPrograms] = useState<SupportProgram[]>([]);
  const [loadingRecommended, setLoadingRecommended] = useState(false);

  // Restore scroll position on back navigation
  useEffect(() => {
    if (globalSavedExploreState?.scrollY) {
      const savedY = globalSavedExploreState.scrollY;
      requestAnimationFrame(() => {
        window.scrollTo({ top: savedY, behavior: "instant" as any });
      });
    }
  }, []);

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

  const fetchPrograms = async (skipCache = false) => {
    const cacheKey = JSON.stringify({
      page,
      searchQuery: searchQuery.trim(),
      selectedStage,
      selectedCategory,
      selectedRegion,
    });

    const params = new URLSearchParams({
      page: page.toString(),
      limit: "9",
      search: searchQuery,
      stage: selectedStage,
      category: selectedCategory,
      region: selectedRegion,
    });

    // 1. Instant Cache Hit (Stale: 0ms 즉시 화면 표시)
    if (!skipCache && globalExploreCache.has(cacheKey)) {
      const cached = globalExploreCache.get(cacheKey)!;
      setPrograms(cached.programs);
      setTotalCount(cached.total);
      setLoading(false);

      // 2. Background Revalidation (While-Revalidate: 백그라운드에서 신규 데이터 자동 갱신)
      fetch(`/api/support-programs?${params.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          const freshList = data.programs || data.data || [];
          const freshTotal = data.total || data.totalCount || 0;
          globalExploreCache.set(cacheKey, { programs: freshList, total: freshTotal });
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

      // Module-level global cache save
      globalExploreCache.set(cacheKey, { programs: programList, total });

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
  }, [page, selectedStage, selectedCategory, selectedRegion]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPrograms(true);
  };

  const handleQuickTagClick = (tag: string) => {
    setSearchQuery(tag);
    setPage(1);
    const params = new URLSearchParams({
      page: "1",
      limit: "9",
      search: tag,
      stage: selectedStage,
      category: selectedCategory,
      region: selectedRegion,
    });
    setLoading(true);
    fetch(`/api/support-programs?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        const programList = data.programs || data.data || [];
        setPrograms(programList);
        setTotalCount(data.total || data.totalCount || 0);
      })
      .finally(() => setLoading(false));
  };

  const handleResetAll = () => {
    setSelectedStage("");
    setSelectedCategory("");
    setSelectedRegion("");
    setSearchQuery("");
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col selection:bg-blue-600 selection:text-white font-sans antialiased">
      <Header activeNavTab="notices" totalCount={totalCount} />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-6">
        <NewbieModeView
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSearch={handleSearch}
          onQuickTagClick={handleQuickTagClick}
          selectedStage={selectedStage}
          onSelectStage={(s) => {
            setSelectedStage(s);
            setPage(1);
          }}
          selectedCategory={selectedCategory}
          onSelectCategory={(c) => {
            setSelectedCategory(c);
            setPage(1);
          }}
          selectedRegion={selectedRegion}
          onSelectRegion={(r) => {
            setSelectedRegion(r);
            setPage(1);
          }}
          onResetAll={handleResetAll}
          totalCount={totalCount}
          myCompany={myCompany}
          isLoggedIn={isLoggedIn}
          recommendedPrograms={recommendedPrograms}
          loadingRecommended={loadingRecommended}
          onOpenCompanyModal={() => {
            if (!isLoggedIn) router.push("/login");
            else setIsCompanyModalOpen(true);
          }}
          programs={programs}
          loading={loading}
          page={page}
          onPageChange={(p) => {
            setPage(p);
            window.scrollTo({ top: 300, behavior: "smooth" });
          }}
          onProgramClick={(id: string) => {
            globalSavedExploreState = {
              searchQuery,
              selectedStage,
              selectedCategory,
              selectedRegion,
              page,
              scrollY: window.scrollY,
            };
            router.push(`/programs/${id}`);
          }}
          timeFilter="all"
          onlyClosed={false}
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

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center">로딩 중...</div>}>
      <ExploreContent />
    </Suspense>
  );
}
