"use client";

import React from "react";
import Navbar from "@/components/navbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, LayoutGrid, List, ChevronDown, MapPin } from "lucide-react";
import CategoryFilter from "@/components/services/CategoryFilter";
import ServiceCard from "@/components/services/ServiceCard";
import { Service } from "@/types/service";
import { cn } from "@/lib/utils";

export default function ServicesPage() {
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

  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const response = await fetch("/api/services/public", {
          next: { revalidate: 30 },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch services");
        }

        const data = await response.json();
        setServices((data?.services ?? []) as Service[]);
      } catch (err: any) {
        console.error("Failed to load services:", err);
        setLoadError(err?.message || "Failed to load services.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const visibleServices = React.useMemo(() => {
    let next = [...services];

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

    if (selectedCategory !== "all") {
      next = next.filter((s) => String(s.category) === selectedCategory);
    }

    if (minRating > 0) {
      next = next.filter((s) => (s.rating ?? 0) >= minRating);
    }

    const minP = minPrice ? Number(minPrice) : undefined;
    const maxP = maxPrice ? Number(maxPrice) : undefined;
    if (minP != null || maxP != null) {
      next = next.filter((s) => {
        if (s.pricing_model === "quote") return true;
        if (typeof s.price !== "number") return false;
        if (minP != null && s.price < minP) return false;
        if (maxP != null && s.price > maxP) return false;
        return true;
      });
    }

    next.sort((a, b) => {
      switch (sortBy) {
        case "newest": {
          const at = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
          return bt - at;
        }
        case "rating": {
          return (b.rating ?? -1) - (a.rating ?? -1);
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
          if (!serviceQuery && !locationQuery) return 0;
          const sq = serviceQuery.toLowerCase();
          const lq = locationQuery.toLowerCase();

          const aTitle = sq && a.title?.toLowerCase().includes(sq) ? 2 : 0;
          const bTitle = sq && b.title?.toLowerCase().includes(sq) ? 2 : 0;

          const aOtherService = sq && a.description?.toLowerCase().includes(sq) ? 1 : 0;
          const bOtherService = sq && b.description?.toLowerCase().includes(sq) ? 1 : 0;

          const aLocation =
            lq &&
            (
              (a.location ?? "").toLowerCase().includes(lq) ||
              (a.provider_city ?? "").toLowerCase().includes(lq) ||
              (a.provider_state ?? "").toLowerCase().includes(lq)
            )
              ? 1
              : 0;
          const bLocation =
            lq &&
            (
              (b.location ?? "").toLowerCase().includes(lq) ||
              (b.provider_city ?? "").toLowerCase().includes(lq) ||
              (b.provider_state ?? "").toLowerCase().includes(lq)
            )
              ? 1
              : 0;
          return bTitle + bOtherService + bLocation - (aTitle + aOtherService + aLocation);
        }
      }
    });

    return next;
  }, [services, serviceQuery, locationQuery, selectedCategory, minRating, minPrice, maxPrice, sortBy]);

  return (
    <div className="min-h-screen bg-white text-gray-700">
      <Navbar />

      <section className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#434c9d]/60">
              Services
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">
              Browse Teen Services
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-600">
              Explore talented local teens offering everything from tutoring and pet care to creative work and neighborhood help.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative mb-12 group">
            <div className="absolute inset-0 rounded-[32px] bg-gradient-to-r from-[#434c9d]/5 to-[#96cbc3]/5 blur-2xl opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative rounded-[32px] border border-gray-100 bg-white p-2 shadow-sm transition-all focus-within:border-[#434c9d]/20 focus-within:shadow-xl">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="flex w-full flex-col gap-2 md:flex-row md:items-center md:gap-3">
                  <div className="relative w-full flex-1">
                    <Search className="absolute left-6 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="What service do you need?"
                      value={serviceQuery}
                      onChange={(e) => setServiceQuery(e.target.value)}
                      className="h-14 border-none bg-transparent pl-14 text-lg font-medium placeholder:text-gray-400 focus-visible:ring-0"
                    />
                  </div>
                  <div className="relative w-full flex-1">
                    <MapPin className="absolute left-6 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Where? (city, neighborhood, or ZIP)"
                      value={locationQuery}
                      onChange={(e) => setLocationQuery(e.target.value)}
                      className="h-14 border-none bg-gray-50/80 pl-14 text-lg font-medium placeholder:text-gray-400 focus-visible:ring-0 md:bg-transparent md:border-l md:border-gray-100 md:rounded-none md:first:rounded-l-[24px] md:last:rounded-r-[24px]"
                    />
                  </div>
                </div>
                <div className="flex w-full items-center gap-2 p-1 md:w-auto">
                  <div className="hidden h-10 w-px bg-gray-100 md:block" />
                  <Button className="h-12 w-full rounded-2xl bg-[#434c9d] px-8 font-bold text-white shadow-lg shadow-[#434c9d]/20 transition-all hover:bg-[#434c9d]/90 md:w-auto">
                    Search
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            <aside className="space-y-8 lg:col-span-3">
              <div className="sticky top-24 rounded-[32px] border border-gray-100 bg-white p-8 shadow-sm">
                <div className="mb-8 flex items-center gap-3">
                  <div className="rounded-xl bg-gray-50 p-2">
                    <Filter className="h-4 w-4 text-gray-500" />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-gray-900">
                    Filters
                  </h3>
                </div>

                <div className="space-y-8">
                  <div className="space-y-4">
                    <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      Category
                    </label>
                    <CategoryFilter
                      selectedCategory={selectedCategory}
                      onCategoryChange={setSelectedCategory}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="ml-1 flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Min Rating
                      </label>
                      <span className="text-sm font-black text-[#434c9d]">
                        {minRating.toFixed(1)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={5}
                      step={0.5}
                      value={minRating}
                      onChange={(e) => setMinRating(Number(e.target.value))}
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-gray-100 accent-[#434c9d]"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      Price Range
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                          $
                        </span>
                        <Input
                          placeholder="Min"
                          value={minPrice}
                          onChange={(e) => setMinPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                          className="h-11 rounded-xl border-gray-100 bg-gray-50/50 pl-7 font-medium transition-all focus:bg-white"
                        />
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                          $
                        </span>
                        <Input
                          placeholder="Max"
                          value={maxPrice}
                          onChange={(e) => setMaxPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                          className="h-11 rounded-xl border-gray-100 bg-gray-50/50 pl-7 font-medium transition-all focus:bg-white"
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
                    className="h-11 w-full rounded-xl font-bold text-red-500 transition-all hover:bg-red-50 hover:text-red-600"
                  >
                    Clear All Filters
                  </Button>
                </div>
              </div>
            </aside>

            <main className="space-y-8 lg:col-span-9">
              <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/50 p-3">
                <div className="px-4">
                  <span className="text-sm font-bold text-gray-900">
                    {loading ? "Discovering..." : `${visibleServices.length} Results Found`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex rounded-xl border border-gray-100 bg-white p-1 shadow-sm">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={cn(
                        "rounded-lg p-2 transition-all",
                        viewMode === "grid" ? "bg-[#434c9d] text-white" : "text-gray-400 hover:text-gray-600"
                      )}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={cn(
                        "rounded-lg p-2 transition-all",
                        viewMode === "list" ? "bg-[#434c9d] text-white" : "text-gray-400 hover:text-gray-600"
                      )}
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="relative">
                    <select
                      className="h-10 cursor-pointer appearance-none rounded-xl border border-gray-100 bg-white pl-4 pr-10 text-sm font-bold text-gray-700 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#434c9d]/10"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                    >
                      <option value="relevance">Relevance</option>
                      <option value="newest">Newest</option>
                      <option value="rating">Best Rated</option>
                      <option value="price_low">Price: Low-High</option>
                      <option value="price_high">Price: High-Low</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
              </div>

              {loadError ? (
                <div className="rounded-[40px] border-2 border-dashed border-red-100 bg-red-50/30 py-24 text-center">
                  <h3 className="mb-2 text-xl font-bold text-gray-900">Something went wrong</h3>
                  <p className="mx-auto mb-8 max-w-sm text-gray-500">{loadError}</p>
                  <Button onClick={() => location.reload()} className="h-12 rounded-2xl bg-red-500 px-8 font-bold hover:bg-red-600">
                    Retry
                  </Button>
                </div>
              ) : loading ? (
                <div className={cn(
                  "grid gap-8",
                  viewMode === "list" ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                )}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="animate-pulse rounded-[32px] border border-gray-50 bg-white p-6 shadow-sm">
                      <div className="mb-6 aspect-[4/3] rounded-[24px] bg-gray-50" />
                      <div className="mb-3 h-4 w-2/3 rounded-full bg-gray-50" />
                      <div className="h-4 w-1/2 rounded-full bg-gray-50" />
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
                <div className="rounded-[40px] border-2 border-dashed border-gray-100 bg-gray-50/50 py-24 text-center">
                  <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-sm">
                    <Search className="h-10 w-10 text-gray-200" />
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-gray-900">No matching services</h3>
                  <p className="mx-auto mb-8 max-w-sm text-gray-500">
                    Try adjusting your filters or search terms to find what you&apos;re looking for.
                  </p>
                  <Button
                    onClick={() => {
                      setServiceQuery("");
                      setLocationQuery("");
                      setSelectedCategory("all");
                      setMinRating(0);
                      setMinPrice("");
                      setMaxPrice("");
                    }}
                    className="h-12 rounded-2xl bg-[#434c9d] px-8 font-bold hover:bg-[#434c9d]/90"
                  >
                    Reset All Filters
                  </Button>
                </div>
              )}
            </main>
          </div>
        </div>
      </section>
    </div>
  );
}
