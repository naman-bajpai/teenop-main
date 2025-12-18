"use client";

import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Star, Clock, Filter, LayoutGrid, List } from "lucide-react";
import CategoryFilter from "@/components/services/CategoryFilter";
import ServiceCard from "@/components/services/ServiceCard";
import { useUser } from "@/hooks/useUser";
import { Service } from "@/types/service";

export default function NeighborhoodPage() {
  const { user, loading: userLoading } = useUser();
  const [services, setServices] = React.useState<Service[]>([]);
  const [searchTerm, setSearchTerm] = React.useState("");
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

  // Initial load from Supabase (public.v_services)
  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setLoadError(null);
  
        // Load services and stats in parallel
        const [servicesRes, statsRes] = await Promise.all([
          fetch("/api/services/public"),
          fetch("/api/neighborhood/stats")
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

    // Search filter
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      next = next.filter(
        (s) =>
          s.title?.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q) ||
          (s.location ?? "").toLowerCase().includes(q)
      );
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
          if (!searchTerm) return 0;
          const q = searchTerm.toLowerCase();
          const aTitle = a.title?.toLowerCase().includes(q) ? 2 : 0;
          const bTitle = b.title?.toLowerCase().includes(q) ? 2 : 0;
          const aOther = (a.description?.toLowerCase().includes(q) || (a.location ?? "").toLowerCase().includes(q)) ? 1 : 0;
          const bOther = (b.description?.toLowerCase().includes(q) || (b.location ?? "").toLowerCase().includes(q)) ? 1 : 0;
          return (bTitle + bOther) - (aTitle + aOther);
        }
      }
    });

    return next;
  }, [services, searchTerm, selectedCategory, minRating, minPrice, maxPrice, sortBy]);

  return (
    <DashboardLayout user={user}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-orange-50 to-white">
        <div className="p-6">
          {/* Hero */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-[#96cbc3] to-[#434c9d] bg-clip-text text-transparent mb-3">
              Discover Your Neighborhood
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Hire talented teens near you for trusted, local services. Search, filter, and find the perfect match.
            </p>
          </div>

          {/* Top search */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-blue-100 mb-8">
            <div className="max-w-3xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  placeholder="Search by service, city, or keywords..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-4 py-3 bg-white border-2 border-blue-200 focus:border-blue-400 rounded-xl text-lg shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Content layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sidebar Filters */}
            <aside className="lg:col-span-3 space-y-6">
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-slate-200/60">
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="w-4 h-4 text-slate-500" />
                  <h3 className="font-semibold text-slate-800">Filters</h3>
                </div>

                <CategoryFilter
                  selectedCategory={selectedCategory}
                  onCategoryChange={setSelectedCategory}
                />

                <div className="mt-4">
                  <label className="text-sm font-medium text-slate-700 flex items-center justify-between mb-2">
                    Minimum rating
                    <span className="text-slate-500 font-normal">{minRating.toFixed(1)}</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={5}
                    step={0.5}
                    value={minRating}
                    onChange={(e) => setMinRating(Number(e.target.value))}
                    className="w-full accent-[#434c9d]"
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Min price</label>
                    <Input
                      inputMode="numeric"
                      placeholder="e.g. 10"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Max price</label>
                    <Input
                      inputMode="numeric"
                      placeholder="e.g. 100"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                    />
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedCategory("all");
                      setMinRating(0);
                      setMinPrice("");
                      setMaxPrice("");
                    }}
                    className="w-full"
                  >
                    Clear filters
                  </Button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                <div className="bg-white/90 backdrop-blur-sm p-5 rounded-2xl border border-blue-100 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                      <Star className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 font-medium">Average Rating</p>
                      <p className="text-xl font-bold text-gray-800">{stats.averageRating.toFixed(1)}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/90 backdrop-blur-sm p-5 rounded-2xl border border-green-100 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center">
                      <Clock className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 font-medium">Active Providers</p>
                      <p className="text-xl font-bold text-gray-800">{stats.activeProviders}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/90 backdrop-blur-sm p-5 rounded-2xl border border-purple-100 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 font-medium">Service Areas</p>
                      <p className="text-xl font-bold text-gray-800">{stats.serviceAreas}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/90 backdrop-blur-sm p-5 rounded-2xl border border-orange-100 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center">
                      <Search className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 font-medium">Total Services</p>
                      <p className="text-xl font-bold text-gray-800">{stats.totalServices}</p>
                    </div>
                  </div>
                </div>
              </div>
            </aside>

            {/* Main Results */}
            <section className="lg:col-span-9 space-y-6">
              {/* Controls */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="text-sm bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 px-4 py-2 rounded-full">
                    {loading ? "Loading..." : `${visibleServices.length} services`}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex rounded-xl border border-slate-200 bg-white overflow-hidden">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`px-3 py-2 flex items-center gap-2 text-sm ${viewMode === "grid" ? "bg-slate-100 text-slate-900" : "text-slate-600"}`}
                      title="Grid view"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`px-3 py-2 flex items-center gap-2 text-sm ${viewMode === "list" ? "bg-slate-100 text-slate-900" : "text-slate-600"}`}
                      title="List view"
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="relative">
                    <select
                      className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                    >
                      <option value="relevance">Relevance</option>
                      <option value="newest">Newest</option>
                      <option value="rating">Best rated</option>
                      <option value="price_low">Price: Low to High</option>
                      <option value="price_high">Price: High to Low</option>
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">▼</span>
                  </div>
                </div>
              </div>

              {/* Results */}
              {loadError ? (
                <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl border border-red-200">
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Couldn't load services</h3>
                  <p className="text-slate-600 mb-4">{loadError}</p>
                  <Button onClick={() => location.reload()} variant="orange">Retry</Button>
                </div>
              ) : loading ? (
                <div className={`grid ${viewMode === "list" ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"} gap-6`}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 animate-pulse border border-blue-100 shadow-lg">
                      <div className="h-48 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl mb-4" />
                      <div className="h-4 bg-slate-200 rounded mb-2" />
                      <div className="h-4 bg-slate-200 rounded w-2/3" />
                    </div>
                  ))}
                </div>
              ) : visibleServices.length > 0 ? (
                <div className={`grid ${viewMode === "list" ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"} gap-6`}>
                  {visibleServices.map((service) => (
                    <ServiceCard key={service.id} service={service} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-white/90 backdrop-blur-sm rounded-2xl border border-blue-100 shadow-lg">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Search className="w-10 h-10 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-3">No services found</h3>
                  <p className="text-slate-600 mb-6 max-w-md mx-auto">
                    Try adjusting your search, filters, or browse different categories to discover amazing services.
                  </p>
                  <Button
                    variant="orange"
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedCategory("all");
                      setMinRating(0);
                      setMinPrice("");
                      setMaxPrice("");
                    }}
                    className="px-6 py-2"
                  >
                    Clear all filters
                  </Button>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
