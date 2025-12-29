import React from 'react';
import ServiceCard from '@/components/services/ServiceCard';
import { Button } from '@/components/ui/button';
import { ArrowRight, Star, Search, Sparkles } from 'lucide-react';
import { Service } from '@/types/service';
import Link from 'next/link';

interface FeaturedServicesProps {
  services: Service[];
}

export default function FeaturedServices({ services }: FeaturedServicesProps) {
  return (
    <div className="relative py-20 bg-gradient-to-b from-white via-slate-50/50 to-white overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#96cbc3]/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#ff725a]/5 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#96cbc3]/20 to-[#434c9d]/20 text-[#434c9d] rounded-full px-6 py-2 mb-6">
            <Star className="w-4 h-4" />
            <span className="text-sm font-semibold">Featured Services</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-[#434c9d] to-[#96cbc3] bg-clip-text text-transparent mb-6">
            Featured Services
          </h2>
          
          <p className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Discover the most requested services from talented teens in your community
          </p>
        </div>

        {services.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              {services.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
            
            <div className="text-center">
              <Link href="/neighborhood">
                <Button 
                  size="lg"
                  className="group relative bg-gradient-to-r from-[#434c9d] via-[#5a6bc4] to-[#96cbc3] hover:from-[#434c9d]/90 hover:via-[#5a6bc4]/90 hover:to-[#96cbc3]/90 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-10 py-7 text-lg font-semibold rounded-xl overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    View All Services
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <div className="relative w-24 h-24 bg-gradient-to-br from-[#96cbc3]/30 to-[#434c9d]/30 rounded-full flex items-center justify-center mx-auto mb-8">
              <div className="absolute inset-0 bg-gradient-to-br from-[#96cbc3]/20 to-[#434c9d]/20 rounded-full blur-xl"></div>
              <Star className="w-12 h-12 text-[#434c9d] relative z-10" />
            </div>
            <h3 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-[#434c9d] bg-clip-text text-transparent mb-4">
              No featured services yet
            </h3>
            <p className="text-lg text-slate-600 mb-10 max-w-md mx-auto leading-relaxed">
              Be the first to offer a service in your community!
            </p>
            <Button className="group relative bg-gradient-to-r from-[#ff725a] to-[#434c9d] hover:from-[#ff725a]/90 hover:to-[#434c9d]/90 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-8 py-6 text-base font-semibold rounded-xl overflow-hidden">
              <span className="relative z-10 flex items-center gap-2">
                <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                Start Your Service
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
