import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Star, ChevronRight } from "lucide-react";
import { Service, ServiceCategory } from "@/types/service";
import ImageUpload from "@/components/ui/image-upload";

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
    day: "numeric",
  });
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
      case "pet_care": return "from-amber-100 to-orange-100";
      case "lawn_care": return "from-green-100 to-emerald-100";
      case "tutoring": return "from-[#96cbc3]/20 to-[#23a699]/20";
      case "cleaning": return "from-purple-100 to-pink-100";
      case "tech_support": return "from-[#96cbc3]/20 to-[#434c9d]/20";
      case "delivery": return "from-yellow-100 to-amber-100";
      default: return "from-gray-100 to-slate-100";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "pet_care": return "bg-amber-100 text-amber-800 border-amber-200";
      case "lawn_care": return "bg-green-100 text-green-800 border-green-200";
      case "tutoring": return "bg-[#96cbc3]/20 text-[#434c9d] border-[#96cbc3]/40";
      case "cleaning": return "bg-purple-100 text-purple-800 border-purple-200";
      case "tech_support": return "bg-[#96cbc3]/20 text-[#434c9d] border-[#96cbc3]/40";
      case "delivery": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const icon = getCategoryIcon(service.category);
  const gradient = getCategoryGradient(service.category);
  const categoryColor = getCategoryColor(service.category);

  return (
    <div className="group bg-white rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-gray-200 transition-all duration-300 overflow-hidden transform hover:-translate-y-1">
      {/* Header with gradient background or image */}
      <div className={`relative h-40 overflow-hidden ${
        service.banner_url ? 'bg-gray-100' : `bg-gradient-to-br ${gradient}`
      }`}>
        {service.banner_url ? (
          <img
            src={service.banner_url}
            alt={service.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <>
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative text-7xl opacity-30 transform group-hover:scale-110 transition-transform duration-300 flex items-center justify-center h-full">
              {icon}
            </div>
          </>
        )}
        
        {/* Status indicator */}
        <div className="absolute top-3 right-3">
          <Badge 
            variant={service.status === 'active' ? 'default' : 'secondary'} 
            className={`text-xs px-2 py-1 ${
              service.status === 'active' 
                ? 'bg-green-100 text-green-700 border-green-200' 
                : 'bg-gray-100 text-gray-600 border-gray-200'
            }`}
          >
            {service.status === 'active' ? 'Available' : 'Paused'}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Title and description */}
        <div className="mb-4">
          <h3 className="font-bold text-gray-900 text-xl mb-2 line-clamp-1 group-hover:text-[#434c9d] transition-colors">
            {service.title}
          </h3>
          <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed">
            {service.description}
          </p>
        </div>

        {/* Category and rating */}
        <div className="flex items-center gap-3 mb-4">
          <Badge className={`text-xs px-3 py-1 border ${categoryColor}`}>
            {toTitle(String(service.category))}
          </Badge>

          <div className="flex items-center gap-1 text-sm text-gray-600 bg-yellow-50 px-2 py-1 rounded-full">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="font-medium">
              {service.rating != null ? service.rating.toFixed(1) : 'New'}
            </span>
            {service.rating != null && (
              <span className="text-xs text-gray-500 ml-1">
                ({service.total_bookings} review{service.total_bookings !== 1 ? 's' : ''})
              </span>
            )}
          </div>
        </div>

        {/* Location and date */}
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-5">
          {service.location && (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <MapPin className="w-4 h-4 shrink-0 text-gray-400" />
              <span className="truncate font-medium">{service.location}</span>
            </div>
          )}
          {service.created_at && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="font-medium">{formatDate(service.created_at)}</span>
            </div>
          )}
        </div>

        {/* Price and action */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-gray-900">
              {formatPrice(service.price)}
            </span>
            <span className="text-sm text-gray-500 font-medium">
              /{service.pricing_model === 'per_hour' ? 'hour' : 'service'}
            </span>
          </div>

          <Button
            asChild
            size="sm"
            className="bg-gradient-to-r from-[#ff725a] to-[#434c9d] hover:from-[#ff725a]/90 hover:to-[#434c9d]/90 text-white shadow-md hover:shadow-lg transition-all duration-200 px-6 py-2 rounded-xl font-medium"
          >
            <Link href={`/services/${service.id}`}>
              View Details
            </Link>
          </Button>
        </div>

        {/* Provider info */}
        {service.provider_name && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Offered by{" "}
              <span className="font-semibold text-gray-700">
                {service.provider_name}
              </span>
            </p>
          </div>
        )}

        {/* Image Upload Section */}
        {showImageUpload && onImageUploaded && onImageRemoved && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Service Image</h4>
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
