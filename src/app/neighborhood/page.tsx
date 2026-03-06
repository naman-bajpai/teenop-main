"use client";

import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Star, Clock, Filter, LayoutGrid, List, ChevronDown } from "lucide-react";
import CategoryFilter from "@/components/services/CategoryFilter";
import ServiceCard from "@/components/services/ServiceCard";
import { useUser } from "@/hooks/useUser";
import { Service } from "@/types/service";
import { cn } from "@/lib/utils";

export default function NeighborhoodPage() {
  const { user, loading: userLoading } = useUser();
  const [services, setServices] = React.useState<Service[]>([]);
  const [serviceQuery, setServiceQuery] = React.useState("");
  const [locationQuery, setLocationQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("all");
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [sortBy, setSortBy] = React.useState<
    "relevance" | "newest" | "rating" | "price_low" | "price_high"
  >("relevance");
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
  const [minRating, setMinRating] = React.useState<number>(0);
  const [minPrice, setMinPrice] = React.useState<string>("");
  const [maxPrice, setMaxPrice] = React.useState<string>("");
  const [stats, setStats] = React.useState({
    averageRating: 0,
    activeProviders: 0,
    serviceAreas: 0,
    totalServices: 0
  });

  // Load all active services (no filter by parent's profile location; search is text-only on title/description/location)
  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setLoadError(null);

        // Load services and stats in parallel with caching
        const [servicesRes, statsRes] = await Promise.all([
          fetch("/api/services/public", { next: { revalidate: 30 } }), // Services cache for 30s
          fetch("/api/neighborhood/stats", { next: { revalidate: 60 } }) // Stats cache for 60s
        ]);

        if (!servicesRes.ok) throw new Error("Failed to fetch services");
        if (!statsRes.ok) throw new Error("Failed to fetch statistics");

        const [servicesJson, statsJson] = await Promise.all([
          servicesRes.json(),
          statsRes.json()
        ]);

        const list = (servicesJson?.services ?? []) as Service[];
        setServices(list);

        if (statsJson.success) {
          setStats(statsJson.stats);
        }
      } catch (err: any) {
        console.error("Failed to load services:", err);
        setLoadError(err?.message || "Failed to load services.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Derived visible services with filters and sorting
  const visibleServices = React.useMemo(() => {
    let next = [...services];

    // Search filter (service type + location)
    if (serviceQuery || locationQuery) {
      const sq = serviceQuery.toLowerCase();
      const lq = locationQuery.toLowerCase();

      next = next.filter((s) => {
        const matchesService =
          !sq ||
          s.title?.toLowerCase().includes(sq) ||
          s.description?.toLowerCase().includes(sq);

        const matchesLocation =
          !lq ||
          (s.location ?? "").toLowerCase().includes(lq) ||
          (s.provider_city ?? "").toLowerCase().includes(lq) ||
          (s.provider_state ?? "").toLowerCase().includes(lq);

        return matchesService && matchesLocation;
      });
    }

    // Category filter
    if (selectedCategory !== "all") {
      next = next.filter((s) => String(s.category) === selectedCategory);
    }

    // Rating filter
    if (minRating > 0) {
      next = next.filter((s) => (s.rating ?? 0) >= minRating);
    }

    // Price filter (applies only to non-quote models)
    const minP = minPrice ? Number(minPrice) : undefined;
    const maxP = maxPrice ? Number(maxPrice) : undefined;
    if (minP != null || maxP != null) {
      next = next.filter((s) => {
        if (s.pricing_model === "quote") return true; // keep quote-based
        if (typeof s.price !== "number") return false;
        if (minP != null && s.price < minP) return false;
        if (maxP != null && s.price > maxP) return false;
        return true;
      });
    }

    // Sorting
    next.sort((a, b) => {
      switch (sortBy) {
        case "newest": {
          const at = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
          return bt - at;
        }
        case "rating": {
          const ar = a.rating ?? -1;
          const br = b.rating ?? -1;
          return br - ar;
        }
        case "price_low": {
          const ap = a.pricing_model === "quote" ? Number.POSITIVE_INFINITY : (a.price ?? Number.POSITIVE_INFINITY);
          const bp = b.pricing_model === "quote" ? Number.POSITIVE_INFINITY : (b.price ?? Number.POSITIVE_INFINITY);
          return ap - bp;
        }
        case "price_high": {
          const ap = a.pricing_model === "quote" ? Number.NEGATIVE_INFINITY : (a.price ?? Number.NEGATIVE_INFINITY);
          const bp = b.pricing_model === "quote" ? Number.NEGATIVE_INFINITY : (b.price ?? Number.NEGATIVE_INFINITY);
          return bp - ap;
        }
        case "relevance":
        default: {
          // If searching, prioritize title match > description/location
          if (!serviceQuery && !locationQuery) return 0;
          const sq = serviceQuery.toLowerCase();
          const lq = locationQuery.toLowerCase();

          const hasServiceQuery = sq.length > 0;
          const hasLocationQuery = lq.length > 0;

          const aTitle = hasServiceQuery && (a.title ?? "").toLowerCase().includes(sq) ? 2 : 0;
          const bTitle = hasServiceQuery && (b.title ?? "").toLowerCase().includes(sq) ? 2 : 0;

          const aOtherService = hasServiceQuery && (a.description ?? "").toLowerCase().includes(sq) ? 1 : 0;
          const bOtherService = hasServiceQuery && (b.description ?? "").toLowerCase().includes(sq) ? 1 : 0;

          const aLocation =
            hasLocationQuery &&
            (
              (a.location ?? "").toLowerCase().includes(lq) ||
              (a.provider_city ?? "").toLowerCase().includes(lq) ||
              (a.provider_state ?? "").toLowerCase().includes(lq)
            )
              ? 1
              : 0;
          const bLocation =
            hasLocationQuery &&
            (
              (b.location ?? "").toLowerCase().includes(lq) ||
              (b.provider_city ?? "").toLowerCase().includes(lq) ||
              (b.provider_state ?? "").toLowerCase().includes(lq)
            )
              ? 1
              : 0;

          return (bTitle + bOtherService + bLocation) - (aTitle + aOtherService + aLocation); 
        }
      }
    });

    return next;
  }, [services, serviceQuery, locationQuery, selectedCategory, minRating, minPrice, maxPrice, sortBy]);

  return (
    <DashboardLayout user={user}>
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          {/* Header */}
          <div className="mb-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-2">
                <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                  Neighborhood <span className="text-[#96cbc3]">Services</span>
                </h1>
                <p className="text-lg text-gray-500 font-medium max-w-xl">
                  Discover talented teens offering trusted services in your community.
                </p>
              </div>
              <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                <div className="px-4 text-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Providers</p>
                  <p className="text-lg font-black text-gray-900">{stats.activeProviders}</p>
                </div>
                <div className="w-px h-8 bg-gray-200" />
                <div className="px-4 text-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rating</p>
                  <p className="text-lg font-black text-gray-900">{stats.averageRating.toFixed(1)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-12 group">
            <div className="absolute inset-0 bg-gradient-to-r from-[#434c9d]/5 to-[#96cbc3]/5 rounded-[32px] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative bg-white rounded-[32px] p-2 border border-gray-100 shadow-sm transition-all focus-within:shadow-xl focus-within:border-[#434c9d]/20">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="flex w-full flex-col gap-2 md:flex-row md:items-center md:gap-3">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 transition-colors group-focus-within:text-[#434c9d]" />
                    <Input
                      placeholder="What service do you need?"
                      value={serviceQuery}
                      onChange={(e) => setServiceQuery(e.target.value)}
                      className="pl-14 h-14 bg-transparent border-none text-lg font-medium placeholder:text-gray-400 focus-visible:ring-0"
                    />
                  </div>
                  <div className="relative flex-1 w-full">
                    <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 transition-colors group-focus-within:text-[#434c9d]" />
                    <Input
                      placeholder="Where? (city, neighborhood, or ZIP)"
                      value={locationQuery}
                      onChange={(e) => setLocationQuery(e.target.value)}
                      className="pl-14 h-14 bg-gray-50/80 border-none text-lg font-medium placeholder:text-gray-400 focus-visible:ring-0 md:bg-transparent md:border-l md:border-gray-100 md:rounded-none md:first:rounded-l-[24px] md:last:rounded-r-[24px]"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 p-1 w-full md:w-auto">
                  <div className="h-10 w-px bg-gray-100 hidden md:block" />
                  <Button className="h-12 px-8 bg-[#434c9d] hover:bg-[#434c9d]/90 text-white rounded-2xl font-bold w-full md:w-auto shadow-lg shadow-[#434c9d]/20 active:scale-95 transition-all">
                    Search
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Sidebar Filters */}
            <aside className="lg:col-span-3 space-y-8">
              <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm sticky top-24">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-gray-50 rounded-xl"><Filter className="w-4 h-4 text-gray-500" /></div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Filters</h3>
                </div>

                <div className="space-y-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Category</label>
                    <CategoryFilter
                      selectedCategory={selectedCategory}
                      onCategoryChange={setSelectedCategory}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Min Rating</label>
                      <span className="text-sm font-black text-[#434c9d]">{minRating.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={5}
                      step={0.5}
                      value={minRating}
                      onChange={(e) => setMinRating(Number(e.target.value))}
                      className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#434c9d]"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Price Range</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                        <Input
                          placeholder="Min"
                          value={minPrice}
                          onChange={(e) => setMinPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                          className="pl-7 h-11 bg-gray-50/50 border-gray-100 rounded-xl font-medium focus:bg-white transition-all"
                        />
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                        <Input
                          placeholder="Max"
                          value={maxPrice}
                          onChange={(e) => setMaxPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                          className="pl-7 h-11 bg-gray-50/50 border-gray-100 rounded-xl font-medium focus:bg-white transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSelectedCategory("all");
                      setMinRating(0);
                      setMinPrice("");
                      setMaxPrice("");
                    }}
                    className="w-full text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl font-bold h-11 transition-all"
                  >
                    Clear All Filters
                  </Button>
                </div>
              </div>
            </aside>

            {/* Main Results */}
            <main className="lg:col-span-9 space-y-8">
              <div className="flex items-center justify-between bg-gray-50/50 p-3 rounded-2xl border border-gray-100">
                <div className="px-4">
                  <span className="text-sm font-bold text-gray-900">
                    {loading ? "Discovering..." : `${visibleServices.length} Results Found`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex bg-white rounded-xl p-1 shadow-sm border border-gray-100">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={cn(
                        "p-2 rounded-lg transition-all",
                        viewMode === "grid" ? "bg-[#434c9d] text-white" : "text-gray-400 hover:text-gray-600"
                      )}
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={cn(
                        "p-2 rounded-lg transition-all",
                        viewMode === "list" ? "bg-[#434c9d] text-white" : "text-gray-400 hover:text-gray-600"
                      )}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="relative">
                    <select
                      className="appearance-none h-10 pl-4 pr-10 bg-white border border-gray-100 rounded-xl text-sm font-bold text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#434c9d]/10 transition-all cursor-pointer"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                    >
                      <option value="relevance">Relevance</option>
                      <option value="newest">Newest</option>
                      <option value="rating">Best Rated</option>
                      <option value="price_low">Price: Low-High</option>
                      <option value="price_high">Price: High-Low</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {loadError ? (
                <div className="py-24 text-center bg-red-50/30 rounded-[40px] border-2 border-dashed border-red-100">
                  <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm shadow-red-100/50">
                    <Filter className="w-10 h-10 text-red-300" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h3>
                  <p className="text-gray-500 mb-8 max-w-sm mx-auto">{loadError}</p>
                  <Button onClick={() => location.reload()} className="bg-red-500 hover:bg-red-600 rounded-2xl px-8 h-12 font-bold">Retry</Button>
                </div>
              ) : loading ? (
                <div className={cn(
                  "grid gap-8",
                  viewMode === "list" ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                )}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-[32px] p-6 animate-pulse border border-gray-50 shadow-sm">
                      <div className="aspect-[4/3] bg-gray-50 rounded-[24px] mb-6" />
                      <div className="h-4 bg-gray-50 rounded-full w-2/3 mb-3" />
                      <div className="h-4 bg-gray-50 rounded-full w-1/2" />
                    </div>
                  ))}
                </div>
              ) : visibleServices.length > 0 ? (
                <div className={cn(
                  "grid gap-8",
                  viewMode === "list" ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                )}>
                  {visibleServices.map((service) => (
                    <ServiceCard key={service.id} service={service} />
                  ))}
                </div>
              ) : (
                <div className="py-24 text-center bg-gray-50/50 rounded-[40px] border-2 border-dashed border-gray-100">
                  <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <Search className="w-10 h-10 text-gray-200" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No matching services</h3>
                  <p className="text-gray-500 mb-8 max-w-sm mx-auto">Try adjusting your filters or search terms to find what you're looking for.</p>
                  <Button
                    onClick={() => {
                      setServiceQuery("");
                      setLocationQuery("");
                      setSelectedCategory("all");
                      setMinRating(0);
                      setMinPrice("");
                      setMaxPrice("");
                    }}
                    className="bg-[#434c9d] hover:bg-[#434c9d]/90 rounded-2xl px-8 h-12 font-bold"
                  >
                    Reset All Filters
                  </Button>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
