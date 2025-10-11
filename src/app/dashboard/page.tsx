"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, MapPin, Clock, Star, ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { createPageUrl } from "@/utils";
import { useUser } from "@/hooks/useUser";

import ServiceCard from "@/components/services/ServiceCard";
import CategoryFilter from "@/components/services/CategoryFilter";
import HeroSection from "@/components/home/HeroSection";
import FeaturedServices from "@/components/home/FeaturedServices";
import DashboardLayout from "@/components/layout/DashboardLayout";

// Mock data
const mockServices = [
  {
    id: "1",
    title: "Dog Walking Service",
    description: "Professional dog walking for your furry friends. Available weekdays and weekends.",
    price: 15,
    location: "Downtown Area",
    category: "pet_care",
    rating: 4.8,
    provider_name: "Sarah Johnson",
    created_date: "2024-01-15"
  },
  {
    id: "2",
    title: "Lawn Mowing & Yard Work",
    description: "Complete lawn care including mowing, edging, and basic landscaping.",
    price: 25,
    location: "Suburbs",
    category: "lawn_care",
    rating: 4.9,
    provider_name: "Mike Chen",
    created_date: "2024-01-14"
  },
  {
    id: "3",
    title: "Math & Science Tutoring",
    description: "High school math and science tutoring. Specializing in algebra, geometry, and chemistry.",
    price: 20,
    location: "Online",
    category: "tutoring",
    rating: 4.7,
    provider_name: "Alex Rodriguez",
    created_date: "2024-01-13"
  },
  {
    id: "4",
    title: "House Cleaning Service",
    description: "Thorough house cleaning including bathrooms, kitchens, and living areas.",
    price: 30,
    location: "City Center",
    category: "cleaning",
    rating: 4.6,
    provider_name: "Emma Wilson",
    created_date: "2024-01-12"
  },
  {
    id: "5",
    title: "Tech Support & Setup",
    description: "Computer setup, software installation, and basic tech troubleshooting.",
    price: 18,
    location: "Various Locations",
    category: "tech_support",
    rating: 4.8,
    provider_name: "David Kim",
    created_date: "2024-01-11"
  },
  {
    id: "6",
    title: "Grocery & Package Delivery",
    description: "Reliable delivery service for groceries, packages, and other items.",
    price: 12,
    location: "Local Area",
    category: "delivery",
    rating: 4.5,
    provider_name: "Lisa Thompson",
    created_date: "2024-01-10"
  }
];

export default function HomePage() {
  const { user, loading: userLoading, error: userError } = useUser();
  const [services, setServices] = useState(mockServices);
  const [filteredServices, setFilteredServices] = useState(mockServices);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isLoading, setIsLoading] = useState(false);


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
    filterServices();
  }, [filterServices]);

  const featuredServices = services.slice(0, 6);

  // Show loading state while user data is being fetched
  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-orange-50 to-white">
        <HeroSection user={user} />
        
        {featuredServices.length > 0 && (
          <FeaturedServices services={featuredServices} />
        )}

        <div id="services-section" className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              Find Help in Your Neighborhood
            </h2>
            <p className="text-slate-600">
              Discover services offered by talented teens near you
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search dog walking, mowing..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/80 border-blue-200 focus:border-blue-400"
              />
            </div>
            <Link href={createPageUrl("Provider")}>
              <Button className="bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600 text-white shadow-lg">
                <Sparkles className="w-4 h-4 mr-2" />
                Start Your Teen Hustle
              </Button>
            </Link>
          </div>
        </div>

        <CategoryFilter 
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
                <div className="h-48 bg-slate-200 rounded-xl mb-4"></div>
                <div className="h-4 bg-slate-200 rounded mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-slate-600">
                {filteredServices.length} service{filteredServices.length !== 1 ? 's' : ''} found
              </p>
              {selectedCategory !== "all" && (
                <Button
                  variant="ghost"
                  onClick={() => setSelectedCategory("all")}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Clear filters
                </Button>
              )}
            </div>

            {filteredServices.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredServices.map((service) => (
                  <ServiceCard key={service.id} service={service} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-blue-500" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  No services found
                </h3>
                <p className="text-slate-600 mb-6">
                  Try adjusting your search or browse different categories
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedCategory("all");
                  }}
                  className="border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                  Clear all filters
                </Button>
              </div>
            )}
          </>
        )}
        </div>
      </div>
    </DashboardLayout>
  );
}
