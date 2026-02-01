"use client";
import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import MultiImageUpload, { ServiceImage } from "@/components/ui/multi-image-upload";
import { RatingDisplay } from "@/components/ui/rating";
import ServiceAvailabilityCalendar from "@/components/availability/ServiceAvailabilityCalendar";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Star,
  DollarSign,
  MapPin,
  Clock,
  Users,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  LayoutGrid,
  Pause,
  Play,
  ArrowRight,
  Sparkles,
  Info,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { cn } from "@/lib/utils";

export type Service = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  price: number;
  location: string;
  category: string;
  rating: number | null;
  total_bookings: number;
  status: "active" | "paused";
  banner_url: string | null;
  created_at: string;
  duration?: number;
  education?: string | null;
  qualifications?: string | null;
  address?: string | null;
  pricing_model?: "per_job" | "per_hour" | "quote";
  delivery_method?: string | null;
  location_type?: string | null;
  availability?: Record<string, Array<{ start: string; end: string }>> | null;
  images?: ServiceImage[];
};

function ServiceCard({ service, onEdit, onDelete, onToggleStatus }: { service: Service; onEdit: (service: Service) => void; onDelete: (serviceId: string) => void; onToggleStatus: (service: Service) => void }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Get all available images (banner + service images)
  const allImages: string[] = [];
  if (service.banner_url) allImages.push(service.banner_url);
  if (service.images && service.images.length > 0) {
    service.images.forEach(img => {
      if (img.url && !allImages.includes(img.url)) {
        allImages.push(img.url);
      }
    });
  }

  const hasImages = allImages.length > 0;
  const hasMultipleImages = allImages.length > 1;

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  return (
    <div className={cn(
      "bg-white rounded-[32px] overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 group flex flex-col h-full",
      service.status === 'paused' && "opacity-75 grayscale-[0.5]"
    )}>
      {/* Image Section */}
      <div className="relative h-56 bg-gray-50 overflow-hidden">
        {hasImages ? (
          <>
            <img
              src={allImages[currentImageIndex]}
              alt={service.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            {hasMultipleImages && (
              <div className="absolute inset-0 flex items-center justify-between px-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <button
                  onClick={prevImage}
                  className="w-10 h-10 bg-white/90 backdrop-blur-md hover:bg-white text-gray-900 rounded-full flex items-center justify-center shadow-lg pointer-events-auto"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextImage}
                  className="w-10 h-10 bg-white/90 backdrop-blur-md hover:bg-white text-gray-900 rounded-full flex items-center justify-center shadow-lg pointer-events-auto"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 px-3 py-1.5 bg-black/20 backdrop-blur-md rounded-full">
              {allImages.map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    idx === currentImageIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/50'
                  )}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No images uploaded</p>
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
          <Badge className={cn(
            "text-[10px] font-black uppercase tracking-[0.1em] px-3 py-1.5 shadow-lg border-none",
            service.status === 'active' ? "bg-green-500 text-white" : "bg-orange-500 text-white"
          )}>
            {service.status === 'active' ? (
              <span className="flex items-center gap-1.5"><Play className="w-3 h-3 fill-current" /> Active</span>
            ) : (
              <span className="flex items-center gap-1.5"><Pause className="w-3 h-3 fill-current" /> Paused</span>
            )}
          </Badge>
          
          <Badge className="bg-white/90 backdrop-blur-md text-gray-900 text-[10px] font-black uppercase tracking-widest border-none px-3 py-1.5 shadow-lg">
            {service.category.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6 flex flex-col flex-1">
        <div className="mb-6">
          <h3 className="text-xl font-black text-gray-900 mb-2 group-hover:text-[#434c9d] transition-colors">{service.title}</h3>
          <p className="text-sm text-gray-500 font-medium line-clamp-2 leading-relaxed h-10">{service.description}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="flex flex-col gap-1 p-3 bg-[#96cbc3]/5 rounded-2xl border border-[#96cbc3]/10">
            <span className="text-[10px] font-black text-[#96cbc3] uppercase tracking-widest">Price</span>
            <div className="flex items-center gap-1">
              {service.pricing_model === 'quote' ? (
                <span className="font-bold text-gray-900 text-sm">Custom Quote</span>
              ) : (
                <>
                  <span className="font-black text-gray-900 text-lg">${service.price}</span>
                  <span className="text-xs text-gray-400 font-bold">/{service.pricing_model === 'per_hour' ? 'hr' : 'job'}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1 p-3 bg-[#434c9d]/5 rounded-2xl border border-[#434c9d]/10">
            <span className="text-[10px] font-black text-[#434c9d] uppercase tracking-widest">Performance</span>
            <div className="flex items-center gap-2">
              <RatingDisplay rating={service.rating || 0} size="sm" showCount={false} />
              <span className="text-sm font-black text-gray-900">{service.rating || "New"}</span>
            </div>
          </div>
        </div>

        {/* Info Row */}
        <div className="flex items-center justify-between mb-6 px-1">
          <div className="flex items-center gap-2 text-gray-500">
            <MapPin className="w-4 h-4 text-[#96cbc3]" />
            <span className="text-xs font-bold truncate max-w-[100px]">{service.location}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-500">
            <Clock className="w-4 h-4 text-[#434c9d]" />
            <span className="text-xs font-bold">{service.duration || 60} min</span>
          </div>
          <div className="flex items-center gap-2 text-gray-500">
            <Users className="w-4 h-4 text-[#ff725a]" />
            <span className="text-xs font-bold">{service.total_bookings}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-auto pt-6 border-t border-gray-50">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 rounded-xl font-bold border-gray-100 hover:bg-[#434c9d] hover:text-white transition-all h-10"
            onClick={() => window.location.href = `/services/${service.id}`}
          >
            <Eye className="w-4 h-4 mr-2" /> View
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 rounded-xl font-bold border-gray-100 hover:bg-blue-500 hover:text-white transition-all h-10"
            onClick={() => onEdit(service)}
          >
            <Edit className="w-4 h-4 mr-2" /> Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "flex-1 rounded-xl font-bold border-gray-100 transition-all h-10",
              service.status === 'active' 
                ? "hover:bg-orange-500 hover:text-white" 
                : "hover:bg-green-500 hover:text-white"
            )}
            onClick={() => onToggleStatus(service)}
          >
            {service.status === 'active' ? (
              <><Pause className="w-4 h-4 mr-2" /> Pause</>
            ) : (
              <><Play className="w-4 h-4 mr-2" /> Resume</>
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="rounded-xl font-bold border-gray-100 text-gray-400 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all h-10 w-10 shrink-0"
            onClick={() => onDelete(service.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function MyServicesPage() {
  const { user, loading: userLoading, error: userError } = useUser();
  const supabase = useMemo(() => createClient(), []);
  const { toast } = useToast();

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [stripeAccountStatus, setStripeAccountStatus] = useState({
    hasAccount: false,
    accountStatus: null as any,
    loading: true
  });

  const [open, setOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isQuoteBased, setIsQuoteBased] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<number>(10);
  const [location, setLocation] = useState("Online");
  const [category, setCategory] = useState("tutoring");
  const [status, setStatus] = useState<"active" | "paused">("active");
  const [duration, setDuration] = useState<number>(1);
  const [education, setEducation] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [address, setAddress] = useState("");
  const [pricingModel, setPricingModel] = useState<"per_job" | "per_hour">("per_hour");
  const [deliveryMethod, setDeliveryMethod] = useState<"in_person" | "online">("in_person");
  const [locationType, setLocationType] = useState<"public_address" | "client_location">("public_address");
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [serviceImages, setServiceImages] = useState<ServiceImage[]>([]);
  const [serviceAvailability, setServiceAvailability] = useState<Record<string, Array<{ start: string; end: string }>>>({});

  async function fetchServices(forceRefresh = false) {
    try {
      setLoading(true);
      const fetchOptions = forceRefresh ? { cache: 'no-store' as RequestCache } : {};
      const res = await fetch("/api/services", fetchOptions);
      if (res.ok) {
        const data = await res.json();
        const servicesList = data.services || [];
        setServices(servicesList);
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast({ title: "Error loading services", description: errorData.error || "Failed to load services", variant: "destructive" });
        setServices([]);
      }
    } catch (e) {
      toast({ title: "Error loading services", description: "An error occurred", variant: "destructive" });
      setServices([]);
    } finally {
      setLoading(false);
    }
  }

  async function checkStripeAccount(forceRefresh = false) {
    try {
      const fetchOptions = forceRefresh ? { cache: 'no-store' as RequestCache } : {};
      const res = await fetch("/api/stripe/connect/setup", fetchOptions);
      if (res.ok) {
        const data = await res.json();
        setStripeAccountStatus({
          hasAccount: data.success === true && data.hasAccount === true,
          accountStatus: data.accountStatus,
          loading: false
        });
      } else {
        setStripeAccountStatus(prev => ({ ...prev, loading: false }));
      }
    } catch (e) {
      setStripeAccountStatus(prev => ({ ...prev, loading: false }));
    }
  }

  useEffect(() => {
    if (user) {
      fetchServices();
      checkStripeAccount();
    }
  }, [user]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPrice(10);
    setLocation("Online");
    setCategory("tutoring");
    setStatus("active");
    setDuration(1);
    setEducation("");
    setQualifications("");
    setAddress("");
    setPricingModel("per_hour");
    setIsQuoteBased(false);
    setDeliveryMethod("in_person");
    setLocationType("public_address");
    setBannerUrl(null);
    setServiceImages([]);
    setServiceAvailability({});
    setEditingService(null);
  };

  const openEditDialog = (service: Service) => {
    setEditingService(service);
    setTitle(service.title);
    setDescription(service.description);
    setPrice(service.price);
    setLocation(service.location);
    setCategory(service.category);
    setStatus(service.status);
    setDuration(service.duration || 1);
    setEducation(service.education || "");
    setQualifications(service.qualifications || "");
    setAddress(service.address || "");
    setPricingModel(service.pricing_model === 'quote' ? 'per_hour' : (service.pricing_model || 'per_hour'));
    setIsQuoteBased(service.pricing_model === 'quote');
    setDeliveryMethod((service.delivery_method as any) || "in_person");
    setLocationType((service.location_type as any) || "public_address");
    setBannerUrl(service.banner_url);
    setServiceImages(service.images || []);
    setServiceAvailability(service.availability || {});
    setOpen(true);
  };

  async function handleCreateService() {
    try {
      const payload = {
        id: editingService?.id,
        title,
        description,
        price: isQuoteBased ? 0 : price,
        location,
        category,
        status,
        duration,
        education,
        qualifications,
        address,
        pricing_model: isQuoteBased ? "quote" : pricingModel,
        delivery_method: deliveryMethod,
        location_type: locationType,
        banner_url: bannerUrl,
        availability: serviceAvailability
      };

      const res = await fetch("/api/services", {
        method: editingService ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Failed to ${editingService ? 'update' : 'create'} service`);
      }

      const data = await res.json();
      const savedService = data.service;

      if (serviceImages.length > 0) {
        const primaryImage = serviceImages.find(img => img.is_primary) || serviceImages[0];
        const otherImages = serviceImages.filter(img => img.id !== primaryImage.id);
        const imagesToSave = [
          { ...primaryImage, is_primary: true },
          ...otherImages.map(img => ({ ...img, is_primary: false }))
        ];

        await fetch(`/api/services/${savedService.id}/image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ images: imagesToSave }),
        });
      }

      toast({ title: `Service ${editingService ? 'updated' : 'added'}!`, description: `${title} is now ${status}.` });
      setOpen(false);
      resetForm();
      fetchServices(true);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  }

  async function handleDeleteService(serviceId: string) {
    if (!confirm("Delete this service? This action cannot be undone.")) return;
    try {
      const res = await fetch("/api/services", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: serviceId }),
      });
      if (!res.ok) throw new Error("Failed to delete service");
      setServices((prev) => prev.filter(s => s.id !== serviceId));
      toast({ title: "Service deleted" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  }

  async function handleToggleStatus(service: Service) {
    const newStatus = service.status === 'active' ? 'paused' : 'active';
    // Optimistic UI
    setServices(prev => prev.map(s => s.id === service.id ? { ...s, status: newStatus } : s));
    
    try {
      const res = await fetch("/api/services", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: service.id, status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast({ title: `Service ${newStatus === 'active' ? 'resumed' : 'paused'}` });
    } catch (e: any) {
      // Revert optimistic UI
      setServices(prev => prev.map(s => s.id === service.id ? { ...s, status: service.status } : s));
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  }

  const activeServices = services.filter((s) => s.status === "active");
  const pausedServices = services.filter((s) => s.status === "paused");

  if (userLoading) {
    return (
      <DashboardLayout user={user}>
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-4 border-[#434c9d]/20 border-t-[#434c9d] rounded-full animate-spin" />
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Loading your services...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!userLoading && (!user || userError)) {
    return (
      <DashboardLayout user={null}>
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-[32px] flex items-center justify-center mb-6">
            <AlertCircle className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-2">Login Required</h3>
          <p className="text-gray-500 mb-8 max-w-sm">Please log in to your account to manage your services.</p>
          <Button onClick={() => window.location.href = '/login'} className="bg-[#434c9d] hover:bg-[#434c9d]/90 rounded-2xl px-8 h-14 font-black">
            Go to Login
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user}>
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Stripe Alert */}
        {!stripeAccountStatus.loading && !stripeAccountStatus.hasAccount && (
          <div className="mb-12 group">
            <div className="relative overflow-hidden bg-white rounded-[32px] border-2 border-orange-100 p-8 shadow-sm group-hover:shadow-xl transition-all duration-500">
              <div className="absolute top-0 right-0 w-64 h-64 bg-orange-50 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
              <div className="relative flex flex-col md:flex-row items-center gap-8">
                <div className="w-20 h-20 bg-orange-100 rounded-[24px] flex items-center justify-center shrink-0">
                  <Sparkles className="w-10 h-10 text-orange-600" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-2xl font-black text-gray-900 mb-2">Complete Your Setup</h3>
                  <p className="text-gray-500 font-medium leading-relaxed max-w-xl">
                    You're almost ready to start earning! Connect your Stripe account to safely receive payments from your neighbors.
                  </p>
                </div>
                <Button
                  onClick={() => window.location.href = '/my-teen-hustle'}
                  className="bg-orange-500 hover:bg-orange-600 text-white rounded-[20px] px-8 h-14 font-black shadow-lg shadow-orange-200 shrink-0 transition-transform active:scale-95"
                >
                  Connect Now <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 mb-12">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-[#434c9d]/10 text-[#434c9d] rounded-full px-4 py-1.5">
              <LayoutGrid className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.15em]">Provider Dashboard</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
              My <span className="text-[#434c9d]">Services</span>
            </h1>
            <p className="text-lg text-gray-500 font-medium max-w-2xl leading-relaxed">
              Build your local reputation and manage your professional offerings.
            </p>
          </div>

          <Button
            onClick={async () => {
              if (stripeAccountStatus.loading) {
                await checkStripeAccount();
                await new Promise(resolve => setTimeout(resolve, 100));
              }
              if (!stripeAccountStatus.hasAccount) {
                toast({
                  title: "Payment Setup Required",
                  description: "Please connect your Stripe account first.",
                  variant: "destructive"
                });
                return;
              }
              resetForm();
              setOpen(true);
            }}
            className="group bg-[#434c9d] hover:bg-[#434c9d]/90 text-white shadow-xl shadow-[#434c9d]/20 px-8 h-14 font-black rounded-[20px] transition-all active:scale-95 flex items-center gap-3"
          >
            <Plus className="w-6 h-6 transition-transform group-hover:rotate-90" />
            Add New Service
          </Button>
        </div>


        {/* Services Tabs */}
        <Tabs defaultValue="active" className="w-full">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6 mb-10 pb-6 border-b border-gray-100">
            <TabsList className="bg-gray-100/50 p-1.5 rounded-2xl h-auto">
              <TabsTrigger 
                value="active" 
                className="rounded-xl px-8 py-3 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-[#434c9d] data-[state=active]:shadow-sm transition-all"
              >
                Active <span className="ml-2 px-2 py-0.5 bg-green-500/10 text-green-600 rounded-lg">{activeServices.length}</span>
              </TabsTrigger>
              <TabsTrigger 
                value="paused"
                className="rounded-xl px-8 py-3 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-orange-500 data-[state=active]:shadow-sm transition-all"
              >
                Paused <span className="ml-2 px-2 py-0.5 bg-orange-500/10 text-orange-600 rounded-lg">{pausedServices.length}</span>
              </TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-2 text-gray-400">
              <Info className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Paused services aren't visible to customers</span>
            </div>
          </div>

          <TabsContent value="active" className="mt-0">
            {activeServices.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {activeServices.map((s) => (
                  <ServiceCard 
                    key={s.id} 
                    service={s} 
                    onEdit={openEditDialog} 
                    onDelete={handleDeleteService} 
                    onToggleStatus={handleToggleStatus} 
                  />
                ))}
              </div>
            ) : (
              <div className="py-24 text-center bg-gray-50/50 rounded-[40px] border-2 border-dashed border-gray-100">
                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                  <Sparkles className="w-10 h-10 text-gray-200" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to start earning?</h3>
                <p className="text-gray-500 mb-8 max-w-sm mx-auto leading-relaxed font-medium">
                  Create your first service listing to share your skills with the neighborhood.
                </p>
                <Button
                  onClick={() => setOpen(true)}
                  className="bg-[#434c9d] hover:bg-[#434c9d]/90 text-white rounded-2xl px-10 h-14 font-black shadow-lg shadow-[#434c9d]/20 transition-all active:scale-95"
                >
                  Create Your First Listing
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="paused" className="mt-0">
            {pausedServices.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {pausedServices.map((s) => (
                  <ServiceCard 
                    key={s.id} 
                    service={s} 
                    onEdit={openEditDialog} 
                    onDelete={handleDeleteService} 
                    onToggleStatus={handleToggleStatus} 
                  />
                ))}
              </div>
            ) : (
              <div className="py-24 text-center bg-gray-50/50 rounded-[40px] border-2 border-dashed border-gray-100">
                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                  <Pause className="w-10 h-10 text-gray-200" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No paused services</h3>
                <p className="text-gray-500 max-w-sm mx-auto leading-relaxed font-medium">
                  Take a break anytime by pausing your services. They'll appear here until you're ready to resume.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modern Dialog Redesign */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden border-none rounded-[40px] shadow-2xl">
          <div className="bg-gradient-to-r from-[#434c9d] to-[#96cbc3] p-8 text-white">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black">{editingService ? "Edit" : "Create"} Service</DialogTitle>
              <DialogDescription className="text-white/80 text-lg font-medium">
                {editingService ? "Update your listing details" : "Add a new skill to your profile"}
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar bg-white">
            <div className="space-y-10">
              {/* Basic Info Section */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 pb-2 border-b border-gray-50">
                  <div className="w-10 h-10 bg-[#434c9d]/10 rounded-xl flex items-center justify-center">
                    <Info className="w-5 h-5 text-[#434c9d]" />
                  </div>
                  <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest text-[14px]">General Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Service Title</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Mathematics Tutoring" className="h-14 rounded-2xl bg-gray-50 border-none focus:bg-white transition-all text-lg font-bold" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="h-14 rounded-2xl bg-gray-50 border-none focus:bg-white transition-all text-lg font-bold">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-none shadow-xl">
                        <SelectItem value="tutoring">Tutoring</SelectItem>
                        <SelectItem value="pet_care">Pet Care</SelectItem>
                        <SelectItem value="lawn_care">Lawn Care</SelectItem>
                        <SelectItem value="cleaning">Cleaning</SelectItem>
                        <SelectItem value="tech_support">Tech Support</SelectItem>
                        <SelectItem value="delivery">Delivery</SelectItem>
                        <SelectItem value="art_commissions">Art Commissions</SelectItem>
                        <SelectItem value="beauty">Beauty & Wellness</SelectItem>
                        <SelectItem value="photography">Photography</SelectItem>
                        <SelectItem value="graphic_design">Graphic Design</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell your neighbors what makes your service great..." className="min-h-[120px] rounded-[24px] bg-gray-50 border-none focus:bg-white transition-all text-base font-medium resize-none leading-relaxed p-4" />
                </div>
              </section>

              {/* Pricing Section */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 pb-2 border-b border-gray-50">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest text-[14px]">Pricing & Terms</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <Label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Pricing Model</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <Button variant={!isQuoteBased && pricingModel === 'per_hour' ? 'default' : 'outline'} onClick={() => { setIsQuoteBased(false); setPricingModel('per_hour'); }} className="h-14 rounded-2xl font-bold">Per Hour</Button>
                      <Button variant={!isQuoteBased && pricingModel === 'per_job' ? 'default' : 'outline'} onClick={() => { setIsQuoteBased(false); setPricingModel('per_job'); }} className="h-14 rounded-2xl font-bold">Per Job</Button>
                      <Button variant={isQuoteBased ? 'default' : 'outline'} onClick={() => setIsQuoteBased(true)} className="col-span-2 h-14 rounded-2xl font-bold">Quote Based (Contact for Price)</Button>
                    </div>
                  </div>
                  {!isQuoteBased && (
                    <div className="space-y-2">
                      <Label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Price ($)</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="h-14 pl-12 rounded-2xl bg-gray-50 border-none focus:bg-white transition-all text-xl font-black" />
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Logistics Section */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 pb-2 border-b border-gray-50">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest text-[14px]">Location & Logistics</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Location (City/Area)</Label>
                    <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. South Windsor" className="h-14 rounded-2xl bg-gray-50 border-none focus:bg-white transition-all font-bold" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Default Duration (Min)</Label>
                    <Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="h-14 rounded-2xl bg-gray-50 border-none focus:bg-white transition-all font-bold" />
                  </div>
                </div>
              </section>

              {/* Images Section */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 pb-2 border-b border-gray-50">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-amber-600" />
                  </div>
                  <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest text-[14px]">Visuals</h3>
                </div>
                <div className="bg-gray-50 p-6 rounded-[32px]">
                  <MultiImageUpload
                    serviceId={editingService?.id || "new"}
                    currentImages={serviceImages}
                    onImagesChange={setServiceImages}
                    maxImages={5}
                  />
                </div>
              </section>

              {/* Availability Section */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 pb-2 border-b border-gray-50">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest text-[14px]">Weekly Availability</h3>
                </div>
                <div className="bg-gray-50 p-6 rounded-[32px] overflow-x-auto">
                  <ServiceAvailabilityCalendar
                    serviceId={editingService?.id}
                    initialAvailability={serviceAvailability}
                    onSave={setServiceAvailability}
                  />
                </div>
              </section>
            </div>
          </div>

          <div className="p-8 bg-gray-50/50 flex flex-col sm:flex-row gap-4 border-t border-gray-100">
            <Button variant="ghost" onClick={() => setOpen(false)} className="h-14 rounded-2xl font-black px-10">Cancel</Button>
            <Button onClick={handleCreateService} className="flex-1 bg-[#434c9d] hover:bg-[#434c9d]/90 text-white rounded-2xl h-14 font-black shadow-xl shadow-[#434c9d]/20 transition-all active:scale-95">
              {editingService ? "Save Changes" : "Create Listing"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
