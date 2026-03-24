import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Star, ChevronRight, User, Sparkles } from "lucide-react";
import { Service, ServiceCategory } from "@/types/service";
import ImageUpload from "@/components/ui/image-upload";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface ServiceCardProps {
  service: Service;
  showImageUpload?: boolean;
  onImageUploaded?: (url: string) => void;
  onImageRemoved?: () => void;
}

const toTitle = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    price
  );

const formatDate = (dateString?: string) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
};

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) return `${minutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
};

export default function ServiceCard({
  service,
  showImageUpload = false,
  onImageUploaded,
  onImageRemoved
}: ServiceCardProps) {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "pet_care": return "🐕";
      case "lawn_care": return "🌱";
      case "tutoring": return "📚";
      case "cleaning": return "🧹";
      case "tech_support": return "💻";
      case "delivery": return "📦";
      default: return "⭐";
    }
  };

  const getCategoryGradient = (category: string) => {
    switch (category) {
      case "pet_care": return "from-amber-100/50 to-orange-100/50";
      case "lawn_care": return "from-green-100/50 to-emerald-100/50";
      case "tutoring": return "from-[#96cbc3]/10 to-[#434c9d]/10";
      case "cleaning": return "from-purple-100/50 to-pink-100/50";
      case "tech_support": return "from-[#96cbc3]/10 to-[#434c9d]/10";
      case "delivery": return "from-yellow-100/50 to-amber-100/50";
      default: return "from-gray-100/50 to-slate-100/50";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "pet_care": return "bg-amber-50 text-amber-700";
      case "lawn_care": return "bg-green-50 text-green-700";
      case "tutoring": return "bg-blue-50 text-[#434c9d]";
      case "cleaning": return "bg-purple-50 text-purple-700";
      case "tech_support": return "bg-cyan-50 text-cyan-700";
      case "delivery": return "bg-yellow-50 text-yellow-700";
      default: return "bg-gray-50 text-gray-700";
    }
  };

  const icon = getCategoryIcon(service.category);
  const gradient = getCategoryGradient(service.category);
  const categoryColor = getCategoryColor(service.category);

  return (
    <div className="group bg-white rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl hover:border-[#434c9d]/10 transition-all duration-500 overflow-hidden flex flex-col h-full active:scale-[0.98]">
      {/* Header Image */}
      <div className={cn(
        "relative w-full aspect-[4/3] overflow-hidden bg-gray-50",
        !((service.images && service.images.length > 0) || service.banner_url) && `bg-gradient-to-br ${gradient}`
      )}>
        {(() => {
          const primaryImage = service.images?.find(img => img.is_primary);
          const firstImage = service.images?.[0];
          const displayImage = primaryImage || firstImage || service.banner_url;

          if (displayImage) {
            return (
              <img
                src={typeof displayImage === 'string' ? displayImage : displayImage.url}
                alt={service.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
            );
          }
          return (
            <div className="flex items-center justify-center h-full">
              <span className="text-7xl opacity-20 transform group-hover:scale-110 transition-transform duration-500">{icon}</span>
            </div>
          );
        })()}

        {/* Top Badges */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
          <Badge className={cn("text-[10px] font-black uppercase tracking-widest px-3 py-1 border-none backdrop-blur-md", categoryColor, "bg-opacity-90")}>
            {toTitle(String(service.category))}
          </Badge>

          <div className="flex items-center gap-1 bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg shadow-sm">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span className="text-[10px] font-black text-gray-900">
              {service.rating != null ? service.rating.toFixed(1) : 'NEW'}
            </span>
          </div>
        </div>

        {/* Floating availability indicator */}
        {service.status === 'active' && (
          <div className="absolute bottom-4 right-4 bg-green-500/90 backdrop-blur-sm text-white text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full shadow-lg">
            Active Now
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col flex-1">
        <div className="flex-1 space-y-3">
          <h3 className="text-xl font-black text-gray-900 leading-tight group-hover:text-[#434c9d] transition-colors line-clamp-1">
            {service.title}
          </h3>
          <p className="text-sm text-gray-500 font-medium line-clamp-2 leading-relaxed">
            {service.description}
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <div className="flex items-center gap-1.5">
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate max-w-[120px]">
                {service.provider_city || service.location || 'Local'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {formatDuration(service.duration || 30)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Area */}
        <div className="mt-8 pt-6 border-t border-gray-50 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Price</p>
              {service.pricing_model === 'quote' ? (
                <p className="text-lg font-black text-gray-900">Get Quote</p>
              ) : (
                <div className="flex items-baseline gap-1">
                  <p className="text-2xl font-black text-gray-900">{formatPrice(service.price)}</p>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">/hr</span>
                </div>
              )}
            </div>

            <Link href={`/services/${service.id}`}>
              <Button className="h-12 px-6 bg-[#434c9d] hover:bg-[#434c9d]/90 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-[#434c9d]/20 transition-all active:scale-95 group/btn">
                Details <ChevronRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          {/* Provider Peek */}
          {service.provider_name && (
            <div className="flex items-center gap-3 p-3 bg-gray-50/50 rounded-2xl border border-gray-100 group/provider">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#434c9d] to-[#96cbc3] flex items-center justify-center shadow-sm">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-700">{service.provider_name}</p>
              </div>
              <Sparkles className="w-3.5 h-3.5 text-[#96cbc3] opacity-0 group-hover/provider:opacity-100 transition-opacity" />
            </div>
          )}
        </div>

        {/* Image Upload - Admin/Owner Context */}
        {showImageUpload && onImageUploaded && onImageRemoved && (
          <div className="mt-6 pt-6 border-t border-gray-50">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 ml-1">Service Banner</p>
            <ImageUpload
              serviceId={service.id}
              userId={service.user_id}
              currentImageUrl={service.banner_url || undefined}
              onImageUploaded={onImageUploaded}
              onImageRemoved={onImageRemoved}
            />
          </div>
        )}
      </div>
    </div>
  );
}
