import React from 'react';
import ServiceCard from '@/components/services/ServiceCard';
import { Button } from '@/components/ui/button';
import { ArrowRight, Star } from 'lucide-react';

interface Service {
  id: string;
  title: string;
  description: string;
  price: number;
  location?: string;
  category: string;
  rating?: number;
  provider_name?: string;
  created_date?: string;
}

interface FeaturedServicesProps {
  services: Service[];
}

export default function FeaturedServices({ services }: FeaturedServicesProps) {
  return (
    <div className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-sky-100 text-sky-600 rounded-full px-4 py-2 mb-4">
            <Star className="w-4 h-4" />
            <span className="text-sm font-medium">Featured Services</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Popular Services Near You
          </h2>
          
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Discover the most requested services from talented teens in your community
          </p>
        </div>

        {services.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {services.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
            
            <div className="text-center">
              <Button 
                size="lg"
                className="bg-sky-600 hover:bg-sky-700 text-white"
              >
                View All Services
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 text-sky-500" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              No featured services yet
            </h3>
            <p className="text-slate-600 mb-6">
              Be the first to offer a service in your community!
            </p>
            <Button className="bg-sky-600 hover:bg-sky-700 text-white">
              Start Your Service
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
