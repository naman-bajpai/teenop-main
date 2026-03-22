"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Star, Sparkles, Shield, Zap, ArrowRight, Heart, AlertCircle } from "lucide-react";
import Link from "next/link";
import { createPageUrl } from "@/utils";
import { useUser } from "@/hooks/useUser";
import { cn } from "@/lib/utils";

import ServiceCard from "@/components/services/ServiceCard";
import CategoryFilter from "@/components/services/CategoryFilter";
import HeroSection from "@/components/home/HeroSection";
import FeaturedServices from "@/components/home/FeaturedServices";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Service } from "@/types/service";

export default function HomePage() {
  const { user, loading: userLoading, error: userError } = useUser();
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [serviceQuery, setServiceQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all services from the API
  const fetchServices = useCallback(async (forceRefresh = false) => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Use cache: 'no-store' when forceRefresh is true to bypass browser cache
      const fetchOptions = forceRefresh ? { cache: 'no-store' as RequestCache } : {};
      const response = await fetch('/api/services?all=true', fetchOptions);
      if (!response.ok) {
        throw new Error('Failed to fetch services');
      }
      
      const data = await response.json();
      setServices(data.services || []);
    } catch (err) {
      console.error('Error fetching services:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch services');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const filterServices = useCallback(() => {
    let filtered = services;

    const sq = serviceQuery.trim().toLowerCase();
    const lq = locationQuery.trim().toLowerCase();
    if (sq || lq) {
      filtered = filtered.filter((service) => {
        const matchesService =
          !sq ||
          service.title?.toLowerCase().includes(sq) ||
          service.description?.toLowerCase().includes(sq);
        const matchesLocation =
          !lq ||
          (service.location ?? "").toLowerCase().includes(lq) ||
          (service.provider_city ?? "").toLowerCase().includes(lq) ||
          (service.provider_state ?? "").toLowerCase().includes(lq);
        return matchesService && matchesLocation;
      });
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter(service => service.category === selectedCategory);
    }

    setFilteredServices(filtered);
  }, [services, serviceQuery, locationQuery, selectedCategory]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  useEffect(() => {
    filterServices();
  }, [filterServices]);

  const featuredServices = services.slice(0, 6);

  // Show loading state while user data is being fetched
  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#434c9d] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error state if no user data
  if (!userLoading && (!user || userError)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">
            {userError === 'Profile not found. Please complete your profile setup.' 
              ? 'Please complete your profile setup to continue.'
              : 'Unable to load user data. Please try logging in again.'}
          </p>
          <Button 
            onClick={() => window.location.href = userError === 'Profile not found. Please complete your profile setup.' ? '/profile' : '/login'} 
            className="mt-4"
          >
            {userError === 'Profile not found. Please complete your profile setup.' ? 'Complete Profile' : 'Go to Login'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout user={user}>
      {/* Hero Section */}
      <HeroSection user={user} />

      <div className="bg-white">
        {/* Stats Bar */}
        <div className="relative overflow-hidden bg-white py-12">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-full bg-[#434c9d]/5 rounded-full blur-3xl -z-10" />
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { label: "Active Services", value: `${services.length}+`, color: "text-[#434c9d]" },
                { label: "Teen Providers", value: `${new Set(services.map(s => s.user_id)).size}+`, color: "text-[#96cbc3]" },
                { label: "Top Rated", value: `${services.filter(s => s.rating && s.rating >= 4).length}+`, color: "text-[#ff725a]" },
                { label: "Verified Jobs", value: "100%", color: "text-[#434c9d]" }
              ].map((stat, i) => (
                <div key={i} className="text-center space-y-1 group">
                  <div className={cn("text-3xl md:text-4xl font-black transition-transform group-hover:scale-110 duration-300", stat.color)}>
                    {stat.value}
                  </div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Featured Services Section */}
        {featuredServices.length > 0 && (
          <div className="py-16">
            <FeaturedServices services={featuredServices} />
          </div>
        )}

        {/* Main Services Section */}
        <div id="services-section" className="max-w-7xl mx-auto px-4 py-16">
          {error && (
            <div className="mb-12 p-6 bg-red-50/50 border border-red-100 rounded-[32px] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 rounded-2xl text-red-600"><AlertCircle className="w-6 h-6" /></div>
                <div>
                  <p className="font-bold text-gray-900">Couldn't load services</p>
                  <p className="text-sm text-red-600 font-medium">{error}</p>
                </div>
              </div>
              <Button onClick={() => fetchServices(true)} variant="outline" className="rounded-xl font-bold border-red-100 text-red-600 hover:bg-red-50">Retry</Button>
            </div>
          )}

          {/* Section Header */}
          <div className="mb-16">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 mb-12">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 bg-[#96cbc3]/10 text-[#96cbc3] rounded-full px-4 py-1.5">
                  <Zap className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Neighborhood Services</span>
                </div>
                <h2 className="page-title text-gray-900">
                  Discover Talent <span className="text-[#434c9d]">Near You</span>
                </h2>
                <p className="text-lg text-gray-500 font-medium max-w-2xl leading-relaxed">
                  Support local youth while getting things done. From tutoring to lawn care, find the perfect micro-business in your community.
                </p>
              </div>
              
              {user?.role === "teen" && (
                <Link href={createPageUrl("Provider")}>
                  <Button className="group bg-[#434c9d] hover:bg-[#434c9d]/90 text-white shadow-xl shadow-[#434c9d]/20 px-8 h-14 font-bold rounded-[20px] transition-all active:scale-95 flex items-center gap-3">
                    <Sparkles className="w-5 h-5" />
                    Start Offering Services
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              )}
            </div>

            {/* Search Bar — aligned with /services browse UI */}
            <div className="relative group mb-10">
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
                        className="h-14 border-none bg-gray-50/80 pl-14 text-lg font-medium placeholder:text-gray-400 focus-visible:ring-0 md:bg-transparent md:border-l md:border-gray-100 md:rounded-none"
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

            {/* Category Filter */}
            <CategoryFilter 
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />
          </div>

          {/* Services Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="bg-white rounded-[32px] p-6 animate-pulse border border-gray-50 shadow-sm">
                  <div className="aspect-[4/3] bg-gray-50 rounded-[24px] mb-6"></div>
                  <div className="h-4 bg-gray-50 rounded-full w-2/3 mb-3"></div>
                  <div className="h-4 bg-gray-50 rounded-full w-1/2"></div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Results Header */}
              <div className="flex items-center justify-between mb-10 px-6 py-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#96cbc3] animate-pulse" />
                  <p className="text-sm font-bold text-gray-900">
                    {filteredServices.length} {filteredServices.length === 1 ? 'Service' : 'Services'} Found
                  </p>
                </div>
                {selectedCategory !== "all" && (
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedCategory("all")}
                    className="h-8 text-[10px] font-black uppercase tracking-widest text-[#434c9d] hover:bg-white rounded-lg px-3 transition-all"
                  >
                    Clear Filter
                  </Button>
                )}
              </div>

              {/* Services Grid */}
              {filteredServices.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredServices.map((service) => (
                    <ServiceCard key={service.id} service={service} />
                  ))}
                </div>
              ) : (
                <div className="py-24 text-center bg-gray-50/50 rounded-[40px] border-2 border-dashed border-gray-100">
                  <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <Search className="w-10 h-10 text-gray-200" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No services found</h3>
                  <p className="text-gray-500 mb-8 max-w-sm mx-auto leading-relaxed">
                    We couldn't find any services matching your search in this category. Try adjusting your search or browse all services.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setServiceQuery("");
                        setLocationQuery("");
                        setSelectedCategory("all");
                      }}
                      className="rounded-2xl px-8 h-12 font-bold border-gray-200 text-gray-600 hover:bg-white"
                    >
                      Clear All Filters
                    </Button>
                    <Link href="/neighborhood">
                      <Button className="bg-[#434c9d] hover:bg-[#434c9d]/90 text-white rounded-2xl px-8 h-12 font-bold shadow-lg shadow-[#434c9d]/20">
                        Browse Everything
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Trust Badges Section */}
        <div className="py-24 bg-[#434c9d] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
          <div className="max-w-7xl mx-auto px-4 relative z-10">
            <div className="text-center mb-16 space-y-4">
              <h3 className="text-3xl md:text-4xl font-black text-white tracking-tight">Why Choose <span className="text-[#96cbc3]">TeenOp?</span></h3>
              <p className="text-blue-100/70 font-medium max-w-2xl mx-auto">
                Building a safer, stronger community by empowering the next generation of local entrepreneurs.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { icon: Shield, title: "Safe & Filtered", desc: "All teen providers are verified students of your school community. All community buyers given access through school code.", color: "bg-white/10" },
                { icon: Star, title: "Community Rated", desc: "Services are rated and reviewed by real customers in your school community.", color: "bg-white/10" },
                { icon: Heart, title: "Support Local", desc: "Empower local teens to build valuable skills while earning their own money.", color: "bg-white/10" }
              ].map((badge, i) => (
                <div key={i} className={cn("rounded-[32px] p-8 border border-white/10 text-white transition-all hover:translate-y-[-8px] duration-300", badge.color)}>
                  <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                    <badge.icon className="w-7 h-7" />
                  </div>
                  <h4 className="text-xl font-bold mb-3">{badge.title}</h4>
                  <p className="text-blue-100/70 text-sm leading-relaxed font-medium">{badge.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
