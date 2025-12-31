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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";

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

const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800";
    case "paused":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

function ServiceCard({ service, onEdit, onDelete }: { service: Service; onEdit: (service: Service) => void; onDelete: (serviceId: string) => void }) {
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
    <div className="bg-white rounded-2xl overflow-hidden border-2 border-gray-200 hover:border-[#434c9d] hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 group">
      {/* Image Section */}
      <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        {hasImages ? (
          <>
            <img
              src={allImages[currentImageIndex]}
              alt={service.title}
              className="w-full h-full object-cover transition-opacity duration-300"
            />
            {hasMultipleImages && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {allImages.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1.5 rounded-full transition-all ${
                        idx === currentImageIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/50'
                      }`}
                    />
                  ))}
                </div>
                <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" />
                  <span>{currentImageIndex + 1}/{allImages.length}</span>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-xs text-gray-500">No images</p>
            </div>
          </div>
        )}
        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          <Badge className={`${getStatusColor(service.status)} text-xs font-semibold px-3 py-1 shadow-lg`}>
            {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
          </Badge>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-5">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">{service.title}</h3>
          <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed min-h-[2.5rem]">{service.description}</p>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-center gap-2 p-2.5 bg-green-50 rounded-lg border border-green-100">
            <DollarSign className="w-4 h-4 text-green-600 flex-shrink-0" />
            <div className="min-w-0">
              {service.pricing_model === 'quote' ? (
                <span className="font-bold text-green-900 text-sm">Quote Based</span>
              ) : (
                <div className="flex items-baseline gap-1">
                  <span className="font-bold text-green-900 text-sm">${service.price}</span>
                  <span className="text-xs text-green-700">/{service.pricing_model === 'per_hour' ? 'hr' : 'job'}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2.5 bg-blue-50 rounded-lg border border-blue-100">
            <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="text-sm font-medium text-blue-900 truncate">{service.location}</span>
          </div>
          
          <div className="flex items-center gap-2 p-2.5 bg-purple-50 rounded-lg border border-purple-100">
            <Clock className="w-4 h-4 text-purple-600 flex-shrink-0" />
            <span className="text-sm font-medium text-purple-900">{service.duration || 60} min</span>
          </div>
          
          <div className="flex items-center gap-2 p-2.5 bg-amber-50 rounded-lg border border-amber-100">
            <RatingDisplay rating={service.rating || 0} size="sm" showCount={false} />
            <span className="text-sm font-medium text-amber-900">{service.rating ? `${service.rating}/5` : "No ratings"}</span>
          </div>
        </div>

        {/* Bookings Count */}
        <div className="flex items-center gap-2 mb-4 p-2.5 bg-indigo-50 rounded-lg border border-indigo-100">
          <Users className="w-4 h-4 text-indigo-600" />
          <span className="text-sm font-semibold text-indigo-900">
            {service.total_bookings} {service.total_bookings === 1 ? 'booking' : 'bookings'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-3 border-t border-gray-200">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 border-gray-300 hover:border-[#434c9d] hover:text-[#434c9d] hover:bg-[#434c9d]/5"
            onClick={() => window.location.href = `/services/${service.id}`}
          >
            <Eye className="w-4 h-4 mr-1" />View
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 border-gray-300 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50"
            onClick={() => onEdit(service)}
          >
            <Edit className="w-4 h-4 mr-1" />Edit
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 text-red-600 border-red-200 hover:border-red-400 hover:bg-red-50"
            onClick={() => onDelete(service.id)}
          >
            <Trash2 className="w-4 h-4 mr-1" />Delete
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

  // Add Service dialog state
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

  const activeServices = services.filter(s => s.status === "active");
  const pausedServices = services.filter(s => s.status === "paused");

  useEffect(() => {
    if (user) {
      fetchServices();
      checkStripeAccount();
    }
  }, [user]);

  async function fetchServices() {
    try {
      setLoading(true);
      const res = await fetch("/api/services", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        // Handle both response formats: { services: [...] } or { success: true, services: [...] }
        const servicesList = data.services || [];
        console.log(`[My Services] Fetched ${servicesList.length} services`);
        setServices(servicesList);
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error("Failed to fetch services:", res.status, errorData);
        toast({
          title: "Error loading services",
          description: errorData.error || "Failed to load your services",
          variant: "destructive"
        });
        setServices([]);
      }
    } catch (e) {
      console.error("Failed to fetch services:", e);
      toast({
        title: "Error loading services",
        description: "An error occurred while loading your services",
        variant: "destructive"
      });
      setServices([]);
    } finally {
      setLoading(false);
    }
  }

  async function checkStripeAccount() {
    try {
      const res = await fetch("/api/stripe/connect/setup", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setStripeAccountStatus({
          hasAccount: data.success && !!data.accountStatus?.accountId,
          accountStatus: data.accountStatus,
          loading: false
        });
      }
    } catch (e) {
      console.error("Failed to check Stripe account:", e);
      setStripeAccountStatus(prev => ({ ...prev, loading: false }));
    }
  }

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
    setDuration((service.duration || 60) / 60);
    setEducation(service.education || "");
    setQualifications(service.qualifications || "");
    setAddress(service.address || "");
    setPricingModel(service.pricing_model === "quote" ? "per_hour" : (service.pricing_model || "per_hour"));
    setIsQuoteBased(service.pricing_model === "quote");
    setDeliveryMethod((service.delivery_method as "in_person" | "online") || "in_person");
    setLocationType((service.location_type as "public_address" | "client_location") || "public_address");
    setBannerUrl(service.banner_url);
    setServiceImages(service.images || []);
    if (service.availability && typeof service.availability === 'object') {
      setServiceAvailability(service.availability as Record<string, Array<{ start: string; end: string }>>);
    } else {
      setServiceAvailability({});
    }
    setOpen(true);
  };

  async function handleCreateService() {
    try {
      const userRes = await supabase.auth.getUser();
      const user = userRes.data.user;
      if (!user) throw new Error("You must be signed in to create a service.");

      const isEditing = editingService !== null;
      if (!isEditing && !stripeAccountStatus.hasAccount) {
        toast({
          title: "Payment Account Required",
          description: "You must connect your payment account before adding a service. Please set up payments first.",
          variant: "destructive",
        });
        return;
      }
      const url = "/api/services";
      const method = isEditing ? "PUT" : "POST";
      const body = isEditing 
        ? { 
            id: editingService.id, 
            title, 
            description, 
            price: Number(price), 
            location, 
            category, 
            status,
            duration: Number(duration) * 60,
            education: education.trim() || null,
            qualifications: qualifications.trim() || null,
            address: address.trim() || null,
            pricing_model: isQuoteBased ? "quote" : pricingModel,
            delivery_method: deliveryMethod,
            location_type: locationType,
            banner_url: bannerUrl,
            availability: Object.keys(serviceAvailability).length > 0 ? serviceAvailability : null
          }
        : { 
            title, 
            description, 
            price: Number(price), 
            location, 
            category, 
            status,
            duration: Number(duration) * 60,
            education: education.trim() || null,
            qualifications: qualifications.trim() || null,
            address: address.trim() || null,
            pricing_model: isQuoteBased ? "quote" : pricingModel,
            delivery_method: deliveryMethod,
            location_type: locationType,
            banner_url: bannerUrl,
            availability: Object.keys(serviceAvailability).length > 0 ? serviceAvailability : null
          };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `Failed to ${isEditing ? 'update' : 'create'} service`);
      }

      const { service } = await res.json();
      
      if (serviceImages.length > 0) {
        try {
          const imagesToUpload = serviceImages.filter(img => !img.id);
          
          if (imagesToUpload.length > 0) {
            const formData = new FormData();
            formData.append('service_id', service.id);
            
            for (const image of imagesToUpload) {
              if (image.url.startsWith('blob:')) {
                const response = await fetch(image.url);
                const blob = await response.blob();
                const file = new File([blob], `image-${Date.now()}.png`, { type: blob.type });
                formData.append('images', file);
              }
            }
            
            if (formData.has('images')) {
              const imagesRes = await fetch('/api/services/images', {
                method: 'POST',
                body: formData,
              });
              
              if (imagesRes.ok) {
                const imagesData = await imagesRes.json();
                service.images = imagesData.images || [];
              }
            }
          } else {
            service.images = serviceImages;
          }
        } catch (imgError: any) {
          console.error('Error uploading images:', imgError);
          toast({ 
            title: "Service saved", 
            description: `"${service.title}" was saved, but some images may not have uploaded.`,
            variant: "default"
          });
        }
      }
      
      if (isEditing) {
        setServices((prev) => prev.map(s => s.id === service.id ? { ...service, images: service.images || [] } : s));
        toast({ title: "Service updated", description: `"${service.title}" has been updated.` });
      } else {
        setServices((prev) => [{ ...service, images: service.images || [] }, ...prev]);
        toast({ title: "Service added", description: `"${service.title}" is now ${service.status}.` });
      }
      
      setOpen(false);
      resetForm();
      fetchServices();
    } catch (e: any) {
      toast({ title: `Could not ${editingService ? 'update' : 'add'} service`, description: e.message, variant: "destructive" });
    }
  }

  async function handleDeleteService(serviceId: string) {
    if (!confirm("Are you sure you want to delete this service?")) return;
    
    try {
      const res = await fetch("/api/services", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: serviceId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || "Failed to delete service");
      }

      setServices((prev) => prev.filter(s => s.id !== serviceId));
      toast({ title: "Service deleted", description: "The service has been removed." });
    } catch (e: any) {
      toast({ title: "Could not delete service", description: e.message, variant: "destructive" });
    }
  }

  if (userLoading) {
    return (
      <DashboardLayout user={null}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!userLoading && (!user || userError)) {
    return (
      <DashboardLayout user={null}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600">Please log in to view your services.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user}>
      <div className="p-6">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-[#434c9d] to-[#96cbc3] bg-clip-text text-transparent mb-3">
                My Services
              </h1>
              <p className="text-gray-600 text-lg">Manage your service offerings</p>
            </div>
            <div className="flex gap-2 items-center">
              <Badge variant="secondary">Active: {activeServices.length}</Badge>
              <Badge variant="outline">Paused: {pausedServices.length}</Badge>
              <Button
                onClick={() => {
                  if (!stripeAccountStatus.hasAccount) {
                    toast({
                      title: "Payment setup required",
                      description: "Please set up your payment account before creating your first service.",
                      variant: "destructive"
                    });
                  } else {
                    setOpen(true);
                  }
                }}
                className="bg-[#434c9d] text-white hover:bg-[#434c9d]/90"
              >
                <Plus className="w-4 h-4 mr-2" />Add Service
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 bg-white rounded-xl border">Loading…</div>
          ) : services.length > 0 ? (
            <Tabs defaultValue="active" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1 rounded-xl mb-6">
                <TabsTrigger value="active" className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg font-semibold">
                  Active Services ({activeServices.length})
                </TabsTrigger>
                <TabsTrigger value="paused" className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg font-semibold">
                  Paused Services ({pausedServices.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="mt-6">
                {activeServices.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {activeServices.map((s) => <ServiceCard key={s.id} service={s} onEdit={openEditDialog} onDelete={handleDeleteService} />)}  
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Star className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No active services</h3>
                    <p className="text-gray-600 mb-4">Add a service to get started, or activate a paused service</p>
                    <Button onClick={() => {
                      if (!stripeAccountStatus.hasAccount) {
                        toast({
                          title: "Payment setup required",
                          description: "Please set up your payment account before creating your first service.",
                          variant: "destructive"
                        });
                      } else {
                        setOpen(true);
                      }
                    }}><Plus className="w-4 h-4 mr-2" />Add Service</Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="paused" className="mt-6">
                {pausedServices.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {pausedServices.map((s) => <ServiceCard key={s.id} service={s} onEdit={openEditDialog} onDelete={handleDeleteService} />)}  
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Star className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No paused services</h3>
                    <p className="text-gray-600">Paused services will appear here</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No services yet</h3>
              <p className="text-gray-600 mb-4">Start your teen hustle by adding your first service</p>
              <Button onClick={() => {
                if (!stripeAccountStatus.hasAccount) {
                  toast({
                    title: "Payment setup required",
                    description: "Please set up your payment account before creating your first service.",
                    variant: "destructive"
                  });
                } else {
                  setOpen(true);
                }
              }}><Plus className="w-4 h-4 mr-2" />Add Service</Button>
            </div>
          )}
        </div>

        {/* Service Dialog - Same as in teen hustle page */}
        <Dialog open={open} onOpenChange={(newOpen) => {
          if (newOpen && !editingService && !stripeAccountStatus.loading && !stripeAccountStatus.hasAccount) {
            toast({
              title: "Payment Account Required",
              description: "You must connect your payment account before adding a service. Please set up payments first.",
              variant: "destructive",
            });
            return;
          }
          setOpen(newOpen);
          if (!newOpen) resetForm();
        }}>
          <DialogContent className="w-[95vw] max-w-5xl max-h-[90vh] overflow-y-auto mx-auto p-8">
            <DialogHeader className="text-center pb-6">
              <DialogTitle className="text-2xl font-bold text-gray-800">{editingService ? 'Edit Service' : 'Add a Service'}</DialogTitle>
              <DialogDescription className="text-sm text-gray-600 mt-2">
                Fill in the details below to {editingService ? 'update your service' : 'create your new service'}
              </DialogDescription>
            </DialogHeader>
            
            {!editingService && !stripeAccountStatus.loading && !stripeAccountStatus.hasAccount && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  You must connect your payment account before adding a service. Please set up payments on your Teen Hustle page first.
                </p>
              </div>
            )}
            
            <div className="space-y-8">
              {/* Basic Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-300 pb-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-medium">Service Title *</Label>
                    <Input 
                      id="title" 
                      value={title} 
                      onChange={(e) => setTitle(e.target.value)} 
                      placeholder="e.g., Math Tutoring" 
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Category *</Label>
                    <Select value={category} onValueChange={(v : any ) => setCategory(v)}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select a category" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tutoring">Tutoring</SelectItem>
                        <SelectItem value="pet_care">Pet Care</SelectItem>
                        <SelectItem value="lawn_care">Lawn Care</SelectItem>
                        <SelectItem value="cleaning">Cleaning</SelectItem>
                        <SelectItem value="tech_support">Tech Support</SelectItem>
                        <SelectItem value="delivery">Delivery</SelectItem>
                        <SelectItem value="art_commissions">Art Commissions</SelectItem>
                        <SelectItem value="beauty">Beauty</SelectItem>
                        <SelectItem value="photography">Photography</SelectItem>
                        <SelectItem value="graphic_design">Graphic Design</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">Description *</Label>
                  <Textarea 
                    id="description" 
                    value={description} 
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)} 
                    placeholder="Describe what you offer, what your service includes, or what makes your service unique!" 
                    rows={3}
                    className="w-full resize-none"
                  />
                </div>
              </div>

              {/* Service Images Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-300 pb-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                  Service Images
                </h3>
                <div>
                  <Label className="text-sm font-medium">Upload Multiple Images (Optional)</Label>
                  <p className="text-xs text-gray-500 mb-3">Upload up to 10 images to showcase your service. The first image will be set as primary.</p>
                  <MultiImageUpload
                    serviceId={editingService?.id || "new"}
                    currentImages={serviceImages}
                    onImagesChange={setServiceImages}
                    maxImages={10}
                  />
                </div>
              </div>

              {/* Pricing & Duration Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-300 pb-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Pricing & Duration
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 p-4 border-2 border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      id="quote-based"
                      checked={isQuoteBased}
                      onChange={(e) => {
                        setIsQuoteBased(e.target.checked);
                        if (e.target.checked) {
                          setPrice(0);
                        }
                      }}
                      className="w-5 h-5 text-[#434c9d] border-gray-300 rounded focus:ring-[#434c9d] cursor-pointer"
                    />
                    <Label htmlFor="quote-based" className="text-sm font-semibold cursor-pointer flex-1 text-gray-900">
                      Quote Based Service
                    </Label>
                    <span className="text-xs text-gray-500">(Customers will request quotes and you'll discuss pricing through messages)</span>
                  </div>
                  {!isQuoteBased && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price" className="text-sm font-medium">Price (USD) *</Label>
                    <Input 
                      id="price" 
                      type="number" 
                      min={0} 
                      value={price} 
                      onChange={(e) => setPrice(Number(e.target.value))} 
                      placeholder="25"
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Pricing Model *</Label>
                    <Select value={pricingModel} onValueChange={(v: any) => setPricingModel(v)}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="per_hour">Per Hour</SelectItem>
                        <SelectItem value="per_job">Per Job</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="duration" className="text-sm font-medium">Duration (hours) *</Label>
                    <Input 
                      id="duration" 
                      type="number" 
                      min={0.5} 
                      step={0.5}
                      value={duration} 
                      onChange={(e) => setDuration(Number(e.target.value))} 
                      placeholder="1"
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Location & Status Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-300 pb-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  Location & Status
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-sm font-medium">Location *</Label>
                    <Input 
                      id="location" 
                      value={location} 
                      onChange={(e) => setLocation(e.target.value)} 
                      placeholder="Online / Local Area / Address" 
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-sm font-medium">Specific Address (Optional)</Label>
                    <Input 
                      id="address" 
                      value={address} 
                      onChange={(e) => setAddress(e.target.value)} 
                      placeholder="123 Main St, City, State" 
                      className="w-full"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Delivery Method *</Label>
                    <Select value={deliveryMethod} onValueChange={(v: any) => setDeliveryMethod(v)}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in_person">In Person</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Location Type *</Label>
                    <Select value={locationType} onValueChange={(v: any) => setLocationType(v)}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public_address">Public Address</SelectItem>
                        <SelectItem value="client_location">Client's Location</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Status *</Label>
                  <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                    <SelectTrigger className="w-full max-w-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Service Availability Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-300 pb-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                  Service Availability
                </h3>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Service Availability</Label>
                  <p className="text-xs text-gray-500 mb-4">
                    Select the times you're typically available to provide this service. Customers will see your availability, send a booking request, and you can confirm it or suggest an alternative time if needed.
                  </p>
                  <ServiceAvailabilityCalendar
                    serviceId={editingService?.id}
                    initialAvailability={serviceAvailability}
                    readOnly={false}
                    onSave={(avail) => {
                      setServiceAvailability(avail);
                    }}
                  />
                </div>
              </div>

              {/* Background & Qualifications Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-300 pb-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  Background & Qualifications
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="education" className="text-sm font-medium">Education/Background (Optional)</Label>
                    <Textarea 
                      id="education" 
                      value={education} 
                      onChange={(e) => setEducation(e.target.value)} 
                      placeholder="High school student, college courses, certifications..." 
                      rows={3}
                      className="w-full resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qualifications" className="text-sm font-medium">Qualifications/Skills (Optional)</Label>
                    <Textarea 
                      id="qualifications" 
                      value={qualifications} 
                      onChange={(e) => setQualifications(e.target.value)} 
                      placeholder="Years of experience, special skills, certifications..." 
                      rows={3}
                      className="w-full resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }} className="px-6">
                Cancel
              </Button>
              <Button onClick={handleCreateService} variant="orange" className="px-6">
                {editingService ? 'Update Service' : 'Save Service'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

