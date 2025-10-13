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

  // Initial load from Supabase (public.v_services)
  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setLoadError(null);
  
        const res = await fetch("/api/services/public");
        if (!res.ok) throw new Error("Failed to fetch services");
  
        const json = await res.json();
        const list = (json?.services ?? []) as Service[];
  
        setServices(list);
        setFilteredServices(list);
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-700 mb-2">Neighborhood</h1>
            <p className="text-slate-600">Discover services offered by talented teens in your area</p>
          </div>

          {/* Search and Filter Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-blue-200 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    placeholder="Search services in your neighborhood..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/80 border-blue-200 focus:border-blue-400"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex items-center gap-2 border-orange-200 text-orange-600 hover:bg-orange-50 hover:border-orange-300">
                  <MapPin className="w-4 h-4" />
                  Location
                </Button>
                <Button variant="outline" className="flex items-center gap-2 border-orange-200 text-orange-600 hover:bg-orange-50 hover:border-orange-300">
                  <Filter className="w-4 h-4" />
                  More Filters
                </Button>
              </div>
            </div>
          </div>

        {/* Category Filter */}
        <div className="mb-6">
          <CategoryFilter selectedCategory={selectedCategory} onCategoryChange={setSelectedCategory} />
        </div>

          {/* Services Grid */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-700">Available Services</h2>
              <Badge variant="secondary" className="text-sm bg-blue-100 text-blue-700">
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
                  <div key={i} className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 animate-pulse border border-blue-200">
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
              <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl border border-blue-200">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-blue-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No services found</h3>
                <p className="text-slate-600 mb-4">Try adjusting your search or browse different categories</p>
                <Button
                  variant="orange"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedCategory("all");
                  }}
                >
                  Clear all filters
                </Button>
              </div>
            )}
          </div>

          {/* Quick Stats (static placeholders for now) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Star className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Average Rating</p>
                  <p className="text-lg font-semibold text-gray-700">4.7</p>
                </div>
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Active Providers</p>
                  <p className="text-lg font-semibold text-gray-700">24</p>
                </div>
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Service Areas</p>
                  <p className="text-lg font-semibold text-gray-700">8</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
