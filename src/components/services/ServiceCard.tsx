import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Star, ChevronRight, User, Sparkles } from "lucide-react";
import { Service, ServiceCategory } from "@/types/service";
import ImageUpload from "@/components/ui/image-upload";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { motion } from "framer-motion";

interface ServiceCardProps {
  service: Service;
  showImageUpload?: boolean;
  onImageUploaded?: (url: string) => void;
  onImageRemoved?: () => void;
  index?: number;
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
  onImageRemoved,
  index = 0
}: ServiceCardProps) {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "pet_care": return "🐕";
      case "lawn_care": return "🌱";
      case "tutoring": return "📚";
      case "cleaning": return "🧹";
      case "tech_support": return "💻";
      case "delivery": return "📦";
      case "art_commissions": return "🎨";
      case "beauty": return "✨";
      case "photography": return "📸";
      case "graphic_design": return "✒️";
      default: return "⭐";
    }
  };

  const getCategoryGradient = (category: string) => {
    switch (category) {
      case "pet_care": return "from-orange-50 to-amber-50";
      case "lawn_care": return "from-emerald-50 to-green-50";
      case "tutoring": return "from-indigo-50 to-blue-50";
      case "cleaning": return "from-fuchsia-50 to-pink-50";
      case "tech_support": return "from-cyan-50 to-sky-50";
      case "delivery": return "from-yellow-50 to-orange-50";
      case "art_commissions": return "from-rose-50 to-pink-50";
      case "beauty": return "from-purple-50 to-fuchsia-50";
      case "photography": return "from-zinc-50 to-slate-50";
      case "graphic_design": return "from-violet-50 to-purple-50";
      default: return "from-slate-50 to-gray-50";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "pet_care": return "bg-orange-100 text-orange-700 border-orange-200";
      case "lawn_care": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "tutoring": return "bg-indigo-100 text-indigo-700 border-indigo-200";
      case "cleaning": return "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200";
      case "tech_support": return "bg-cyan-100 text-cyan-700 border-cyan-200";
      case "delivery": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "art_commissions": return "bg-rose-100 text-rose-700 border-rose-200";
      case "beauty": return "bg-purple-100 text-purple-700 border-purple-200";
      case "photography": return "bg-zinc-100 text-zinc-700 border-zinc-200";
      case "graphic_design": return "bg-violet-100 text-violet-700 border-violet-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const icon = getCategoryIcon(service.category);
  const gradient = getCategoryGradient(service.category);
  const categoryColor = getCategoryColor(service.category);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6, scale: 1.005 }}
      whileTap={{ scale: 0.995 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ 
        duration: 0.5, 
        delay: index * 0.1,
        ease: [0.21, 0.47, 0.32, 0.98] 
      }}
      className="group relative bg-white rounded-[24px] border border-slate-200/60 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] hover:border-[#434c9d]/20 transition-[box-shadow,border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform overflow-hidden flex flex-col h-full cursor-pointer"
    >
      {/* Header Image Section */}
      <div className={cn(
        "relative w-full aspect-[1.4/1] overflow-hidden bg-slate-50",
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
                className="w-full h-full object-cover transition-transform duration-1000 ease-in-out group-hover:scale-105"
              />
            );
          }
          return (
            <div className="flex items-center justify-center h-full">
              <span className="text-6xl filter grayscale opacity-30 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700 ease-out transform group-hover:scale-110">
                {icon}
              </span>
            </div>
          );
        })()}

        {/* Overlay Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-in-out" />
        
        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <Badge className={cn(
            "text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 border backdrop-blur-md shadow-sm transition-all duration-300 group-hover:shadow-md",
            categoryColor
          )}>
            {toTitle(String(service.category))}
          </Badge>

          <div className="flex items-center gap-1 bg-white/95 backdrop-blur-md px-2 py-1 rounded-full shadow-sm border border-slate-100 transition-all duration-300 group-hover:border-white group-hover:shadow-md">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-[11px] font-bold text-slate-900">
              {service.rating != null ? service.rating.toFixed(1) : 'NEW'}
            </span>
          </div>
        </div>

        {/* Status Indicator */}
        {service.status === 'active' && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-emerald-500/90 backdrop-blur-sm text-white text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-lg border border-emerald-400/20 transition-transform duration-500 group-hover:translate-x-1">
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            Active
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-5 flex flex-col flex-1">
        <div className="flex-1 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg font-bold text-slate-900 leading-snug group-hover:text-[#434c9d] transition-colors duration-300 line-clamp-1">
              {service.title}
            </h3>
          </div>
          
          <p className="text-sm text-slate-500 font-medium line-clamp-2 leading-relaxed min-h-[2.5rem] transition-colors duration-300 group-hover:text-slate-600">
            {service.description}
          </p>

          <div className="flex flex-wrap gap-3 pt-1">
            <div className="flex items-center gap-1.5 text-slate-400 transition-colors duration-300 group-hover:text-slate-500">
              <MapPin className="w-3.5 h-3.5" />
              <span className="text-[11px] font-semibold uppercase tracking-wide truncate max-w-[100px]">
                {service.provider_city || service.location || 'Local'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400 transition-colors duration-300 group-hover:text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-[11px] font-semibold uppercase tracking-wide">
                {formatDuration(service.duration || 30)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Section */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Starting at</span>
            {service.pricing_model === 'quote' ? (
              <span className="text-lg font-bold text-slate-900">Get Quote</span>
            ) : (
              <div className="flex items-baseline gap-0.5">
                <span className="text-xl font-bold text-slate-900">{formatPrice(service.price)}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">/hr</span>
              </div>
            )}
          </div>

          <Link href={`/services/${service.id}`}>
            <Button className="h-10 px-5 bg-[#434c9d] hover:bg-[#363d7e] text-white rounded-xl font-bold text-[11px] uppercase tracking-wider shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 active:scale-95 group/btn">
              View <ChevronRight className="ml-1.5 w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-300" />
            </Button>
          </Link>
        </div>

        {/* Provider Info Peek */}
        {service.provider_name && (
          <div className="mt-4 flex items-center gap-2.5 p-2 bg-slate-50/80 rounded-xl border border-slate-100/50 group/provider hover:bg-slate-100/80 transition-all duration-300">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#434c9d] to-[#96cbc3] flex items-center justify-center shadow-sm transition-transform duration-300 group-hover/provider:scale-110">
              <User className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-bold text-slate-600 truncate flex-1 transition-colors duration-300 group-hover/provider:text-slate-900">{service.provider_name}</span>
            <Sparkles className="w-3 h-3 text-[#96cbc3] opacity-0 group-hover/provider:opacity-100 transition-all duration-500 translate-x-1 group-hover/provider:translate-x-0" />
          </div>
        )}

        {/* Admin Image Upload */}
        {showImageUpload && onImageUploaded && onImageRemoved && (
          <div className="mt-4 pt-4 border-t border-slate-100">
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
    </motion.div>
  );
}
