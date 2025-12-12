"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MapPin, Clock, Star, ArrowLeft, User, MessageCircle, Shield, CheckCircle, AlertCircle, Calendar, Image as ImageIcon, X } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import WeeklyAvailabilityCalendar from "@/components/availability/WeeklyAvailabilityCalendar";
import { useUser } from "@/hooks/useUser";
import { Service } from "@/types/service";
import { CreateBookingRequest, BookingResponse } from "@/types/booking";
import { createClient } from "@/lib/supabase/client";

export default function ServiceDetailsPage() {
const params = useParams();
const router = useRouter();
const { user, loading: userLoading } = useUser();
const [service, setService] = useState<Service | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [providerScheduleUrl, setProviderScheduleUrl] = useState<string | null>(null);
  const [isQuoteDialogOpen, setIsQuoteDialogOpen] = useState(false);
  const [quoteRequestLoading, setQuoteRequestLoading] = useState(false);
  const [quoteRequestSuccess, setQuoteRequestSuccess] = useState(false);
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
});

const serviceId = params?.id as string | undefined;

useEffect(() => {
  if (serviceId) {
    void fetchServiceDetails(serviceId);
  }
}, [serviceId]);

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
         created_at, rating, total_bookings
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
     let provider_schedule_url: string | null = null;
     let provider_user_id: string | null = null;

     if (serviceData.user_id) {
       provider_user_id = serviceData.user_id;
       const { data: prof, error: profErr } = await supabase
         .from("profiles")
         .select("first_name, last_name, rating, schedule_url")
         .eq("id", serviceData.user_id)
         .maybeSingle();

       if (!profErr && prof) {
         const profileData = prof as any;
         provider_name = [profileData.first_name, profileData.last_name].filter(Boolean).join(" ").trim() || null;
         provider_rating = profileData.rating ?? null;
         provider_schedule_url = profileData.schedule_url ?? null;
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
     };

     setService(normalizedServiceData);
     setProviderScheduleUrl(provider_schedule_url);
     setBookingForm((prev) => ({ ...prev, service_id: id }));
     
     // Debug: Log schedule URL for troubleshooting
     console.log('Provider schedule URL:', provider_schedule_url);
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
    alert("Please select a date and time for your quote request");
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
    alert(err?.message || "Failed to create quote request. Please try again.");
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
              <p className="text-green-700 text-sm">The provider will review your request and get back to you soon.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Main Banner Image - Square */}
              <div className={`relative w-full aspect-square overflow-hidden ${
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
                    className={`text-sm px-3 py-1 ${
                      service.status === "active"
                        ? "bg-green-100 text-green-700 border-green-200"
                        : "bg-gray-100 text-gray-600 border-gray-200"
                    }`}
                  >
                    {service.status === "active" ? "Available" : "Paused"}
                  </Badge>
                </div>
              </div>

              {/* Image Gallery */}
              {service.images && service.images.length > 1 && (
                <div className="p-4 border-t border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">More Images</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {service.images.slice(1).map((image) => (
                      <div key={image.id} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer group">
                        <img
                          src={image.url}
                          alt={`${service.title} - Image ${image.id}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
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
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{service.title}</h1>
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
                  </div>
                </div>

                <p className="text-gray-700 text-lg leading-relaxed mb-6">{service.description}</p>

                {(service.qualifications || service.education) && (
                  <div className="border-t border-gray-100 pt-6 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Provider Qualifications</h3>
                    <div className="space-y-3">
                      {service.qualifications && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Experience & Skills</p>
                          <p className="text-gray-600">{service.qualifications}</p>
                        </div>
                      )}
                      {service.education && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Education</p>
                          <p className="text-gray-600">{service.education}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="border-t border-gray-100 pt-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Location and Duration</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Location</p>
                        <p className="font-medium text-gray-900">{service.location}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Duration</p>
                        <p className="font-medium text-gray-900">{service.duration} minutes</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Provider Schedule - Prominent Display */}
                {providerScheduleUrl && (
                  <div className="mb-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">Provider Schedule</h3>
                        <p className="text-sm text-gray-600 mb-3">
                          Check {service.provider_name ? `${service.provider_name}'s` : "the provider's"} uploaded schedule document.
                        </p>
                        <a
                          href={providerScheduleUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
                        >
                          <span>View Schedule</span>
                          <ArrowLeft className="w-4 h-4 rotate-[-135deg]" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* Provider Weekly Availability Calendar */}
                {service.user_id && (
                  <div className="mb-6 p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Availability</h3>
                    <WeeklyAvailabilityCalendar 
                      userId={service.user_id}
                      readOnly={true}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-8">
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
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Request Quote</DialogTitle>
                          <DialogDescription>
                            Fill out the form below to request a quote from {service.provider_name}.
                          </DialogDescription>
                        </DialogHeader>
                        {providerScheduleUrl && (
                          <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
                            <div className="flex items-start gap-3 mb-3">
                              <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 mb-1">Check Provider Availability</h4>
                                <p className="text-xs text-gray-600 mb-3">
                                  View {service.provider_name ? `${service.provider_name}'s` : "the provider's"} schedule to find the best time for your quote request.
                                </p>
                                <a
                                  href={providerScheduleUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
                                >
                                  <span>Open Schedule</span>
                                  <ArrowLeft className="w-4 h-4 rotate-[-135deg]" />
                                </a>
                              </div>
                            </div>
                          </div>
                        )}
                        {quoteRequestSuccess ? (
                          <div className="text-center py-6">
                            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Quote Request Sent!</h3>
                            <p className="text-gray-600">The provider will review your request and send you a quote soon.</p>
                          </div>
                        ) : (
                          <form onSubmit={handleQuoteRequest} className="space-y-4">
                            <div>
                              <Label htmlFor="quote-date">Preferred Date</Label>
                              <Input
                                id="quote-date"
                                type="date"
                                value={quoteRequestForm.requested_date}
                                onChange={(e) => setQuoteRequestForm((prev) => ({ ...prev, requested_date: e.target.value }))}
                                min={new Date().toISOString().split("T")[0]}
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="quote-time">Preferred Time</Label>
                              <Input
                                id="quote-time"
                                type="time"
                                value={quoteRequestForm.requested_time}
                                onChange={(e) => setQuoteRequestForm((prev) => ({ ...prev, requested_time: e.target.value }))}
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="quote-instructions">Special Instructions (Optional)</Label>
                              <Textarea
                                id="quote-instructions"
                                placeholder="Any specific requirements or details you'd like the provider to know..."
                                value={quoteRequestForm.special_instructions}
                                onChange={(e) =>
                                  setQuoteRequestForm((prev) => ({ ...prev, special_instructions: e.target.value }))
                                }
                                rows={3}
                              />
                            </div>
                            <div>
                              <Label htmlFor="quote-address">Service Address (Optional)</Label>
                              <Input
                                id="quote-address"
                                placeholder="Enter address if service will take place at your location..."
                                value={quoteRequestForm.service_address}
                                onChange={(e) =>
                                  setQuoteRequestForm((prev) => ({ ...prev, service_address: e.target.value }))
                                }
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Only include if the service will be performed at your address
                              </p>
                            </div>
                            <div>
                              <Label>Upload Image (Optional)</Label>
                              <div className="space-y-2">
                                {imagePreview && (
                                  <div className="relative inline-block">
                                    <img
                                      src={imagePreview}
                                      alt="Preview"
                                      className="max-w-full max-h-48 rounded-lg object-contain border border-gray-200"
                                    />
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="sm"
                                      className="absolute top-2 right-2 h-6 w-6 p-0"
                                      onClick={removeImage}
                                    >
                                      <X className="w-3 h-3" />
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
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadingImage || quoteRequestLoading}
                                    className="flex items-center gap-2"
                                  >
                                    <ImageIcon className="w-4 h-4" />
                                    {selectedImage ? "Change Image" : "Select Image"}
                                  </Button>
                                </div>
                                <p className="text-xs text-gray-500">
                                  Upload an image to help the provider understand your request better (max 5MB)
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                              <Button type="button" variant="outline" onClick={() => {
                                setIsQuoteDialogOpen(false);
                                removeImage();
                              }} className="flex-1" disabled={quoteRequestLoading || uploadingImage}>
                                Cancel
                              </Button>
                              <Button type="submit" disabled={quoteRequestLoading || uploadingImage} className="flex-1 bg-gradient-to-r from-[#434c9d] to-[#96cbc3] hover:from-[#434c9d]/90 hover:to-[#96cbc3]/90">
                                {uploadingImage ? "Uploading..." : quoteRequestLoading ? "Sending..." : "Request Quote"}
                    </Button>
                            </div>
                          </form>
                        )}
                      </DialogContent>
                    </Dialog>
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
                    <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Request Service</DialogTitle>
                    <DialogDescription>
                      Fill out the form below to request this service from {service.provider_name}.
                    </DialogDescription>
                  </DialogHeader>
                  {providerScheduleUrl && (
                    <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
                      <div className="flex items-start gap-3 mb-3">
                        <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">Check Provider Availability</h4>
                          <p className="text-xs text-gray-600 mb-3">
                            View {service.provider_name ? `${service.provider_name}'s` : "the provider's"} schedule to find the best time for your booking.
                          </p>
                          <a
                            href={providerScheduleUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
                          >
                            <span>Open Schedule</span>
                            <ArrowLeft className="w-4 h-4 rotate-[-135deg]" />
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
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
              
              <Button
                variant="outline"
                className="w-full border-2 border-[#96cbc3] text-[#434c9d] hover:bg-[#96cbc3]/10 hover:border-[#434c9d] transition-all duration-200 py-3 text-lg font-semibold"
                onClick={() => {
                  // TODO: Implement messaging functionality
                  alert("Messaging feature coming soon!");
                }}
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Message Provider
              </Button>
              </div>
                </>
              )}

              {/* Provider Schedule - Sidebar */}
              {providerScheduleUrl && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border-2 border-blue-200">
                    <div className="flex items-center gap-3 mb-3">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold text-gray-900">Provider Schedule</h3>
                    </div>
                    <p className="text-xs text-gray-600 mb-3">
                      Check availability before booking
                    </p>
                    <a
                      href={providerScheduleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 w-full justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
                    >
                      <span>View Schedule</span>
                      <ArrowLeft className="w-4 h-4 rotate-[-135deg]" />
                    </a>
                  </div>
                </div>
              )}

              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Shield className="w-4 h-4 text-green-500" />
                  <span>Secure booking process</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <MessageCircle className="w-4 h-4 text-blue-500" />
                  <span>Direct communication with provider</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Provider confirmation required</span>
                </div>
              </div>

              {service.provider_name && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{service.provider_name}</p>
                      <p className="text-sm text-gray-500">Service Provider</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>

  </DashboardLayout>
);
}
