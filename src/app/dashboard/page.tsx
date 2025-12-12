"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Star, Sparkles, TrendingUp, Users, Shield, Zap, ArrowRight, Heart } from "lucide-react";
import Link from "next/link";
import { createPageUrl } from "@/utils";
import { useUser } from "@/hooks/useUser";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all services from the API
  const fetchServices = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/services?all=true');
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
    
    if (searchTerm) {
      filtered = filtered.filter(service =>
        service.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.location?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedCategory !== "all") {
      filtered = filtered.filter(service => service.category === selectedCategory);
    }
    
    setFilteredServices(filtered);
  }, [services, searchTerm, selectedCategory]);

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
      <div className="min-h-screen bg-gradient-to-b from-white via-blue-50/30 to-orange-50/20">
        {/* Hero Section */}
        <HeroSection user={user} />
        
        {/* Stats Bar */}
        <div className="bg-white border-b border-gray-100 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#434c9d] to-[#96cbc3] bg-clip-text text-transparent">
                  {services.length}+
                </div>
                <div className="text-xs md:text-sm text-gray-600 mt-1">Active Services</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#ff725a] to-[#434c9d] bg-clip-text text-transparent">
                  {new Set(services.map(s => s.user_id)).size}+
                </div>
                <div className="text-xs md:text-sm text-gray-600 mt-1">Teen Providers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#96cbc3] to-[#ff725a] bg-clip-text text-transparent">
                  {services.filter(s => s.rating && s.rating >= 4).length}+
                </div>
                <div className="text-xs md:text-sm text-gray-600 mt-1">Top Rated</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#434c9d] to-[#ff725a] bg-clip-text text-transparent">
                  100%
                </div>
                <div className="text-xs md:text-sm text-gray-600 mt-1">Verified</div>
              </div>
            </div>
          </div>
        </div>

        {/* Featured Services Section */}
        {featuredServices.length > 0 && (
          <div className="py-12 bg-gradient-to-b from-white to-blue-50/30">
            <FeaturedServices services={featuredServices} />
          </div>
        )}

        {/* Main Services Section */}
        <div id="services-section" className="max-w-7xl mx-auto px-4 py-12">
          {error && (
            <div className="mb-8 p-4 bg-red-50 border-l-4 border-red-400 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-red-700 font-medium">{error}</p>
                <Button 
                  onClick={fetchServices}
                  variant="outline"
                  size="sm"
                  className="border-red-300 text-red-700 hover:bg-red-100"
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {/* Section Header */}
          <div className="mb-10">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#96cbc3]/20 to-[#434c9d]/20 text-[#434c9d] rounded-full px-4 py-1.5 mb-2">
                  <Zap className="w-4 h-4" />
                  <span className="text-sm font-semibold">Explore Services</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 via-[#434c9d] to-[#96cbc3] bg-clip-text text-transparent">
                  Find Help in Your Neighborhood
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl">
                  Discover amazing services offered by talented teens in your community. Support local youth while getting things done!
                </p>
              </div>
              
              {user?.role === "teen" && (
                <Link href={createPageUrl("Provider")}>
                  <Button className="bg-gradient-to-r from-[#ff725a] to-[#434c9d] hover:from-[#ff725a]/90 hover:to-[#434c9d]/90 text-white shadow-lg hover:shadow-xl transition-all px-6 py-6 text-base font-semibold">
                    <Sparkles className="w-5 h-5 mr-2" />
                    Start Your Teen Hustle
                  </Button>
                </Link>
              )}
            </div>

            {/* Search Bar */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search by city or zip code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-4 py-6 text-base bg-gray-50 border-2 border-gray-200 focus:border-[#434c9d] focus:bg-white rounded-xl transition-all"
                />
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-6 shadow-md animate-pulse border border-gray-100">
                  <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Results Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-[#96cbc3]/20 to-[#434c9d]/20 rounded-lg">
                    <Search className="w-5 h-5 text-[#434c9d]" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-gray-900">
                      {filteredServices.length} {filteredServices.length === 1 ? 'Service' : 'Services'} Found
                    </p>
                    <p className="text-sm text-gray-500">
                      {selectedCategory !== "all" ? `in ${selectedCategory.replace('_', ' ')}` : 'across all categories'}
                    </p>
                  </div>
                </div>
                {selectedCategory !== "all" && (
                  <Button
                    variant="outline"
                    onClick={() => setSelectedCategory("all")}
                    className="border-[#96cbc3] text-[#434c9d] hover:bg-[#96cbc3]/10 hover:border-[#434c9d] transition-all"
                  >
                    Clear filters
                  </Button>
                )}
              </div>

              {/* Services Grid */}
              {filteredServices.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredServices.map((service) => (
                    <ServiceCard key={service.id} service={service} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200 shadow-sm">
                  <div className="w-20 h-20 bg-gradient-to-br from-[#96cbc3]/20 to-[#434c9d]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Search className="w-10 h-10 text-[#434c9d]" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    No services found
                  </h3>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    We couldn't find any services matching your search. Try adjusting your filters or browse different categories.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchTerm("");
                        setSelectedCategory("all");
                      }}
                      className="border-[#96cbc3] text-[#434c9d] hover:bg-[#96cbc3]/10 px-6"
                    >
                      Clear all filters
                    </Button>
                    <Link href="/neighborhood">
                      <Button className="bg-gradient-to-r from-[#434c9d] to-[#96cbc3] hover:from-[#434c9d]/90 hover:to-[#96cbc3]/90 text-white px-6">
                        Browse All Services
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Trust Badges Section */}
        <div className="bg-gradient-to-br from-[#434c9d] to-[#96cbc3] py-16 mt-12">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold text-white mb-3">Why Choose TeenOp?</h3>
              <p className="text-blue-100 text-lg max-w-2xl mx-auto">
                Supporting local teens while getting quality services you can trust
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 text-white">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                  <Shield className="w-7 h-7" />
                </div>
                <h4 className="text-xl font-bold mb-2">Safe & Verified</h4>
                <p className="text-blue-100">All teens are verified and background checked for your peace of mind</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 text-white">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                  <Star className="w-7 h-7" />
                </div>
                <h4 className="text-xl font-bold mb-2">Quality Guaranteed</h4>
                <p className="text-blue-100">Rated and reviewed by real customers in your community</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 text-white">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                  <Heart className="w-7 h-7" />
                </div>
                <h4 className="text-xl font-bold mb-2">Support Local</h4>
                <p className="text-blue-100">Help teens in your neighborhood build skills and earn money</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
