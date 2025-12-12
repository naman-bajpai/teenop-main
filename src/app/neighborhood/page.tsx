"use client";

import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Star, Clock, Filter } from "lucide-react";
import CategoryFilter from "@/components/services/CategoryFilter";
import ServiceCard from "@/components/services/ServiceCard";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { Service } from "@/types/service";

export default function NeighborhoodPage() {
  const { user, loading: userLoading } = useUser();
  const [services, setServices] = React.useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = React.useState<Service[]>([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("all");
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
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
        setFilteredServices(list);
        
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

  // Client-side filtering (matches your existing behavior)
  React.useEffect(() => {
    let next = services;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      next = next.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          (s.location ?? "").toLowerCase().includes(q)
      );
    }

    if (selectedCategory !== "all") {
      next = next.filter((s) => s.category === selectedCategory);
    }

    setFilteredServices(next);
  }, [services, searchTerm, selectedCategory]);

  return (
    <DashboardLayout user={user}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-orange-50 to-white">
        <div className="p-6">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-[#96cbc3] to-[#434c9d] bg-clip-text text-transparent mb-3">
              Neighborhood
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Discover amazing services offered by talented teens in your area. 
              Support your local community while getting things done!
            </p>
          </div>

          {/* Search Section */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-blue-100 mb-8">
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  placeholder="Search by city or zip code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-4 py-3 bg-white border-2 border-blue-200 focus:border-blue-400 rounded-xl text-lg shadow-sm"
                />
              </div>
            </div>
          </div>

        {/* Category Filter */}
        <div className="mb-6">
          <CategoryFilter selectedCategory={selectedCategory} onCategoryChange={setSelectedCategory} />
        </div>

          {/* Services Grid */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Available Services</h2>
              <Badge variant="secondary" className="text-sm bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 px-4 py-2 rounded-full">
                {loading ? "Loading..." : `${filteredServices.length} services found`}
              </Badge>
            </div>

            {loadError ? (
              <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl border border-red-200">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Couldn't load services</h3>
                <p className="text-slate-600 mb-4">{loadError}</p>
                <Button 
                  onClick={() => location.reload()}
                  variant="orange"
                >
                  Retry
                </Button>
              </div>
            ) : loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 animate-pulse border border-blue-100 shadow-lg">
                    <div className="h-48 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl mb-4" />
                    <div className="h-4 bg-slate-200 rounded mb-2" />
                    <div className="h-4 bg-slate-200 rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : filteredServices.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredServices.map((service) => (
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
                  Try adjusting your search terms or browse different categories to discover amazing services
                </p>
                <Button
                  variant="orange"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedCategory("all");
                  }}
                  className="px-6 py-2"
                >
                  Clear all filters
                </Button>
              </div>
            )}
          </div>

          {/* Real-time Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl border border-blue-100 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                  <Star className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600 font-medium">Average Rating</p>
                  <p className="text-2xl font-bold text-gray-800">{stats.averageRating.toFixed(1)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl border border-green-100 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600 font-medium">Active Providers</p>
                  <p className="text-2xl font-bold text-gray-800">{stats.activeProviders}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl border border-purple-100 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600 font-medium">Service Areas</p>
                  <p className="text-2xl font-bold text-gray-800">{stats.serviceAreas}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl border border-orange-100 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center">
                  <Search className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600 font-medium">Total Services</p>
                  <p className="text-2xl font-bold text-gray-800">{stats.totalServices}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
