"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MapPin, Clock, Star, ArrowLeft, User, Shield, CheckCircle, AlertCircle, Calendar, Image as ImageIcon, X, DollarSign, FileText, Loader2, ChevronRight, Info, Sparkles } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ServiceAvailabilityCalendar from "@/components/availability/ServiceAvailabilityCalendar";
import ReviewsList from "@/components/reviews/ReviewsList";
import { useUser } from "@/hooks/useUser";
import Link from "next/link";
import { Service } from "@/types/service";
import { CreateBookingRequest, BookingResponse } from "@/types/booking";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

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
  const [existingBookingId, setExistingBookingId] = useState<string | null>(null);
  const [checkingBooking, setCheckingBooking] = useState(true);
  const [bookedDetails, setBookedDetails] = useState<{ date: string; time: string; title: string } | null>(null);
  const [quoteRequestForm, setQuoteRequestForm] = useState({
    requested_date: "",
    requested_time: "",
    special_instructions: "",
    service_address: "",
  });
  const MAX_REFERENCE_IMAGES = 8;
  const [selectedReferenceImages, setSelectedReferenceImages] = useState<
    { file: File; preview: string }[]
  >([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const referencePreviewsRef = React.useRef(selectedReferenceImages);
  referencePreviewsRef.current = selectedReferenceImages;

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
        // Cache for 10 seconds - booking status can change
        const res = await fetch(`/api/bookings/check?service_id=${serviceId}`, {
          next: { revalidate: 10 }
        });
        if (res.ok) {
          const data = await res.json();
          setHasBooking(data.hasBooking || false);
          setExistingBookingId(data.bookingId || null);
        }
      } catch (error) {
        console.error("Error checking booking:", error);
      } finally {
        setCheckingBooking(false);
      }
    };

    checkBooking();
  }, [serviceId, user]);

  useEffect(() => {
    return () => {
      referencePreviewsRef.current.forEach((item) => URL.revokeObjectURL(item.preview));
    };
  }, []);

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
          .select("first_name, last_name, avatar_url, role")
          .eq("id", serviceData.user_id)
          .maybeSingle();

        if (!profErr && prof) {
          const profileData = prof as any;
          const isTeen = profileData.role === "teen";
          provider_name = isTeen ? (profileData.first_name || "").trim() || null : [profileData.first_name, profileData.last_name].filter(Boolean).join(" ").trim() || null;
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

      // Compute rating from reviews (parent/customer reviews) so displayed rating is accurate
      let computedRating: number | null = serviceData.rating ?? provider_rating ?? null;
      try {
        const reviewRes = await fetch(`/api/reviews?service_id=${id}`);
        if (reviewRes.ok) {
          const reviewData = await reviewRes.json();
          const reviews = reviewData.reviews || [];
          if (reviews.length > 0) {
            const sum = reviews.reduce((s: number, r: any) => s + (Number(r.rating) || 0), 0);
            computedRating = Math.round((sum / reviews.length) * 10) / 10;
          }
        }
      } catch (_) {
        // Keep DB rating if review fetch fails
      }

      const normalizedServiceData: Service = {
        ...serviceData,
        duration: serviceData.duration ?? 30,
        price: serviceData.price ?? 0,
        rating: computedRating,
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
      setBookedDetails({
        date: bookingForm.requested_date,
        time: bookingForm.requested_time,
        title: service?.title ?? "Service Booking",
      });

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

  const handleReferenceImagesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const valid: File[] = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        toast({ title: "Invalid file", description: `${file.name} is not an image.`, variant: "destructive" });
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File too large", description: `${file.name} must be under 5MB.`, variant: "destructive" });
        continue;
      }
      valid.push(file);
    }

    if (valid.length === 0) {
      e.target.value = "";
      return;
    }

    setSelectedReferenceImages((prev) => {
      const room = MAX_REFERENCE_IMAGES - prev.length;
      if (room <= 0) {
        toast({
          title: "Limit reached",
          description: `You can add up to ${MAX_REFERENCE_IMAGES} reference images.`,
          variant: "destructive",
        });
        return prev;
      }
      const toAdd = valid.slice(0, room);
      if (valid.length > room) {
        toast({
          title: "Some images skipped",
          description: `Only ${room} more image(s) allowed (max ${MAX_REFERENCE_IMAGES}).`,
        });
      }
      return [...prev, ...toAdd.map((file) => ({ file, preview: URL.createObjectURL(file) }))];
    });
    e.target.value = "";
  };

  const removeReferenceImage = (index: number) => {
    setSelectedReferenceImages((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed.preview);
      return next;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearReferenceImages = () => {
    setSelectedReferenceImages((prev) => {
      prev.forEach((item) => URL.revokeObjectURL(item.preview));
      return [];
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
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

      const quoteRequestId = result.quote_request.id as string;

      if (selectedReferenceImages.length > 0) {
        setUploadingImage(true);
        for (const { file } of selectedReferenceImages) {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("quote_request_id", quoteRequestId);

          const uploadResponse = await fetch("/api/quotes/request/upload-image", {
            method: "POST",
            body: formData,
          });

          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json().catch(() => ({}));
            throw new Error((errorData as { error?: string }).error || "Failed to upload a reference image");
          }
        }
        setUploadingImage(false);
      }

      setQuoteRequestSuccess(true);
      setQuoteRequestForm({
        requested_date: "",
        requested_time: "",
        special_instructions: "",
        service_address: "",
      });
      clearReferenceImages();

      setTimeout(() => {
        setIsQuoteDialogOpen(false);
        setQuoteRequestSuccess(false);
        router.push("/my-requests");
      }, 2000);
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

  const buildCalendarUrls = (date: string, time: string, title: string) => {
    // date: "YYYY-MM-DD", time: "HH:MM"
    const startDt = new Date(`${date}T${time}:00`);
    const endDt = new Date(startDt.getTime() + (service?.duration ?? 60) * 60 * 1000);

    const pad = (n: number) => String(n).padStart(2, "0");
    const fmt = (d: Date) =>
      `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

    const googleUrl = new URL("https://www.google.com/calendar/render");
    googleUrl.searchParams.set("action", "TEMPLATE");
    googleUrl.searchParams.set("text", title);
    googleUrl.searchParams.set("dates", `${fmt(startDt)}/${fmt(endDt)}`);
    googleUrl.searchParams.set("details", `Booking via Teenop`);

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      `DTSTART:${fmt(startDt)}`,
      `DTEND:${fmt(endDt)}`,
      `SUMMARY:${title}`,
      "DESCRIPTION:Booking via Teenop",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const appleUrl = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;

    return { googleUrl: googleUrl.toString(), appleUrl };
  };

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
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-8">
            <Button
              onClick={() => router.back()}
              variant="ghost"
              className="group text-gray-500 hover:text-[#434c9d] transition-colors rounded-xl px-0"
            >
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center mr-3 group-hover:bg-[#434c9d]/10 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </div>
              <span className="font-bold">Back to discovery</span>
            </Button>

            <Badge
              className={cn(
                "text-[10px] font-black uppercase tracking-widest px-4 py-1.5 border-none",
                service.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-500"
              )}
            >
              {service.status === "active" ? "Accepting Bookings" : "Temporarily Paused"}
            </Badge>
          </div>

          {bookingSuccess && (
            <div className="mb-12 p-6 bg-green-50/50 border border-green-100 rounded-[32px] animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-2xl text-green-600 shadow-lg shadow-green-100/50 shrink-0">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 leading-tight">Request Sent Successfully!</h3>
                  <p className="text-green-700 font-medium text-sm mt-0.5">The provider will review your request and respond shortly. You will receive an email notification when the teen provider responds. View the status of your request under the Requests tab.</p>
                </div>
              </div>
              {bookedDetails && (() => {
                const { googleUrl, appleUrl } = buildCalendarUrls(bookedDetails.date, bookedDetails.time, bookedDetails.title);
                return (
                  <div className="mt-4 flex flex-wrap gap-3 pl-[60px]">
                    <a
                      href={googleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-green-200 text-sm font-semibold text-gray-700 hover:bg-green-50 hover:border-green-300 transition-colors shadow-sm"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="3" y="4" width="18" height="17" rx="2" fill="#4285F4" />
                        <rect x="3" y="4" width="18" height="5" rx="1" fill="#4285F4" />
                        <rect x="3" y="7" width="18" height="14" rx="1" fill="white" />
                        <rect x="3" y="7" width="18" height="3" fill="#4285F4" />
                        <text x="12" y="18" textAnchor="middle" fontSize="7" fill="#4285F4" fontWeight="bold">31</text>
                      </svg>
                      Add to Google Calendar
                    </a>
                    <a
                      href={appleUrl}
                      download="booking.ics"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-green-200 text-sm font-semibold text-gray-700 hover:bg-green-50 hover:border-green-300 transition-colors shadow-sm"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.78 22.05 6.8 20.68 5.96 19.47C4.25 17 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
                      </svg>
                      Add to Apple Calendar
                    </a>
                  </div>
                );
              })()}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Left Column: Service Details */}
            <div className="lg:col-span-8 space-y-12">
              {/* Banner & Gallery */}
              <div className="space-y-6">
                <div className="relative aspect-[21/9] rounded-[40px] overflow-hidden bg-gray-50 border border-gray-100 shadow-sm">
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
                      <div className={cn("w-full h-full bg-gradient-to-br flex items-center justify-center", gradient)}>
                        <span className="text-9xl opacity-20">{icon}</span>
                      </div>
                    );
                  })()}
                </div>

                {service.images && service.images.length > 1 && (
                  <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                    {service.images.map((image) => (
                      <div
                        key={image.id}
                        className="flex-shrink-0 w-32 aspect-square rounded-3xl overflow-hidden border-2 border-gray-50 hover:border-[#434c9d]/30 transition-all cursor-pointer shadow-sm active:scale-95"
                      >
                        <img src={image.url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Title & Description */}
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className={cn("text-[10px] font-black uppercase tracking-widest px-3 py-1 border-none", categoryColor)}>
                    {toTitle(service.category)}
                  </Badge>
                  {service.rating != null && (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-50 rounded-full border border-yellow-100">
                      <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs font-black text-gray-900">{Number(service.rating).toFixed(1)}</span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-[1.1]">
                    {service.title}
                  </h1>
                  <p className="text-xl text-gray-500 font-medium leading-relaxed max-w-3xl">
                    {service.description}
                  </p>
                </div>
              </div>

              {/* Provider Card */}
              <Link
                href={`/profile/${service.user_id}`}
                className="block group"
              >
                <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm transition-all hover:shadow-xl hover:border-[#434c9d]/10 flex flex-col sm:flex-row items-center gap-8">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-[32px] overflow-hidden ring-4 ring-gray-50 group-hover:ring-[#434c9d]/10 transition-all">
                      {providerAvatarUrl ? (
                        <img src={providerAvatarUrl} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#434c9d] to-[#96cbc3] flex items-center justify-center">
                          <User className="w-10 h-10 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-white p-1.5 rounded-xl shadow-lg border border-gray-50">
                      <div className="bg-[#96cbc3] p-1.5 rounded-lg text-white">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 text-center sm:text-left space-y-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Service Provided By</p>
                    <h2 className="text-2xl font-black text-gray-900 group-hover:text-[#434c9d] transition-colors">
                      {service.provider_name}
                    </h2>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-4">
                      <div className="flex items-center gap-1.5 text-sm font-bold text-gray-500">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        {Number(service.rating || 0).toFixed(1)} Rating
                      </div>
                      <div className="flex items-center gap-1.5 text-sm font-bold text-gray-500">
                        <CheckCircle className="w-4 h-4 text-[#96cbc3]" />
                        {service.total_bookings} Jobs Completed
                      </div>
                    </div>
                  </div>

                  <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center group-hover:bg-[#434c9d] group-hover:text-white transition-all">
                    <ChevronRight className="w-6 h-6" />
                  </div>
                </div>
              </Link>

              {/* Service Specs Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { label: "Location", value: service.location, icon: MapPin, color: "text-blue-600", bg: "bg-blue-50" },
                  { label: "Duration", value: (() => { const h = service.duration / 60; return h === 1 ? "1 hr" : `${h} hrs`; })(), icon: Clock, color: "text-purple-600", bg: "bg-purple-50" },
                  { label: "Pricing", value: service.pricing_model === 'quote' ? "Custom Quote" : `${formatPrice(service.price)} / hr`, icon: DollarSign, color: "text-green-600", bg: "bg-green-50" },
                  { label: "Delivery", value: service.delivery_method === 'in_person' ? 'In Person' : 'Online', icon: CheckCircle, color: "text-orange-600", bg: "bg-orange-50" }
                ].map((spec, i) => (
                  <div key={i} className="bg-gray-50/50 rounded-3xl p-6 border border-gray-100 space-y-4">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm shadow-black/5", spec.bg)}>
                      <spec.icon className={cn("w-6 h-6", spec.color)} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{spec.label}</p>
                      <p className="text-sm font-black text-gray-900">{spec.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Qualifications */}
              {(service.qualifications || service.education) && (
                <div className="space-y-8">
                  <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-xl"><Shield className="w-5 h-5 text-blue-600" /></div>
                    Background & Skills
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {service.qualifications && (
                      <div className="space-y-3">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Experience</p>
                        <div className="bg-white rounded-3xl p-6 border border-gray-100 text-gray-600 font-medium leading-relaxed italic">
                          &quot;{service.qualifications}&quot;
                        </div>
                      </div>
                    )}
                    {service.education && (
                      <div className="space-y-3">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Education</p>
                        <div className="bg-white rounded-3xl p-6 border border-gray-100 text-gray-600 font-medium leading-relaxed italic">
                          &quot;{service.education}&quot;
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Availability */}
              <div className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                    <div className="p-2 bg-purple-50 rounded-xl"><Calendar className="w-5 h-5 text-purple-600" /></div>
                    Typical Availability
                  </h3>
                  <Badge variant="outline" className="rounded-full text-gray-400 font-bold border-gray-100 uppercase text-[10px] px-4 py-1.5">Weekly Schedule</Badge>
                </div>
                <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8">
                  <ServiceAvailabilityCalendar
                    serviceId={service.id}
                    initialAvailability={service.availability as any}
                    readOnly={true}
                  />
                </div>
              </div>

              {/* Reviews */}
              <div className="space-y-8">
                <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-yellow-50 rounded-xl"><Star className="w-5 h-5 text-yellow-500 fill-yellow-500" /></div>
                  Community Feedback
                </h3>
                <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8 overflow-hidden">
                  <ReviewsList serviceId={service.id} />
                </div>
              </div>
            </div>

            {/* Right Column: Booking Card */}
            <div className="lg:col-span-4">
              <div className="sticky top-24 space-y-6">
                <div className="bg-white rounded-[40px] border border-gray-100 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.05)] overflow-hidden">
                  <div className="p-8 space-y-8">
                    {/* Price Display */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Price</p>
                      {service.pricing_model === "quote" ? (
                        <div className="space-y-1">
                          <h2 className="text-3xl font-black text-gray-900">Custom Quote</h2>
                          <p className="text-sm font-medium text-gray-500">Contact provider for pricing</p>
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-2">
                          <h2 className="text-5xl font-black text-gray-900">{formatPrice(service.price as number)}</h2>
                          <span className="text-lg font-bold text-gray-400">/hr</span>
                        </div>
                      )}
                    </div>

                    {/* Features List */}
                    <div className="space-y-4">
                      {[
                        { icon: Shield, text: "Secure booking process", color: "text-blue-500" },
                        { icon: CheckCircle, text: "Provider confirmation", color: "text-green-500" },
                        { icon: Clock, text: (() => { const h = service.duration / 60; return `approx. ${h === 1 ? "1 hr" : `${h} hrs`}`; })(), color: "text-purple-500" }
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className={cn("p-1.5 rounded-lg bg-gray-50", item.color)}>
                            <item.icon className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-bold text-gray-600">{item.text}</span>
                        </div>
                      ))}
                    </div>

                    {/* Primary Actions */}
                    <div className="space-y-3">
                      {service.pricing_model === "quote" ? (
                        <Dialog open={isQuoteDialogOpen} onOpenChange={setIsQuoteDialogOpen}>
                          <DialogTrigger asChild>
                            <Button
                              className="w-full h-16 bg-[#434c9d] hover:bg-[#434c9d]/90 text-white rounded-2xl font-black text-lg shadow-xl shadow-[#434c9d]/20 active:scale-95 transition-all"
                              disabled={service.status !== "active"}
                            >
                              Request a Quote
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-2xl border-none rounded-[40px] p-0 overflow-hidden shadow-2xl">
                            <div className="bg-white p-8 text-gray-900">
                              <DialogHeader>
                                <DialogTitle className="text-3xl font-black tracking-tight mb-2">Request Quote</DialogTitle>
                                <DialogDescription className="text-gray-500 font-medium text-base">
                                  Provide details about your project to get a custom price from {service.provider_name}.
                                </DialogDescription>
                                <p className="text-xs font-semibold text-[#434c9d] mt-3">
                                  You will be notified by email when the teen provider responds.
                                </p>
                              </DialogHeader>
                            </div>
                            <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                              {quoteRequestSuccess ? (
                                <div className="py-12 text-center space-y-6">
                                  <div className="w-20 h-20 bg-green-50 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                                    <CheckCircle className="w-10 h-10 text-green-500" />
                                  </div>
                                  <h3 className="text-2xl font-black text-gray-900">Success!</h3>
                                  <p className="text-gray-500 font-medium">Your quote request has been sent.</p>
                                  <Button onClick={() => setIsQuoteDialogOpen(false)} className="bg-[#434c9d] text-white rounded-2xl px-8 h-14 font-bold">Close</Button>
                                </div>
                              ) : (
                                <form onSubmit={handleQuoteRequest} className="space-y-8">
                                  <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                      <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Preferred Date</Label>
                                      <Input
                                        type="date"
                                        value={quoteRequestForm.requested_date}
                                        onChange={(e) => setQuoteRequestForm(p => ({ ...p, requested_date: e.target.value }))}
                                        min={new Date().toISOString().split("T")[0]}
                                        required
                                        className="h-12 bg-gray-50 border-gray-100 rounded-xl font-bold"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Preferred Time</Label>
                                      <Input
                                        type="time"
                                        value={quoteRequestForm.requested_time}
                                        onChange={(e) => setQuoteRequestForm(p => ({ ...p, requested_time: e.target.value }))}
                                        required
                                        className="h-12 bg-gray-50 border-gray-100 rounded-xl font-bold"
                                      />
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Service Location (Optional)</Label>
                                    <Input
                                      placeholder="Where will this take place?"
                                      value={quoteRequestForm.service_address}
                                      onChange={(e) => setQuoteRequestForm(p => ({ ...p, service_address: e.target.value }))}
                                      className="h-12 bg-gray-50 border-gray-100 rounded-xl font-bold"
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Project Details</Label>
                                    <Textarea
                                      placeholder="Describe what you need help with..."
                                      value={quoteRequestForm.special_instructions}
                                      onChange={(e) => setQuoteRequestForm(p => ({ ...p, special_instructions: e.target.value }))}
                                      className="min-h-[120px] bg-gray-50 border-gray-100 rounded-2xl font-medium p-4 resize-none"
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                      Reference images (optional, up to {MAX_REFERENCE_IMAGES})
                                    </Label>
                                    <div className="flex flex-wrap items-start gap-3">
                                      {selectedReferenceImages.map((item, index) => (
                                        <div key={`${item.preview}-${index}`} className="relative group">
                                          <img src={item.preview} alt="" className="w-24 h-24 rounded-2xl object-cover shadow-md" />
                                          <button
                                            type="button"
                                            onClick={() => removeReferenceImage(index)}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                            aria-label="Remove image"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </div>
                                      ))}
                                      {selectedReferenceImages.length < MAX_REFERENCE_IMAGES && (
                                        <button
                                          type="button"
                                          onClick={() => fileInputRef.current?.click()}
                                          className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-[#434c9d] hover:text-[#434c9d] transition-all shrink-0"
                                        >
                                          <ImageIcon className="w-6 h-6 mb-1" />
                                          <span className="text-[8px] font-black uppercase text-center px-1">Add photos</span>
                                        </button>
                                      )}
                                      <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={handleReferenceImagesSelect}
                                      />
                                    </div>
                                    <p className="text-xs text-gray-400 font-medium">PNG, JPG, or WebP · max 5MB each</p>
                                  </div>

                                  <div className="flex gap-4 pt-4">
                                    <Button type="button" variant="ghost" onClick={() => setIsQuoteDialogOpen(false)} className="flex-1 h-14 rounded-2xl font-bold">Cancel</Button>
                                    <Button type="submit" disabled={quoteRequestLoading || uploadingImage} className="flex-1 h-14 bg-[#434c9d] text-white rounded-2xl font-bold shadow-lg shadow-[#434c9d]/20">
                                      {quoteRequestLoading || uploadingImage ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                      ) : (
                                        "Send Request"
                                      )}
                                    </Button>
                                  </div>
                                </form>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
                          <DialogTrigger asChild>
                            <Button
                              className="w-full h-16 bg-[#434c9d] hover:bg-[#434c9d]/90 text-white rounded-2xl font-black text-lg shadow-xl shadow-[#434c9d]/20 active:scale-95 transition-all"
                              disabled={service.status !== "active"}
                            >
                              Request Booking
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md border-none rounded-[40px] p-0 overflow-hidden shadow-2xl">
                            <div className="bg-white p-8 text-gray-900">
                              <DialogHeader>
                                <DialogTitle className="text-3xl font-black tracking-tight mb-2">Request Service</DialogTitle>
                                <DialogDescription className="text-gray-500 font-medium text-base">
                                  Book {service.title} with {service.provider_name}.
                                </DialogDescription>
                                <p className="text-xs font-semibold text-[#434c9d] mt-3">
                                  You will be notified by email when the teen provider responds.
                                </p>
                              </DialogHeader>
                            </div>
                            <div className="p-8">
                              <form onSubmit={handleBookingSubmit} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Date</Label>
                                    <Input
                                      type="date"
                                      value={bookingForm.requested_date}
                                      onChange={(e) => setBookingForm(p => ({ ...p, requested_date: e.target.value }))}
                                      min={new Date().toISOString().split("T")[0]}
                                      required
                                      className="h-12 bg-gray-50 border-gray-100 rounded-xl font-bold"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Time</Label>
                                    <Input
                                      type="time"
                                      value={bookingForm.requested_time}
                                      onChange={(e) => setBookingForm(p => ({ ...p, requested_time: e.target.value }))}
                                      required
                                      className="h-12 bg-gray-50 border-gray-100 rounded-xl font-bold"
                                    />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Address</Label>
                                  <Input
                                    placeholder="Where should they go?"
                                    value={bookingForm.service_address}
                                    onChange={(e) => setBookingForm(p => ({ ...p, service_address: e.target.value }))}
                                    className="h-12 bg-gray-50 border-gray-100 rounded-xl font-bold"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Notes</Label>
                                  <Textarea
                                    placeholder="Any specific instructions..."
                                    value={bookingForm.special_instructions}
                                    onChange={(e) => setBookingForm(p => ({ ...p, special_instructions: e.target.value }))}
                                    className="bg-gray-50 border-gray-100 rounded-2xl p-4 resize-none"
                                  />
                                </div>
                                <div className="flex gap-4 pt-4">
                                  <Button type="button" variant="ghost" onClick={() => setIsBookingDialogOpen(false)} className="flex-1 h-14 rounded-2xl font-bold">Cancel</Button>
                                  <Button type="submit" disabled={bookingLoading} className="flex-1 h-14 bg-[#434c9d] text-white rounded-2xl font-bold shadow-lg shadow-[#434c9d]/20">
                                    {bookingLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm"}
                                  </Button>
                                </div>
                              </form>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>

                  {/* Guaranteed Badge - hidden for now */}
                  {false && (
                    <div className="bg-gray-50 p-6 flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                        <Sparkles className="w-5 h-5 text-[#96cbc3]" />
                      </div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">TeenOp Verified Quality</p>
                    </div>
                  )}
                </div>

                {/* Safety Info */}
                <div className="bg-[#fafafa] rounded-[32px] p-6 border border-gray-100">
                  <div className="flex items-center gap-2 mb-4 text-[#434c9d]">
                    <Info className="w-4 h-4" />
                    <span className="text-xs font-black uppercase tracking-wider">Booking Guide</span>
                  </div>
                  <div className="space-y-3 text-xs font-bold text-gray-500">
                    <p>1. Send your request with details.</p>
                    <p>2. Provider accepts or suggests a time.</p>
                    <p>3. Pay securely after the teen accepts your request.</p>
                    <p>4. Rate your experience after job.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

