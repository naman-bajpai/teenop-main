"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MapPin, Clock, Star, ArrowLeft, User, MessageCircle, Shield, CheckCircle, AlertCircle } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [serviceId]);

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
         duration, education, qualifications, address, pricing_model, banner_url,
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

     if (serviceData.user_id) {
       const { data: prof, error: profErr } = await supabase
         .from("profiles")
         .select("first_name, last_name, rating")
         .eq("id", serviceData.user_id)
         .maybeSingle();

       if (!profErr && prof) {
         const profileData = prof as any;
         provider_name = [profileData.first_name, profileData.last_name].filter(Boolean).join(" ").trim() || null;
         provider_rating = profileData.rating ?? null;
       }
     }

     // 3) normalize for UI (schema default is duration=30, pricing_model='per_job')
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
     };

     setService(normalizedServiceData);
     setBookingForm((prev) => ({ ...prev, service_id: id }));
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
              <div className={`relative h-64 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
                <div className="relative text-9xl opacity-30">{icon}</div>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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

                {(service.qualifications || service.education) && (
                  <div className="border-t border-gray-100 pt-6">
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
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-8">
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-gray-900 mb-1">{formatPrice(service.price as number)}</div>
                <div className="text-sm text-gray-500">
                  per {service.pricing_model === "per_hour" ? "hour" : "service"}
                </div>
              </div>

              <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 py-3 text-lg font-semibold"
                    disabled={service.status !== "active"}
                  >
                    {service.status === "active" ? "Request Service" : "Service Unavailable"}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Request Service</DialogTitle>
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
                      <Button type="submit" disabled={bookingLoading} className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                        {bookingLoading ? "Sending..." : "Send Request"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

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
