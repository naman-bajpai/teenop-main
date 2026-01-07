"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MapPin, Clock, Star, ArrowLeft, User, Shield, CheckCircle, AlertCircle, Calendar, Image as ImageIcon, X, DollarSign, FileText, Loader2, MessageCircle } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ServiceAvailabilityCalendar from "@/components/availability/ServiceAvailabilityCalendar";
import ReviewsList from "@/components/reviews/ReviewsList";
import { useUser } from "@/hooks/useUser";
import Link from "next/link";
import { Service } from "@/types/service";
import { CreateBookingRequest, BookingResponse } from "@/types/booking";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export default function ServiceDetailsPage() {
const params = useParams();
const router = useRouter();
const { user, loading: userLoading } = useUser();
const { toast } = useToast();
const [service, setService] = useState<Service | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [providerAvatarUrl, setProviderAvatarUrl] = useState<string | null>(null);
  const [isQuoteDialogOpen, setIsQuoteDialogOpen] = useState(false);
  const [quoteRequestLoading, setQuoteRequestLoading] = useState(false);
  const [quoteRequestSuccess, setQuoteRequestSuccess] = useState(false);
  const [hasBooking, setHasBooking] = useState(false);
  const [checkingBooking, setCheckingBooking] = useState(true);
  const [quoteRequestForm, setQuoteRequestForm] = useState({
    requested_date: "",
    requested_time: "",
    special_instructions: "",
    service_address: "",
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

const [bookingForm, setBookingForm] = useState<CreateBookingRequest>({
  service_id: "",
  requested_date: "",
  requested_time: "",
  special_instructions: "",
  service_address: "",
});

const serviceId = params?.id as string | undefined;

useEffect(() => {
  if (serviceId) {
    void fetchServiceDetails(serviceId);
  }
}, [serviceId]);

// Check if user has a booking for this service
useEffect(() => {
  const checkBooking = async () => {
    if (!serviceId || !user) {
      setCheckingBooking(false);
      return;
    }

    try {
      const res = await fetch(`/api/bookings/check?service_id=${serviceId}`, {
        cache: "no-store"
      });
      if (res.ok) {
        const data = await res.json();
        setHasBooking(data.hasBooking || false);
      }
    } catch (error) {
      console.error("Error checking booking:", error);
    } finally {
      setCheckingBooking(false);
    }
  };

  checkBooking();
}, [serviceId, user]);

// Cleanup image preview URL on unmount
useEffect(() => {
  return () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
  };
}, [imagePreview]);

const fetchServiceDetails = async (id: string) => {
  try {
    setLoading(true);
    setError(null);

    const supabase = createClient();

     // 1) fetch the service row only (no join)
     const { data: svc, error: svcErr } = await supabase
       .from("services")
       .select(`
         id, user_id, title, description, price, location, category, status,
         duration, education, qualifications, address, pricing_model, delivery_method, location_type, banner_url,
         availability, created_at, rating, total_bookings
       `)
       .eq("id", id)
       .single();

     if (svcErr) throw svcErr;
     if (!svc) throw new Error("Service not found");

     // Type assertion for the service data
     const serviceData = svc as any;

     // 2) fetch provider profile separately using user_id
     let provider_name: string | null = null;
     let provider_rating: number | null = null;
     let provider_avatar_url: string | null = null;
     let provider_user_id: string | null = null;

     if (serviceData.user_id) {
       provider_user_id = serviceData.user_id;
       const { data: prof, error: profErr } = await supabase
         .from("profiles")
         .select("first_name, last_name, avatar_url")
         .eq("id", serviceData.user_id)
         .maybeSingle();

       if (!profErr && prof) {
         const profileData = prof as any;
         provider_name = [profileData.first_name, profileData.last_name].filter(Boolean).join(" ").trim() || null;
         provider_avatar_url = profileData.avatar_url ?? null;
       }
     }

     // 3) fetch service images
     const { data: images } = await supabase
       .from("service_images")
       .select("id, service_id, url, is_primary, created_at")
       .eq("service_id", id)
       .order("is_primary", { ascending: false })
       .order("created_at", { ascending: true });

     // 4) normalize for UI (schema default is duration=30, pricing_model='per_job')
     // Parse availability if it's a string (JSON), otherwise use as-is
     let parsedAvailability: Record<string, Array<{ start: string; end: string }>> | null = null;
     if (serviceData.availability) {
       if (typeof serviceData.availability === 'string') {
         try {
           parsedAvailability = JSON.parse(serviceData.availability);
         } catch (e) {
           console.error('Error parsing availability JSON:', e);
           parsedAvailability = null;
         }
       } else if (typeof serviceData.availability === 'object') {
         parsedAvailability = serviceData.availability as Record<string, Array<{ start: string; end: string }>>;
       }
       // Ensure it's not an empty object
       if (parsedAvailability && Object.keys(parsedAvailability).length === 0) {
         parsedAvailability = null;
       }
     }

     const normalizedServiceData: Service = {
       ...serviceData,
       duration: serviceData.duration ?? 30,
       price: serviceData.price ?? 0,
       rating: serviceData.rating ?? provider_rating ?? null,
       total_bookings: serviceData.total_bookings ?? 0,
       description: serviceData.description ?? "",
       location: serviceData.location ?? "",
       pricing_model: (serviceData.pricing_model as any) ?? "per_job",
       provider_name,
       images: images || [],
       user_id: serviceData.user_id, // Already included in serviceData
       availability: parsedAvailability,
     };

     // Debug: Log availability for troubleshooting
     console.log('Service availability:', {
       raw: serviceData.availability,
       parsed: parsedAvailability,
       hasKeys: parsedAvailability ? Object.keys(parsedAvailability).length > 0 : false
     });

     setService(normalizedServiceData);
     setProviderAvatarUrl(provider_avatar_url);
     setBookingForm((prev) => ({ ...prev, service_id: id }));
     
     // Debug: Log provider info for troubleshooting
     console.log('Provider info:', {
       user_id: serviceData.user_id,
       provider_name,
       provider_avatar_url
     });
  } catch (err: any) {
    console.error("Error fetching service:", err);
    setError(err?.message || "Failed to load service details");
    setService(null);
  } finally {
    setLoading(false);
  }
};


const handleBookingSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!user) {
    router.push("/login");
    return;
  }

  if (!bookingForm.requested_date || !bookingForm.requested_time) {
    alert("Please select a date and time for your booking");
    return;
  }

  try {
    setBookingLoading(true);

    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bookingForm),
    });

    const result: BookingResponse = await response.json();

    if (!response.ok || !result?.success) {
      throw new Error(result?.error || "Failed to create booking");
    }

    setBookingSuccess(true);
    setIsBookingDialogOpen(false);

    setBookingForm({
      service_id: serviceId ?? "",
      requested_date: "",
      requested_time: "",
      special_instructions: "",
      service_address: "",
    });
  } catch (err: any) {
    console.error("Error creating booking:", err);
    alert(err?.message || "Failed to create booking. Please try again.");
  } finally {
    setBookingLoading(false);
  }
};

const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith('image/')) {
    alert("Please select an image file");
    return;
  }

  // Validate file size (5MB limit)
  if (file.size > 5 * 1024 * 1024) {
    alert("File size must be less than 5MB");
    return;
  }

  setSelectedImage(file);
  setImagePreview(URL.createObjectURL(file));
};

const removeImage = () => {
  if (imagePreview) {
    URL.revokeObjectURL(imagePreview);
  }
  setSelectedImage(null);
  setImagePreview(null);
  if (fileInputRef.current) {
    fileInputRef.current.value = '';
  }
};

const handleQuoteRequest = async (e?: React.FormEvent) => {
  if (e) e.preventDefault();
  
  if (!user) {
    router.push("/login");
    return;
  }

  if (!service) return;

  if (!quoteRequestForm.requested_date || !quoteRequestForm.requested_time) {
    toast({
      title: "Missing Information",
      description: "Please select a date and time for your quote request",
      variant: "destructive",
    });
    return;
  }

  try {
    setQuoteRequestLoading(true);
    let imageUrl = null;

    // Upload image if selected
    if (selectedImage) {
      setUploadingImage(true);
      // First create the quote request to get an ID
      const tempResponse = await fetch("/api/quotes/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: service.id,
          requested_date: quoteRequestForm.requested_date,
          requested_time: quoteRequestForm.requested_time,
          special_instructions: quoteRequestForm.special_instructions || undefined,
          service_address: quoteRequestForm.service_address || undefined,
        }),
      });

      const tempResult = await tempResponse.json();

      if (!tempResponse.ok || !tempResult?.success) {
        throw new Error(tempResult?.error || "Failed to create quote request");
      }

      const quoteRequestId = tempResult.quote_request.id;

      // Upload image
      const formData = new FormData();
      formData.append('file', selectedImage);
      formData.append('quote_request_id', quoteRequestId);

      const uploadResponse = await fetch("/api/quotes/request/upload-image", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || "Failed to upload image");
      }

      const uploadData = await uploadResponse.json();
      imageUrl = uploadData.url;
      setUploadingImage(false);

      setQuoteRequestSuccess(true);
      setQuoteRequestForm({
        requested_date: "",
        requested_time: "",
        special_instructions: "",
        service_address: "",
      });
      removeImage();
      
      setTimeout(() => {
        setIsQuoteDialogOpen(false);
        setQuoteRequestSuccess(false);
        router.push("/my-quote-requests");
      }, 2000);
    } else {
      // No image, create quote request normally
      const response = await fetch("/api/quotes/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: service.id,
          requested_date: quoteRequestForm.requested_date,
          requested_time: quoteRequestForm.requested_time,
          special_instructions: quoteRequestForm.special_instructions || undefined,
          service_address: quoteRequestForm.service_address || undefined,
      }),
    });

      const result = await response.json();

    if (!response.ok || !result?.success) {
      throw new Error(result?.error || "Failed to create quote request");
    }

      setQuoteRequestSuccess(true);
      setQuoteRequestForm({
        requested_date: "",
        requested_time: "",
        special_instructions: "",
        service_address: "",
      });
      
      setTimeout(() => {
        setIsQuoteDialogOpen(false);
        setQuoteRequestSuccess(false);
        router.push("/my-quote-requests");
      }, 2000);
    }
  } catch (err: any) {
    console.error("Error creating quote request:", err);
    toast({
      title: "Error",
      description: err?.message || "Failed to create quote request. Please try again.",
      variant: "destructive",
    });
  } finally {
    setQuoteRequestLoading(false);
    setUploadingImage(false);
  }
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "pet_care":
      return "🐕";
    case "lawn_care":
      return "🌱";
    case "tutoring":
      return "📚";
    case "cleaning":
      return "🧹";
    case "tech_support":
      return "💻";
    case "delivery":
      return "📦";
    default:
      return "⭐";
  }
};

const getCategoryGradient = (category: string) => {
  switch (category) {
    case "pet_care":
      return "from-amber-100 to-orange-100";
    case "lawn_care":
      return "from-green-100 to-emerald-100";
    case "tutoring":
      return "from-blue-100 to-indigo-100";
    case "cleaning":
      return "from-purple-100 to-pink-100";
    case "tech_support":
      return "from-cyan-100 to-blue-100";
    case "delivery":
      return "from-yellow-100 to-amber-100";
    default:
      return "from-gray-100 to-slate-100";
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case "pet_care":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "lawn_care":
      return "bg-green-100 text-green-800 border-green-200";
    case "tutoring":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "cleaning":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "tech_support":
      return "bg-cyan-100 text-cyan-800 border-cyan-200";
    case "delivery":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(price ?? 0);

const toTitle = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

if (userLoading) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

if (loading) {
  return (
    <DashboardLayout user={user}>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading service details...</p>
        </div>
      </div>
    </DashboardLayout>
  );
}

if (error || !service) {
  return (
    <DashboardLayout user={user}>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Service Not Found</h2>
          <p className="text-gray-600 mb-6">{error || "The service you're looking for doesn't exist."}</p>
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

const icon = getCategoryIcon(service.category);
const gradient = getCategoryGradient(service.category);
const categoryColor = getCategoryColor(service.category);

return (
  <DashboardLayout user={user}>
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-orange-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Button onClick={() => router.back()} variant="ghost" className="mb-6 text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Services
        </Button>

        {bookingSuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <h3 className="font-semibold text-green-800">Booking Request Sent!</h3>
              <p className="text-green-700 text-sm">The provider will review your request and get back to you soon. You can view the status of your request under My Requests and will receive an email confirmation or an alternative proposed time.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 overflow-hidden hover:shadow-xl transition-shadow">
              {/* Main Banner Image - Modern Aspect Ratio */}
              <div className={`relative w-full aspect-[16/9] overflow-hidden ${
                (service.images && service.images.length > 0) || service.banner_url ? 'bg-gray-100' : `bg-gradient-to-br ${gradient} flex items-center justify-center`
              }`}>
                {(() => {
                  const primaryImage = service.images?.find(img => img.is_primary);
                  const firstImage = service.images?.[0];
                  const displayImage = primaryImage || firstImage || service.banner_url;
                  
                  if (displayImage) {
                    return (
                      <img
                        src={typeof displayImage === 'string' ? displayImage : displayImage.url}
                        alt={service.title}
                        className="w-full h-full object-cover"
                      />
                    );
                  }
                  return (
                    <>
                      <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
                      <div className="relative text-9xl opacity-30">{icon}</div>
                    </>
                  );
                })()}
                <div className="absolute top-4 right-4">
                  <Badge
                    variant={service.status === "active" ? "default" : "secondary"}
                    className={`text-sm px-3 py-1 font-semibold shadow-md ${
                      service.status === "active"
                        ? "bg-green-500 text-white border-green-600"
                        : "bg-gray-400 text-white border-gray-500"
                    }`}
                  >
                    {service.status === "active" ? "Available" : "Paused"}
                  </Badge>
                </div>
              </div>

              {/* Image Gallery */}
              {((service.images && service.images.length > 1) || (service.user_id && providerAvatarUrl)) && (
                <div className="p-6 border-t border-gray-200 bg-gray-50">
                  <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-gray-600" />
                    {service.images && service.images.length > 1 ? "More Images" : "Provider"}
                  </h3>
                  <div className="grid grid-cols-4 gap-3">
                    {/* Provider Profile Picture */}
                    {service.user_id && providerAvatarUrl && (
                      <Link 
                        href={`/profile/${service.user_id}`}
                        className="relative aspect-square rounded-xl overflow-hidden border-2 border-[#434c9d] hover:border-[#434c9d]/80 transition-all cursor-pointer group shadow-sm hover:shadow-md"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-xs font-semibold text-white bg-[#434c9d]/90 px-2 py-1 rounded">View Profile</p>
                        </div>
                        <img
                          src={providerAvatarUrl}
                          alt={service.provider_name || "Provider"}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </Link>
                    )}
                    {/* Service Images */}
                    {service.images && service.images.length > 1 && service.images.slice(1).map((image) => (
                      <div key={image.id} className="relative aspect-square rounded-xl overflow-hidden border-2 border-gray-200 hover:border-[#434c9d] transition-all cursor-pointer group shadow-sm hover:shadow-md">
                        <img
                          src={image.url}
                          alt={`${service.title} - Image ${image.id}`}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          onClick={() => {
                            // Scroll to top and could implement lightbox here
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-8">
                {/* Provider Profile Card - Prominent and Clickable */}
                {service.user_id && (
                  <Link 
                    href={`/profile/${service.user_id}`}
                    className="block mb-6 pb-6 border-b border-gray-200 hover:bg-gray-50 rounded-xl p-4 -m-4 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      {providerAvatarUrl ? (
                        <img
                          src={providerAvatarUrl}
                          alt={service.provider_name || "Service Provider"}
                          className="w-16 h-16 rounded-full object-cover border-3 border-white shadow-lg ring-2 ring-blue-100 group-hover:ring-[#434c9d] transition-all"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center border-3 border-white shadow-lg ring-2 ring-blue-100 group-hover:ring-[#434c9d] transition-all">
                          <User className="w-8 h-8 text-blue-600" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Service Provider</p>
                        <h2 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-[#434c9d] transition-colors">
                          {service.provider_name || "View Provider Profile"}
                        </h2>
                        <div className="flex items-center gap-3">
                          {service.rating != null && (
                            <div className="flex items-center gap-1 text-sm">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-semibold text-gray-900">{Number(service.rating).toFixed(1)}</span>
                              <span className="text-gray-500">({service.total_bookings} {service.total_bookings === 1 ? 'booking' : 'bookings'})</span>
                            </div>
                          )}
                          <Badge className={`text-xs px-2 py-1 border ${categoryColor}`}>
                            {toTitle(service.category)}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-2 group-hover:text-[#434c9d] transition-colors">
                          Click to view profile →
                        </p>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowLeft className="w-5 h-5 text-[#434c9d] rotate-[-90deg]" />
                      </div>
                    </div>
                  </Link>
                )}

                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{service.title}</h1>
                    {!service.provider_name && (
                      <div className="flex items-center gap-3">
                        <Badge className={`text-sm px-3 py-1 border ${categoryColor}`}>
                          {toTitle(service.category)}
                        </Badge>
                        {service.rating != null && (
                          <div className="flex items-center gap-1 text-sm text-gray-600 bg-yellow-50 px-3 py-1 rounded-full">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium">{Number(service.rating).toFixed(1)}</span>
                            <span className="text-gray-500">({service.total_bookings} bookings)</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-gray-700 text-lg leading-relaxed mb-6">{service.description}</p>

                {(service.qualifications || service.education) && (
                  <div className="border-t border-gray-200 pt-6 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-blue-600" />
                      Provider Qualifications
                    </h3>
                    <div className="space-y-4">
                      {service.qualifications && (
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                          <p className="text-sm font-semibold text-blue-900 mb-2">Experience & Skills</p>
                          <p className="text-gray-700 leading-relaxed">{service.qualifications}</p>
                        </div>
                      )}
                      {service.education && (
                        <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                          <p className="text-sm font-semibold text-indigo-900 mb-2">Education</p>
                          <p className="text-gray-700 leading-relaxed">{service.education}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Location</p>
                        <p className="font-semibold text-gray-900">{service.location}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Clock className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Duration</p>
                        <p className="font-semibold text-gray-900">{service.duration} minutes</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Pricing</p>
                        <p className="font-semibold text-gray-900">
                          {formatPrice(service.price as number)} / {service.pricing_model === "per_hour" ? "hour" : "service"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Delivery</p>
                        <p className="font-semibold text-gray-900">
                          {service.delivery_method === "in_person" ? "In Person" : "Online"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Service Availability Calendar */}
                {service && service.id && (
                  <div className="mb-6 p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Service Availability</h3>
                      <p className="text-sm text-gray-600">
                        Select the times you're typically available to provide this service. Customers will see your availability, send a booking request, and you can confirm it or suggest an alternative time if needed.
                      </p>
                    </div>
                    <ServiceAvailabilityCalendar 
                      serviceId={service.id}
                      initialAvailability={service.availability && 
                                         service.availability !== null && 
                                         typeof service.availability === 'object' && 
                                         Object.keys(service.availability).length > 0
                        ? (service.availability as Record<string, Array<{ start: string; end: string }>>)
                        : undefined}
                      readOnly={true}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6 sticky top-8 hover:shadow-xl transition-shadow">
              {service.pricing_model === "quote" ? (
                <>
                  <div className="text-center mb-6">
                    <div className="text-2xl font-bold text-gray-900 mb-1">Quote Based</div>
                    <div className="text-sm text-gray-500">
                      Contact provider for pricing
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Dialog open={isQuoteDialogOpen} onOpenChange={setIsQuoteDialogOpen}>
                      <DialogTrigger asChild>
                    <Button
                      className="w-full bg-gradient-to-r from-[#434c9d] to-[#96cbc3] hover:from-[#434c9d]/90 hover:to-[#96cbc3]/90 text-white shadow-lg hover:shadow-xl transition-all duration-200 py-3 text-lg font-semibold"
                          disabled={service.status !== "active"}
                        >
                          {service.status === "active" ? "Request Quote" : "Service Unavailable"}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 bg-gradient-to-br from-[#434c9d]/20 to-[#96cbc3]/20 rounded-xl flex items-center justify-center">
                              <FileText className="w-6 h-6 text-[#434c9d]" />
                            </div>
                            <div>
                              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-[#434c9d] bg-clip-text text-transparent">
                                Request Quote
                              </DialogTitle>
                              <DialogDescription className="text-base mt-1">
                                Get a personalized quote from {service.provider_name || "the provider"}
                              </DialogDescription>
                            </div>
                          </div>
                        </DialogHeader>
                        {quoteRequestSuccess ? (
                          <div className="text-center py-12">
                            <div className="relative w-24 h-24 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                              <div className="absolute inset-0 bg-gradient-to-br from-green-200 to-emerald-200 rounded-full blur-xl opacity-50"></div>
                              <CheckCircle className="w-12 h-12 text-green-600 relative z-10" />
                            </div>
                            <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-green-600 bg-clip-text text-transparent mb-3">
                              Quote Request Sent!
                            </h3>
                            <p className="text-gray-600 mb-6 max-w-md mx-auto leading-relaxed">
                              The provider will review your request and get back to you soon. You can view the status of your request under My Requests and will receive an email confirmation.
                            </p>
                            <Button
                              onClick={() => {
                                setIsQuoteDialogOpen(false);
                                setQuoteRequestSuccess(false);
                                router.push("/my-requests");
                              }}
                              className="bg-gradient-to-r from-[#434c9d] to-[#96cbc3] hover:from-[#434c9d]/90 hover:to-[#96cbc3]/90 text-white"
                            >
                              View My Requests
                            </Button>
                          </div>
                        ) : (
                          <form onSubmit={handleQuoteRequest} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="quote-date" className="text-base font-semibold flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-[#434c9d]" />
                                  Preferred Date *
                                </Label>
                                <Input
                                  id="quote-date"
                                  type="date"
                                  value={quoteRequestForm.requested_date}
                                  onChange={(e) => setQuoteRequestForm((prev) => ({ ...prev, requested_date: e.target.value }))}
                                  min={new Date().toISOString().split("T")[0]}
                                  required
                                  className="h-11 border-2 focus:border-[#434c9d] focus:ring-2 focus:ring-[#434c9d]/20"
                                />
                                <p className="text-xs text-gray-500">Select your preferred service date</p>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="quote-time" className="text-base font-semibold flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-[#434c9d]" />
                                  Preferred Time *
                                </Label>
                                <Input
                                  id="quote-time"
                                  type="time"
                                  value={quoteRequestForm.requested_time}
                                  onChange={(e) => setQuoteRequestForm((prev) => ({ ...prev, requested_time: e.target.value }))}
                                  required
                                  className="h-11 border-2 focus:border-[#434c9d] focus:ring-2 focus:ring-[#434c9d]/20"
                                />
                                <p className="text-xs text-gray-500">Select your preferred service time</p>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="quote-instructions" className="text-base font-semibold flex items-center gap-2">
                                <FileText className="w-4 h-4 text-[#434c9d]" />
                                Special Instructions
                                <span className="text-xs font-normal text-gray-500">(Optional)</span>
                              </Label>
                              <Textarea
                                id="quote-instructions"
                                placeholder="Any specific requirements or details you'd like the provider to know..."
                                value={quoteRequestForm.special_instructions}
                                onChange={(e) =>
                                  setQuoteRequestForm((prev) => ({ ...prev, special_instructions: e.target.value }))
                                }
                                rows={4}
                                className="border-2 focus:border-[#434c9d] focus:ring-2 focus:ring-[#434c9d]/20 resize-none"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="quote-address" className="text-base font-semibold flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-[#434c9d]" />
                                Service Address
                                <span className="text-xs font-normal text-gray-500">(Optional)</span>
                              </Label>
                              <Input
                                id="quote-address"
                                placeholder="Enter address if service will take place at your location..."
                                value={quoteRequestForm.service_address}
                                onChange={(e) =>
                                  setQuoteRequestForm((prev) => ({ ...prev, service_address: e.target.value }))
                                }
                                className="h-11 border-2 focus:border-[#434c9d] focus:ring-2 focus:ring-[#434c9d]/20"
                              />
                              <p className="text-xs text-gray-500">
                                Only include if the service will be performed at your address
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-base font-semibold flex items-center gap-2">
                                <ImageIcon className="w-4 h-4 text-[#434c9d]" />
                                Upload Image
                                <span className="text-xs font-normal text-gray-500">(Optional)</span>
                              </Label>
                              <div className="space-y-3">
                                {imagePreview && (
                                  <div className="relative inline-block group">
                                    <div className="absolute inset-0 bg-gradient-to-br from-[#434c9d]/10 to-[#96cbc3]/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <img
                                      src={imagePreview}
                                      alt="Preview"
                                      className="max-w-full max-h-64 rounded-xl object-contain border-2 border-gray-200 shadow-md"
                                    />
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="sm"
                                      className="absolute top-3 right-3 h-8 w-8 p-0 rounded-full shadow-lg"
                                      onClick={removeImage}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                )}
                                <div className="flex gap-2">
                                  <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageSelect}
                                    className="hidden"
                                    disabled={uploadingImage}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="lg"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadingImage || quoteRequestLoading}
                                    className="flex items-center gap-2 border-2 hover:border-[#434c9d] hover:bg-[#434c9d]/5"
                                  >
                                    <ImageIcon className="w-5 h-5" />
                                    {selectedImage ? "Change Image" : "Select Image"}
                                  </Button>
                                </div>
                                <p className="text-xs text-gray-500">
                                  Upload an image to help the provider understand your request better (max 5MB)
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-gray-200">
                              <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => {
                                  setIsQuoteDialogOpen(false);
                                  removeImage();
                                }} 
                                className="flex-1 h-12 border-2 hover:bg-gray-50" 
                                disabled={quoteRequestLoading || uploadingImage}
                              >
                                Cancel
                              </Button>
                              <Button 
                                type="submit" 
                                disabled={quoteRequestLoading || uploadingImage} 
                                className="flex-1 h-12 bg-gradient-to-r from-[#434c9d] to-[#96cbc3] hover:from-[#434c9d]/90 hover:to-[#96cbc3]/90 text-white shadow-lg hover:shadow-xl transition-all font-semibold"
                              >
                                {uploadingImage ? (
                                  <span className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Uploading...
                                  </span>
                                ) : quoteRequestLoading ? (
                                  <span className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Sending...
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    Request Quote
                                  </span>
                                )}
                              </Button>
                            </div>
                          </form>
                        )}
                      </DialogContent>
                    </Dialog>
                    {service.user_id && user && user.id !== service.user_id && (
                      <Button
                        variant="outline"
                        className="w-full border-[#434c9d] text-[#434c9d] hover:bg-[#434c9d] hover:text-white transition-all duration-200 py-3 text-lg font-semibold"
                        onClick={() => router.push(`/messages?provider_id=${service.user_id}`)}
                      >
                        <MessageCircle className="w-5 h-5 mr-2" />
                        Message Provider
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <div className="text-4xl font-bold text-gray-900 mb-1">{formatPrice(service.price as number)}</div>
                    <div className="text-sm text-gray-500">
                      per {service.pricing_model === "per_hour" ? "hour" : "service"}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                            className="w-full bg-gradient-to-r from-[#434c9d] to-[#96cbc3] hover:from-[#434c9d]/90 hover:to-[#96cbc3]/90 text-white shadow-lg hover:shadow-xl transition-all duration-200 py-3 text-lg font-semibold"
                          disabled={service.status !== "active"}
                        >
                          {service.status === "active" ? "Request Service" : "Service Unavailable"}
                        </Button>
                      </DialogTrigger>
                      </Dialog>
                    {service.user_id && user && user.id !== service.user_id && (
                      <Button
                        variant="outline"
                        className="w-full border-[#434c9d] text-[#434c9d] hover:bg-[#434c9d] hover:text-white transition-all duration-200 py-3 text-lg font-semibold"
                        onClick={() => router.push(`/messages?provider_id=${service.user_id}`)}
                      >
                        <MessageCircle className="w-5 h-5 mr-2" />
                        Message Provider
                      </Button>
                    )}
                    <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Request Service</DialogTitle>
                    <DialogDescription>
                      Fill out the form below to request this service from {service.provider_name}.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleBookingSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="date">Preferred Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={bookingForm.requested_date}
                        onChange={(e) => setBookingForm((prev) => ({ ...prev, requested_date: e.target.value }))}
                        min={new Date().toISOString().split("T")[0]}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="time">Preferred Time</Label>
                      <Input
                        id="time"
                        type="time"
                        value={bookingForm.requested_time}
                        onChange={(e) => setBookingForm((prev) => ({ ...prev, requested_time: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="service-address">Service Address (Optional)</Label>
                      <Input
                        id="service-address"
                        type="text"
                        placeholder="If the service will take place at the client's address, please enter the address here"
                        value={bookingForm.service_address || ""}
                        onChange={(e) =>
                          setBookingForm((prev) => ({ ...prev, service_address: e.target.value }))
                        }
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        If the service will take place at the client's address, please enter the address here.
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="instructions">Special Instructions (Optional)</Label>
                      <Textarea
                        id="instructions"
                        placeholder="Any specific requirements or notes..."
                        value={bookingForm.special_instructions}
                        onChange={(e) =>
                          setBookingForm((prev) => ({ ...prev, special_instructions: e.target.value }))
                        }
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsBookingDialogOpen(false)} className="flex-1">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={bookingLoading} className="flex-1 bg-gradient-to-r from-[#434c9d] to-[#96cbc3] hover:from-[#434c9d]/90 hover:to-[#96cbc3]/90">
                        {bookingLoading ? "Sending..." : "Send Request"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
              
              </div>
                </>
              )}

              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Shield className="w-4 h-4 text-green-500" />
                  <span>Secure booking process</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Provider confirmation required</span>
                </div>
              </div>

              {service.provider_name && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Service Provided By</h3>
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                    {service.user_id ? (
                      <Link href={`/profile/${service.user_id}`} className="cursor-pointer">
                        {providerAvatarUrl ? (
                          <img
                            src={providerAvatarUrl}
                            alt={service.provider_name}
                            className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md hover:ring-2 hover:ring-[#434c9d] transition-all"
                          />
                        ) : (
                          <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center border-2 border-white shadow-md hover:ring-2 hover:ring-[#434c9d] transition-all">
                            <User className="w-7 h-7 text-blue-600" />
                          </div>
                        )}
                      </Link>
                    ) : (
                      <>
                        {providerAvatarUrl ? (
                          <img
                            src={providerAvatarUrl}
                            alt={service.provider_name}
                            className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md"
                          />
                        ) : (
                          <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center border-2 border-white shadow-md">
                            <User className="w-7 h-7 text-blue-600" />
                          </div>
                        )}
                      </>
                    )}
                    <div className="flex-1 min-w-0">
                      {service.user_id ? (
                        <Link 
                          href={`/profile/${service.user_id}`}
                          className="font-semibold text-gray-900 truncate hover:text-[#434c9d] transition-colors cursor-pointer block"
                        >
                          {service.provider_name}
                        </Link>
                      ) : (
                        <p className="font-semibold text-gray-900 truncate">{service.provider_name}</p>
                      )}
                      {service.rating != null && (
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs font-medium text-gray-700">{Number(service.rating).toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* Reviews Section */}
      {service && (
        <div className="mt-8 bg-white rounded-2xl p-8 border-2 border-gray-200 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
            Reviews & Ratings
          </h2>
          <ReviewsList serviceId={service.id} />
        </div>
      )}
  </DashboardLayout>
);
}

