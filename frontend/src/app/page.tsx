"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  X,
  Play,
  Pause,
  Filter,
  Clock,
  ToggleLeft,
  ToggleRight,
  RotateCcw,
  Sparkles,
  Zap,
  Flame,
  AlertTriangle,
  Layers,
  ArrowUpDown,
  Building2,
  Rocket,
  Globe,
  MapPin,
  Tag,
  Briefcase,
  CheckCircle2,
} from "lucide-react";
import { Header } from "../components/Header";
import { ProgramCard, SupportProgram } from "../components/ProgramCard";
import { PsstPlanGenerator } from "../components/PsstPlanGenerator";
import Footer from "../components/Footer";
import CompanyProfileModal from "../components/auth/CompanyProfileModal";
import { fetchPlanDetail, fetchMyCompany } from "@/lib/backend-client";
import { supabase, getJwtToken } from "@/lib/supabase-client";

interface FilterItem {
  name: string;
  count: number;
}

interface StatsData {
  totalCount: number;
  activeCount: number;
  todayCount: number;
  recentCount: number;
  urgentCount: number;
}

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

  // User Company Profile & Tailored Recommendations Carousel
  const [myCompany, setMyCompany] = useState<any>(null);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [recommendedPrograms, setRecommendedPrograms] = useState<SupportProgram[]>([]);
  const [loadingRecommended, setLoadingRecommended] = useState(false);

  // Carousel Controls & Auto-play State
  const carouselRef = React.useRef<HTMLDivElement>(null);
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

  // Live Feed Notification for Newly Collected Notices
  const [newlyArrivedPrograms, setNewlyArrivedPrograms] = useState<SupportProgram[]>([]);

  // 1. Time / Curation Quick Filter: 'today' | 'recent' | 'urgent' | 'all'
  const [timeFilter, setTimeFilter] = useState<"today" | "recent" | "urgent" | "all">("today");

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

  // Filter Expansion & Sub-segment states (K-Startup & Modern SaaS Style)
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [organizerSegment, setOrganizerSegment] = useState<"all" | "public" | "private">("all");
  const [organizerSearch, setOrganizerSearch] = useState("");

  const STAGES_LIST = [
    { name: "전체", count: 0 },
    { name: "예비창업자", count: 0 },
    { name: "1년 미만", count: 0 },
    { name: "3년 미만", count: 0 },
    { name: "7년 미만", count: 0 },
    { name: "10년 미만", count: 0 },
  ];

  const getFilterKey = (query = searchQuery) => {
    return `${mainPortalMode}_${filterTabMode}_${selectedCategory}_${selectedOrganizer}_${selectedRegion}_${selectedStage}_${timeFilter}_${sortOption}_${onlyClosed}_${query.trim()}`;
  };

  // 1. Initial Load & Auth Sync: Load Profile and Filter Counts
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

  // 1-1. Process URL Query Parameters
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const planIdParam = searchParams.get("planId");
    const programIdParam = searchParams.get("programId");

    if (tabParam === "psst") {
      setActiveNavTab("psst");
    }

    if (planIdParam) {
      const loadPlanFromQuery = async () => {
        try {
          const token = await getJwtToken();
          if (token) {
            const planData = await fetchPlanDetail(planIdParam, token);
            if (planData) {
              setSelectedPlanToLoad(planData);
              setSelectedTargetProgramForPlan(planData.targetProgramTitle || "");
              setActiveNavTab("psst");
            }
          }
        } catch (err) {
          console.warn("Failed to load plan from query param:", err);
        }
      };
      loadPlanFromQuery();
    }

    if (programIdParam) {
      router.push(`/programs/${programIdParam}`);
    }
  }, [searchParams, router]);

  // Load User's Registered Company Profile for Top Tailored Curation
  const loadUserCompanyProfile = async () => {
    try {
      const token = await getJwtToken();
      if (!token) {
        setMyCompany(null);
        setRecommendedPrograms([]);
        return;
      }
      const comp = await fetchMyCompany(token);
      if (comp && comp.name) {
        setMyCompany(comp);
        fetchTailoredRecommendations(comp);
      } else {
        setMyCompany(null);
        setRecommendedPrograms([]);
      }
    } catch (err) {
      console.warn("User company profile check:", err);
      setMyCompany(null);
      setRecommendedPrograms([]);
    }
  };

  const fetchTailoredRecommendations = async (comp: any) => {
    try {
      setLoadingRecommended(true);
      const params = new URLSearchParams();
      params.append("limit", "16");
      if (comp.region && comp.region !== "전체" && comp.region !== "전국") {
        params.append("region", comp.region);
      }
      if (comp.industry) {
        params.append("search", comp.industry);
      }
      const res = await fetch(`/api/support-programs?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          let recList: SupportProgram[] = json.data;

          // If industry/region query returned fewer than 6 items, supplement with latest active programs
          if (recList.length < 6) {
            const fallbackParams = new URLSearchParams();
            fallbackParams.append("limit", "16");
            fallbackParams.append("sourceType", "BIZINFO");
            const fallbackRes = await fetch(`/api/support-programs?${fallbackParams.toString()}`);
            if (fallbackRes.ok) {
              const fallbackJson = await fallbackRes.json();
              if (fallbackJson.success && Array.isArray(fallbackJson.data)) {
                const existingIds = new Set(recList.map((p) => p.id));
                const supplementary = fallbackJson.data.filter((p: any) => !existingIds.has(p.id));
                recList = [...recList, ...supplementary];
              }
            }
          }
          setRecommendedPrograms(recList.slice(0, 16));
        }
      }
    } catch (e) {
      console.warn("Failed to fetch tailored programs:", e);
    } finally {
      setLoadingRecommended(false);
    }
  };

  const fetchFiltersFromDb = async () => {
    try {
      const res = await fetch("/api/filters");
      const json = await res.json();
      if (json.success) {
        const categories = json.data?.categories || [{ name: "전체", count: 0 }];
        const regions = json.data?.regions || [{ name: "전체", count: 0 }];
        const organizers = json.data?.organizers || [{ name: "전체", count: 0 }];
        const currentStats = json.stats || {
          totalCount: 0,
          activeCount: 0,
          todayCount: 0,
          recentCount: 0,
          urgentCount: 0,
        };

        setDbCategories(categories);
        setDbRegions(regions);
        setDbOrganizers(organizers);
        setStats(currentStats);

        memoryFiltersCache = {
          categories,
          regions,
          organizers,
          stats: currentStats,
          timestamp: Date.now(),
        };
      }
    } catch (err) {
      console.error("Failed to load filter counts from DB:", err);
    }
  };

  // 2. Fetch Support Programs with Filter Key and SWR Caching
  useEffect(() => {
    setPage(1);
    fetchPrograms(1, true);
  }, [
    mainPortalMode,
    selectedCategory,
    selectedOrganizer,
    selectedRegion,
    selectedStage,
    timeFilter,
    sortOption,
    onlyClosed,
  ]);

  const fetchPrograms = async (pageNum = 1, isReset = false, queryOverride?: string) => {
    const q = queryOverride !== undefined ? queryOverride : searchQuery;
    const key = getFilterKey(q);

    // Instant SWR memory cache restoration
    if (isReset && pageNum === 1) {
      const cached = memoryProgramsCache.get(key);
      if (cached && cached.programs.length > 0) {
        setPrograms(cached.programs);
        setTotalCount(cached.total);
        setHasMore(cached.hasMore);
        setLoading(false);
      } else {
        setLoading(true);
      }
    } else if (pageNum > 1) {
      setLoadingMore(true);
    }

    try {
      const params = new URLSearchParams();
      params.append("page", pageNum.toString());
      params.append("limit", "18");

      if (mainPortalMode === "bizinfo") params.append("sourceType", "BIZINFO");
      if (mainPortalMode === "kstartup") params.append("sourceType", "K_STARTUP");

      if (selectedCategory !== "전체") params.append("category", selectedCategory);
      if (selectedOrganizer !== "전체") params.append("organizer", selectedOrganizer);
      if (selectedRegion !== "전체") params.append("region", selectedRegion);
      if (selectedStage !== "전체") params.append("businessStage", selectedStage);

      if (timeFilter !== "all") params.append("timeFilter", timeFilter);
      if (sortOption) params.append("sort", sortOption);
      if (onlyClosed) params.append("onlyClosed", "true");

      if (q.trim()) params.append("search", q.trim());

      const res = await fetch(`/api/support-programs?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        const rawList = data.data || [];

        if (isReset || pageNum === 1) {
          const cached = memoryProgramsCache.get(key);
          const map = new Map();
          rawList.forEach((p: any) => {
            if (p && p.id) map.set(p.id, p);
          });
          const newList = Array.from(map.values()) as SupportProgram[];

          // Check if newly collected programs arrived
          if (cached && cached.programs.length > 0 && pageNum === 1) {
            const currentIds = new Set(cached.programs.map((p) => p.id));
            const freshItems = newList.filter((p) => !currentIds.has(p.id));
            if (freshItems.length > 0) {
              setNewlyArrivedPrograms(freshItems);
            } else {
              setPrograms(newList);
            }
          } else {
            setPrograms(newList);
          }

          memoryProgramsCache.set(key, {
            programs: newList,
            total: data.total,
            hasMore: data.hasMore,
            timestamp: Date.now(),
          });
        } else {
          setPrograms((prev) => {
            const map = new Map();
            prev.forEach((p: any) => {
              if (p && p.id) map.set(p.id, p);
            });
            rawList.forEach((p: any) => {
              if (p && p.id) map.set(p.id, p);
            });
            const merged = Array.from(map.values()) as SupportProgram[];
            return merged;
          });
        }
        setHasMore(data.hasMore);
        setTotalCount(data.total);
      }
    } catch (err) {
      console.error("Failed to fetch programs:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleApplyNewPrograms = () => {
    if (newlyArrivedPrograms.length === 0) return;
    setPrograms((prev) => {
      const map = new Map();
      newlyArrivedPrograms.forEach((p) => map.set(p.id, p));
      prev.forEach((p) => map.set(p.id, p));
      return Array.from(map.values());
    });
    setNewlyArrivedPrograms([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPrograms(nextPage, false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPrograms(1, true, searchQuery);
  };

  const resetAllFilters = () => {
    setSelectedCategory("전체");
    setSelectedOrganizer("전체");
    setSelectedRegion("전체");
    setSelectedStage("전체");
    setMainPortalMode("all");
    setTimeFilter("today");
    setSortOption("latest");
    setOnlyClosed(false);
    setSearchQuery("");
  };

  const handleQuickTagClick = (tag: string) => {
    setSearchQuery(tag);
    setPage(1);
    fetchPrograms(1, true, tag);
  };

  return (
    <div className="min-h-screen flex flex-col text-slate-900 bg-[#f8fafc]">
      {/* Header Component */}
      <Header
        activeNavTab={activeNavTab}
        setActiveNavTab={setActiveNavTab}
        mainPortalMode={mainPortalMode === "all" ? "bizinfo" : mainPortalMode}
        setMainPortalMode={(mode) => setMainPortalMode(mode as any)}
        totalCount={stats.totalCount || totalCount}
        onSelectPlan={(planData) => {
          setSelectedPlanToLoad(planData);
          setSelectedTargetProgramForPlan(planData.targetProgramTitle || "");
          setActiveNavTab("psst");
        }}
        onOpenBookmarkedProgram={(programId) => router.push(`/programs/${programId}`)}
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
          <section className="relative pt-8 pb-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700 shadow-2xs">
                <Flame className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                <span>기업마당(중기부) & K-Startup(창진원) 통합 실시간 지원사업 탐색</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
                오늘 새로 올라온 <br className="sm:hidden" />
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 bg-clip-text text-transparent">
                  정부지원사업 실시간 탐색
                </span>
              </h1>

              <form onSubmit={handleSearch} className="pt-2 flex items-center gap-2 max-w-2xl mx-auto">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="사업명, 기관명, 분야 검색 (예: 팁스, 초기창업패키지, 바우처, AI, 서울)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-300 text-sm placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all text-slate-900 shadow-2xs"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all shadow-sm shadow-blue-600/25 flex items-center space-x-1.5 cursor-pointer"
                >
                  <span>조회</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </form>

              {/* Quick Tag Recommendations */}
              <div className="flex items-center justify-center flex-wrap gap-1.5 pt-1 text-[11px]">
                <span className="text-slate-400 font-semibold mr-1">추천 검색:</span>
                {["#팁스", "#초기창업패키지", "#AI바우처", "#R&D", "#청년창업", "#마케팅", "#서울"].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleQuickTagClick(tag.replace("#", ""))}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 shadow-2xs transition-all cursor-pointer font-medium"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Stats Curation Cards (Toss Business Clean Grid Layout) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-5xl mx-auto pt-2">
              <button
                type="button"
                onClick={() => {
                  setTimeFilter("today");
                  setOnlyClosed(false);
                }}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between shadow-2xs ${
                  timeFilter === "today" && !onlyClosed
                    ? "bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 shadow-sm"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-700 flex items-center space-x-1">
                    <Flame className="w-3.5 h-3.5 text-blue-600" />
                    <span>오늘 신규 수집</span>
                  </span>
                </div>
                <div className="pt-2 flex items-baseline space-x-1">
                  <span className="text-xl sm:text-2xl font-black text-slate-900">
                    {(stats.todayCount || 0).toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-500">건</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTimeFilter("recent");
                  setOnlyClosed(false);
                }}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between shadow-2xs ${
                  timeFilter === "recent" && !onlyClosed
                    ? "bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-indigo-700 flex items-center space-x-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>최근 3일 신규</span>
                  </span>
                </div>
                <div className="pt-2 flex items-baseline space-x-1">
                  <span className="text-xl sm:text-2xl font-black text-slate-900">
                    {(stats.recentCount || 0).toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-500">건</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTimeFilter("urgent");
                  setSortOption("deadline");
                  setOnlyClosed(false);
                }}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between shadow-2xs ${
                  timeFilter === "urgent" && !onlyClosed
                    ? "bg-rose-50/80 border-rose-500 ring-2 ring-rose-500/20 shadow-sm"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-rose-700 flex items-center space-x-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>마감 임박 (D-7)</span>
                  </span>
                </div>
                <div className="pt-2 flex items-baseline space-x-1">
                  <span className="text-xl sm:text-2xl font-black text-slate-900">
                    {(stats.urgentCount || 0).toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-500">건</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTimeFilter("all");
                  setOnlyClosed(false);
                }}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between shadow-2xs ${
                  timeFilter === "all" && !onlyClosed
                    ? "bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-700 flex items-center space-x-1">
                    <Layers className="w-3.5 h-3.5 text-emerald-600" />
                    <span>전체 진행 중</span>
                  </span>
                </div>
                <div className="pt-2 flex items-baseline space-x-1">
                  <span className="text-xl sm:text-2xl font-black text-slate-900">
                    {(stats.activeCount || stats.totalCount || 0).toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-500">건</span>
                </div>
              </button>
            </div>
          </section>

          {/* 2. Personalized Recommendation Auto-Carousel (Toss / Flex / Samjjumsam Style) */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            {myCompany ? (
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
                      onClick={() => setIsCompanyModalOpen(true)}
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
                    {/* Scrollable Carousel Track */}
                    <div
                      ref={carouselRef}
                      onScroll={checkScrollability}
                      className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory no-scrollbar py-2 px-1 items-stretch"
                    >
                      {recommendedPrograms.map((prog, idx) => (
                        <div
                          key={`rec-${prog.id}-${idx}`}
                          className="w-[280px] sm:w-[310px] md:w-[330px] flex-shrink-0 snap-start flex flex-col h-full"
                        >
                          <ProgramCard
                            prog={prog}
                            onClick={() => router.push(`/programs/${prog.id}`)}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Bottom Pagination Dots & Circular Navigation Controls Cluster (Exact Photo Match) */}
                    {recommendedPrograms.length > 1 && (
                      <div className="pt-2 pb-1 flex flex-col items-center justify-center space-y-3">
                        {/* Top: Dot Indicators (Inactive: circle, Active: elongated blue pill) */}
                        <div className="flex items-center justify-center space-x-2">
                          {recommendedPrograms.map((_, idx) => (
                            <button
                              key={`rec-dot-${idx}`}
                              type="button"
                              onClick={() => scrollToIndex(idx)}
                              aria-label={`추천 지원사업 ${idx + 1}번으로 이동`}
                              className={`transition-all duration-300 cursor-pointer ${
                                currentSlideIndex === idx
                                  ? "w-6 h-2.5 rounded-full bg-blue-600 shadow-2xs"
                                  : "w-2.5 h-2.5 rounded-full bg-slate-300 hover:bg-slate-400"
                              }`}
                            />
                          ))}
                        </div>

                        {/* Bottom: 3 Circular White Buttons (< ▶ >) */}
                        <div className="flex items-center justify-center space-x-2.5">
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
            ) : (
              /* Non-logged in or Profile Unregistered Banner */
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
                  onClick={() => setIsCompanyModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-sm shadow-blue-600/20 cursor-pointer transition-all flex items-center space-x-1.5"
                >
                  <span>기업 프로필 등록하기</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </section>

          {/* 3. Unified Smart Filter & Program Exploration Grid */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 w-full flex-1 space-y-5">
            {/* Unified Smart Filter Panel (Flex / Toss SaaS Style) */}
            <div className="bg-white p-5 rounded-2xl space-y-4 border border-slate-200 shadow-sm">
              {/* Row 1: Source Portal Toggle + Sort Order + Expired Toggle */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                {/* Source Portal Mode Selector */}
                <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-600 px-2 flex items-center space-x-1">
                    <Globe className="w-3.5 h-3.5 text-blue-600" />
                    <span>출처 포털:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setMainPortalMode("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      mainPortalMode === "all"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    통합 전체
                  </button>
                  <button
                    type="button"
                    onClick={() => setMainPortalMode("bizinfo")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                      mainPortalMode === "bizinfo"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>기업마당(중기부)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMainPortalMode("kstartup")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                      mainPortalMode === "kstartup"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Rocket className="w-3.5 h-3.5" />
                    <span>K-Startup(창진원)</span>
                  </button>
                </div>

                {/* Right: Sort Options & Expired Notice Toggle */}
                <div className="flex items-center space-x-2 text-xs shrink-0 self-end lg:self-auto">
                  <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <span className="text-slate-500 pl-1.5 flex items-center space-x-1">
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                      <span className="text-[11px]">정렬:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSortOption("latest")}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                        sortOption === "latest"
                          ? "bg-white text-slate-900 shadow-2xs border border-slate-200 font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      최신순
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortOption("deadline")}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                        sortOption === "deadline"
                          ? "bg-white text-slate-900 shadow-2xs border border-slate-200 font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      마감임박순
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOnlyClosed(!onlyClosed)}
                    className={`px-3 py-1.5 rounded-xl border transition-all flex items-center space-x-1.5 cursor-pointer ${
                      onlyClosed
                        ? "bg-rose-50 border-rose-300 text-rose-700 font-bold"
                        : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs"
                    }`}
                  >
                    <Clock className={`w-3.5 h-3.5 ${onlyClosed ? "text-rose-600" : "text-slate-400"}`} />
                    <span>마감 공고</span>
                    {onlyClosed ? (
                      <ToggleRight className="w-4 h-4 text-rose-600" />
                    ) : (
                      <ToggleLeft className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={resetAllFilters}
                    title="필터 초기화"
                    className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900 shadow-2xs cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Row 2: Sub-Filter Tab Switcher (Category / Ministry / Region / Stage) */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                      <Filter className="w-3.5 h-3.5 text-blue-600" />
                      <span>스마트 필터:</span>
                    </span>

                    <div className="bg-slate-100 p-0.5 rounded-lg border border-slate-200 flex space-x-1 text-[11px]">
                      <button
                        type="button"
                        onClick={() => {
                          setFilterTabMode("category");
                          setIsFilterExpanded(false);
                        }}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                          filterTabMode === "category"
                            ? "bg-white text-slate-900 shadow-2xs font-bold border border-slate-200"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        지원분야 ({dbCategories.length - 1})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFilterTabMode("ministry");
                          setIsFilterExpanded(false);
                        }}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                          filterTabMode === "ministry"
                            ? "bg-white text-slate-900 shadow-2xs font-bold border border-slate-200"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        주관기관 ({dbOrganizers.length - 1})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFilterTabMode("region");
                          setIsFilterExpanded(false);
                        }}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                          filterTabMode === "region"
                            ? "bg-white text-slate-900 shadow-2xs font-bold border border-slate-200"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        지역별 ({dbRegions.length - 1})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFilterTabMode("stage");
                          setIsFilterExpanded(false);
                        }}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                          filterTabMode === "stage"
                            ? "bg-white text-slate-900 shadow-2xs font-bold border border-slate-200"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        창업업력
                      </button>
                    </div>
                  </div>

                  <span className="text-xs font-semibold text-slate-500">
                    총 <strong className="text-blue-600 font-extrabold">{totalCount.toLocaleString()}</strong>건 공고
                  </span>
                </div>

                {/* K-Startup Style 2-Segment Classifier (중앙부처·지자체·공공기관 vs 민간기관·교육기관) */}
                {filterTabMode === "ministry" && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1 pb-1 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/80">
                    {/* K-Startup Segments */}
                    <div className="inline-flex p-0.5 bg-white rounded-lg border border-slate-200 text-xs shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setOrganizerSegment("all")}
                        className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                          organizerSegment === "all"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        전체 기관
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrganizerSegment("public")}
                        className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                          organizerSegment === "public"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <span>🏛️ 중앙부처 · 지자체 · 공공기관</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrganizerSegment("private")}
                        className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                          organizerSegment === "private"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <span>🎓 민간기관 · 교육기관</span>
                      </button>
                    </div>

                    {/* Quick Search inside Organizers */}
                    <div className="relative max-w-xs w-full">
                      <input
                        type="text"
                        value={organizerSearch}
                        onChange={(e) => setOrganizerSearch(e.target.value)}
                        placeholder="기관명 빠른 검색..."
                        className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      {organizerSearch && (
                        <button
                          type="button"
                          onClick={() => setOrganizerSearch("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Sub-Filter Pill Chips with Collapsible Views */}
                <div className="pt-1">
                  {/* 1. 지원분야 Chips */}
                  {filterTabMode === "category" && (
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {(isFilterExpanded ? dbCategories : dbCategories.slice(0, 11)).map((item) => (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => setSelectedCategory(item.name)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center space-x-1.5 cursor-pointer ${
                            selectedCategory === item.name
                              ? "bg-blue-600 text-white font-bold shadow-xs border border-blue-600"
                              : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                          }`}
                        >
                          <span>{item.name}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                              selectedCategory === item.name
                                ? "bg-white/20 text-white font-bold"
                                : "bg-slate-200/80 text-slate-600"
                            }`}
                          >
                            {item.count.toLocaleString()}
                          </span>
                        </button>
                      ))}

                      {/* Expand / Collapse Button */}
                      {dbCategories.length > 11 && (
                        <button
                          type="button"
                          onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                          className="px-3 py-1 rounded-full text-xs font-bold text-blue-600 hover:bg-blue-50 border border-blue-200/90 transition-all flex items-center space-x-1 cursor-pointer shadow-2xs"
                        >
                          <span>{isFilterExpanded ? "접기" : `+${dbCategories.length - 11}개 분야 펼치기`}</span>
                          {isFilterExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  )}

                  {/* 2. 주관기관 Chips */}
                  {filterTabMode === "ministry" && (
                    <div className="space-y-2">
                      <div className={`flex flex-wrap gap-1.5 items-center ${isFilterExpanded ? "max-h-60 overflow-y-auto pr-1" : ""}`}>
                        {(() => {
                          const filtered = dbOrganizers.filter((item) => {
                            if (item.name === "전체") return true;
                            if (organizerSearch.trim()) {
                              if (!item.name.toLowerCase().includes(organizerSearch.toLowerCase().trim())) {
                                return false;
                              }
                            }
                            if (organizerSegment === "public") {
                              return (
                                item.name.includes("부") ||
                                item.name.includes("청") ||
                                item.name.includes("원") ||
                                item.name.includes("공단") ||
                                item.name.includes("공사") ||
                                item.name.includes("시") ||
                                item.name.includes("도") ||
                                item.name.includes("기금") ||
                                item.name.includes("테크노파크") ||
                                item.name.includes("진흥") ||
                                item.name.includes("센터")
                              );
                            }
                            if (organizerSegment === "private") {
                              return (
                                item.name.includes("대") ||
                                item.name.includes("대학") ||
                                item.name.includes("산학") ||
                                item.name.includes("협회") ||
                                item.name.includes("은행") ||
                                item.name.includes("투자") ||
                                item.name.includes("회사") ||
                                item.name.includes("랩") ||
                                item.name.includes("파트너스") ||
                                item.name.includes("학회")
                              );
                            }
                            return true;
                          });

                          const visibleList = isFilterExpanded ? filtered : filtered.slice(0, 12);

                          return (
                            <>
                              {visibleList.map((item) => (
                                <button
                                  key={item.name}
                                  type="button"
                                  onClick={() => setSelectedOrganizer(item.name)}
                                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center space-x-1.5 cursor-pointer ${
                                    selectedOrganizer === item.name
                                      ? "bg-blue-600 text-white font-bold shadow-xs border border-blue-600"
                                      : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                                  }`}
                                >
                                  <span className="truncate max-w-[140px]">{item.name}</span>
                                  <span
                                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                                      selectedOrganizer === item.name
                                        ? "bg-white/20 text-white font-bold"
                                        : "bg-slate-200/80 text-slate-600"
                                    }`}
                                  >
                                    {item.count.toLocaleString()}
                                  </span>
                                </button>
                              ))}

                              {filtered.length > 12 && (
                                <button
                                  type="button"
                                  onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                                  className="px-3 py-1 rounded-full text-xs font-bold text-blue-600 hover:bg-blue-50 border border-blue-200/90 transition-all flex items-center space-x-1 cursor-pointer shadow-2xs"
                                >
                                  <span>{isFilterExpanded ? "접기" : `+${filtered.length - 12}개 기관 펼치기`}</span>
                                  {isFilterExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </button>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* 3. 지역별 Chips */}
                  {filterTabMode === "region" && (
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {(isFilterExpanded ? dbRegions : dbRegions.slice(0, 11)).map((item) => (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => setSelectedRegion(item.name)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center space-x-1.5 cursor-pointer ${
                            selectedRegion === item.name
                              ? "bg-blue-600 text-white font-bold shadow-xs border border-blue-600"
                              : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                          }`}
                        >
                          <span>{item.name}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                              selectedRegion === item.name
                                ? "bg-white/20 text-white font-bold"
                                : "bg-slate-200/80 text-slate-600"
                            }`}
                          >
                            {item.count.toLocaleString()}
                          </span>
                        </button>
                      ))}

                      {/* Expand / Collapse Button for Regions */}
                      {dbRegions.length > 11 && (
                        <button
                          type="button"
                          onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                          className="px-3 py-1 rounded-full text-xs font-bold text-blue-600 hover:bg-blue-50 border border-blue-200/90 transition-all flex items-center space-x-1 cursor-pointer shadow-2xs"
                        >
                          <span>{isFilterExpanded ? "접기" : `+${dbRegions.length - 11}개 지역 펼치기`}</span>
                          {isFilterExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  )}

                  {/* 4. 창업업력 Chips */}
                  {filterTabMode === "stage" && (
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {STAGES_LIST.map((item) => (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => setSelectedStage(item.name)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center space-x-1.5 cursor-pointer ${
                            selectedStage === item.name
                              ? "bg-blue-600 text-white font-bold shadow-xs border border-blue-600"
                              : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                          }`}
                        >
                          <span>{item.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Active Filter Tags Bar (Modern B2B SaaS Style) */}
                {(selectedCategory !== "전체" ||
                  selectedOrganizer !== "전체" ||
                  selectedRegion !== "전체" ||
                  selectedStage !== "전체" ||
                  mainPortalMode !== "all" ||
                  onlyClosed) && (
                  <div className="flex items-center gap-2 flex-wrap pt-2.5 border-t border-slate-100 mt-2">
                    <span className="text-[11px] font-bold text-slate-500 flex items-center space-x-1">
                      <span>적용 필터:</span>
                    </span>
                    {mainPortalMode !== "all" && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
                        <span>출처: {mainPortalMode === "bizinfo" ? "기업마당" : "K-Startup"}</span>
                        <button onClick={() => setMainPortalMode("all")} className="hover:text-blue-900 cursor-pointer ml-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {selectedCategory !== "전체" && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
                        <span>분야: {selectedCategory}</span>
                        <button onClick={() => setSelectedCategory("전체")} className="hover:text-blue-900 cursor-pointer ml-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {selectedOrganizer !== "전체" && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
                        <span>기관: {selectedOrganizer}</span>
                        <button onClick={() => setSelectedOrganizer("전체")} className="hover:text-blue-900 cursor-pointer ml-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {selectedRegion !== "전체" && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
                        <span>지역: {selectedRegion}</span>
                        <button onClick={() => setSelectedRegion("전체")} className="hover:text-blue-900 cursor-pointer ml-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {selectedStage !== "전체" && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
                        <span>업력: {selectedStage}</span>
                        <button onClick={() => setSelectedStage("전체")} className="hover:text-blue-900 cursor-pointer ml-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={resetAllFilters}
                      className="text-xs text-slate-500 hover:text-rose-600 font-semibold underline underline-offset-2 ml-1 cursor-pointer transition-colors flex items-center space-x-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>필터 전체 초기화</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Active Filter Section Header */}
            <div className="flex items-center justify-between pt-1">
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
                  (현재 {programs.length}개 표시 / 총 {totalCount.toLocaleString()}개)
                </span>
              </h2>
            </div>

            {/* Program Card Grid Feed */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white p-6 rounded-2xl space-y-4 animate-pulse border border-slate-200">
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
                  onClick={resetAllFilters}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
                >
                  필터 초기화
                </button>
              </div>
            ) : (
              <div className="space-y-6 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {programs.map((prog) => (
                    <ProgramCard
                      key={prog.id}
                      prog={prog}
                      onClick={() => router.push(`/programs/${prog.id}`)}
                    />
                  ))}
                </div>

                {/* Pagination Load More Button */}
                {hasMore && (
                  <div className="pt-6 pb-8 text-center">
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="px-6 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 hover:border-slate-400 font-bold text-xs transition-all shadow-xs cursor-pointer disabled:opacity-50 inline-flex items-center space-x-2"
                    >
                      <span>{loadingMore ? "공고 불러오는 중..." : "지원사업 공고 더보기"}</span>
                      <ChevronRight className={`w-4 h-4 ${loadingMore ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </main>
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
