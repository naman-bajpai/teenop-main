"use client";
import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; 
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast"; 
import { cn } from "@/lib/utils";
import MultiImageUpload, { ServiceImage } from "@/components/ui/multi-image-upload";
import { RatingDisplay, RatingForm } from "@/components/ui/rating";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Star,
  DollarSign,
  Calendar,
  MapPin,
  Clock,
  TrendingUp,
  Users,
  MessageCircle,
  CheckCircle,
  Wallet,
  FileText,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
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
  availability?: string | null;
  images?: ServiceImage[];
};

export type Booking = {
  id: string;
  service_id: string;
  status: string;
  requested_date: string;
  requested_time: string;
  alternative_date?: string | null;
  alternative_time?: string | null;
  service_address?: string | null;
  duration: number;
  total_price: number;
  special_instructions: string;
  created_at: string;
  updated_at: string;
  service: {
    id: string;
    title: string;
    pricing_model: string;
    location: string;
    category: string;
  };
  customer_name?: string;
};


const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800";
    case "paused":
      return "bg-yellow-100 text-yellow-800";
    case "pending":
      return "bg-gray-100 text-gray-800";
    case "confirmed":
      return "bg-green-100 text-green-800";
    case "completed":
      return "bg-gray-100 text-gray-800";
    case "paid":
      return "bg-blue-100 text-blue-800";
    case "rejected":
      return "bg-red-100 text-red-800";
    case "cancelled":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

function ServiceCard({ service, onEdit, onDelete }: { service: Service; onEdit: (service: Service) => void; onDelete: (serviceId: string) => void }) {
  return (
    <div className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-[#434c9d] hover:shadow-xl transition-all transform hover:-translate-y-1">
      <div className="flex gap-4">
        {service.banner_url ? (
          <img
            src={service.banner_url}
            alt={service.title}
            className="w-36 h-24 object-cover rounded-xl border-2 border-gray-200 shadow-md"
          />
        ) : (
          <div className="w-36 h-24 rounded-xl border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center shadow-md">
            <Star className="w-8 h-8 text-gray-400" />
          </div>
        )}
        <div className="flex-1">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 mb-2">{service.title}</h3>
              <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">{service.description}</p>
            </div>
            <Badge className={`${getStatusColor(service.status)} text-xs font-semibold px-3 py-1`}>
              {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              {service.pricing_model === 'quote' ? (
                <span className="font-bold text-gray-900">Quote Based</span>
              ) : (
                <>
              <span className="font-bold text-gray-900">${service.price}</span>
              <span className="text-xs text-gray-500">/{service.pricing_model === 'per_hour' ? 'hr' : 'job'}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span className="truncate">{service.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-600" />
              <span>{service.duration || 60} min</span>
            </div>
            <div className="flex items-center gap-2">
              <RatingDisplay rating={service.rating || 0} size="sm" showCount={false} />
              <span className="text-xs">{service.rating ? `${service.rating}/5` : "No ratings"}</span>
            </div>
            <div className="flex items-center gap-2 col-span-2">
              <Users className="w-4 h-4 text-indigo-600" />
              <span className="font-semibold">{service.total_bookings} {service.total_bookings === 1 ? 'booking' : 'bookings'}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="border-gray-300 hover:border-[#434c9d] hover:text-[#434c9d]"
              onClick={() => window.location.href = `/services/${service.id}`}
            >
              <Eye className="w-4 h-4 mr-1" />View
            </Button>
            <Button variant="outline" size="sm" onClick={() => onEdit(service)} className="border-gray-300 hover:border-blue-500 hover:text-blue-600">
              <Edit className="w-4 h-4 mr-1" />Edit
            </Button>
            <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:border-red-400 hover:bg-red-50" onClick={() => onDelete(service.id)}>
              <Trash2 className="w-4 h-4 mr-1" />Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BookingCard({ booking, onStatusUpdate }: { 
  booking: Booking; 
  onStatusUpdate: (bookingId: string, status: string, alternativeDate?: string, alternativeTime?: string) => Promise<void>;
}) {
  const [showAlternativeDialog, setShowAlternativeDialog] = useState(false);
  const [alternativeDate, setAlternativeDate] = useState("");
  const [alternativeTime, setAlternativeTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const formatTime = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return timeString;
    }
  };

  const handleAccept = async () => {
    await onStatusUpdate(booking.id, "confirmed");
  };

  const handleDecline = () => {
    setShowAlternativeDialog(true);
  };

  const handleProposeAlternative = async () => {
    if (!alternativeDate || !alternativeTime) {
      toast({
        title: "Missing Information",
        description: "Please provide both an alternative date and time.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onStatusUpdate(booking.id, "alternative_proposed", alternativeDate, alternativeTime);
      setShowAlternativeDialog(false);
      setAlternativeDate("");
      setAlternativeTime("");
      toast({
        title: "Alternative Time Proposed",
        description: "The customer has been notified of your proposed alternative time.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to propose alternative time. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectWithoutAlternative = async () => {
    setIsSubmitting(true);
    try {
    await onStatusUpdate(booking.id, "rejected");
      setShowAlternativeDialog(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewDetails = () => {
    window.location.href = `/booking/${booking.id}`;
  };


  return (
    <div className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-[#434c9d] hover:shadow-xl transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900 mb-2">{booking.service.title}</h3>
          <p className="text-sm text-gray-600 flex items-center gap-2">
            <Users className="w-4 h-4" />
            {booking.customer_name ? `Requested by ${booking.customer_name}` : 'Customer request'}
          </p>
        </div>
        <Badge className={`${getStatusColor(booking.status)} text-xs font-semibold px-3 py-1`}>
          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
        </Badge>
      </div>
      {booking.special_instructions && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg mb-4">
          <p className="text-sm text-gray-700 font-medium">{booking.special_instructions}</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 mb-4 bg-gray-50 p-4 rounded-xl">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-5 h-5 text-blue-600" />
          <div>
            <p className="font-semibold text-gray-900">{new Date(booking.requested_date).toLocaleDateString()}</p>
            <p className="text-xs text-gray-600">{formatTime(booking.requested_time)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <DollarSign className="w-5 h-5 text-green-600" />
          <div>
            <p className="font-bold text-gray-900 text-lg">${booking.total_price}</p>
            <p className="text-xs text-gray-600">Total price</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-5 h-5 text-purple-600" />
          <div>
            <p className="font-semibold text-gray-900">{booking.duration} min</p>
            <p className="text-xs text-gray-600">Duration</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="w-5 h-5 text-red-600" />
          <div>
            <p className="font-semibold text-gray-900 truncate">{booking.service.location}</p>
            <p className="text-xs text-gray-600">Service Location</p>
          </div>
        </div>
      </div>
      {booking.service_address && (
        <div className="mb-4 p-3 bg-purple-50 border-l-4 border-purple-400 rounded-r-lg">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-purple-600 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-purple-900 mb-1">Client Address:</p>
              <p className="text-sm text-purple-800">{booking.service_address}</p>
            </div>
          </div>
        </div>
      )}
      <div className="flex gap-2">
        {booking.status === "pending" && (
          <>
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6" onClick={handleAccept}>
              ✓ Accept
            </Button>
            <Button variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50 font-semibold px-6" onClick={handleDecline}>
              ✕ Decline
            </Button>
          </>
        )}
        
        {/* Alternative Time Proposal Dialog */}
        <Dialog open={showAlternativeDialog} onOpenChange={setShowAlternativeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Propose Alternative Time</DialogTitle>
              <DialogDescription>
                The requested time doesn't work for you. Propose an alternative date and time, or reject the request.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="alt-date">Alternative Date</Label>
                <Input
                  id="alt-date"
                  type="date"
                  value={alternativeDate}
                  onChange={(e) => setAlternativeDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="alt-time">Alternative Time</Label>
                <Input
                  id="alt-time"
                  type="time"
                  value={alternativeTime}
                  onChange={(e) => setAlternativeTime(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleProposeAlternative}
                  disabled={isSubmitting || !alternativeDate || !alternativeTime}
                  className="flex-1 bg-[#434c9d] hover:bg-[#434c9d]/90"
                >
                  {isSubmitting ? "Proposing..." : "Propose Alternative Time"}
                </Button>
                <Button
                  onClick={handleRejectWithoutAlternative}
                  disabled={isSubmitting}
                  variant="outline"
                  className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                >
                  {isSubmitting ? "Rejecting..." : "Reject Without Alternative"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        {booking.status === "confirmed" && (
          <Button variant="outline" size="sm" onClick={handleViewDetails} className="border-[#434c9d] text-[#434c9d] hover:bg-[#434c9d] hover:text-white">
            <MessageCircle className="w-4 h-4 mr-1" />View Details
          </Button>
        )}
        {booking.status === "paid" && (
          <Button variant="outline" size="sm" onClick={handleViewDetails} className="border-[#434c9d] text-[#434c9d] hover:bg-[#434c9d] hover:text-white">
            <MessageCircle className="w-4 h-4 mr-1" />View Details
          </Button>
        )}
        {booking.status === "completed" && (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.location.href = "/earnings"} 
              className="border-[#434c9d] text-[#434c9d] hover:bg-[#434c9d] hover:text-white"
            >
              <DollarSign className="w-4 h-4 mr-1" />Withdraw Earning
            </Button>
          <Button variant="outline" size="sm" onClick={handleViewDetails} className="border-green-500 text-green-600 hover:bg-green-50">
            <CheckCircle className="w-4 h-4 mr-1" />View Details
          </Button>
          </div>
        )}
        {booking.status === "rejected" && (
          <Button variant="outline" size="sm" onClick={handleViewDetails} className="border-gray-300 text-gray-600 hover:bg-gray-50">
            View Details
          </Button>
        )}
      </div>
    </div>
  );
}

export default function TeenHustlePage() {
  const { user, loading: userLoading, error: userError } = useUser();
  const supabase = useMemo(() => createClient(), []);
  const { toast } = useToast();
  const router = useRouter();

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [earningsStats, setEarningsStats] = useState({
    totalEarned: 0,
    thisWeekEarned: 0,
    thisMonthEarned: 0,
    pendingEarnings: 0
  });
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
  const [pendingQuoteRequestsCount, setPendingQuoteRequestsCount] = useState(0);
  const [availability, setAvailability] = useState<string>("");


  // Handle URL parameters for Stripe Connect callbacks
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const stripeSuccess = urlParams.get('stripe_success');
    const stripeError = urlParams.get('stripe_error');
    
    if (stripeSuccess === 'true') {
      toast({
        title: "Payment account connected!",
        description: "Your Stripe Connect account has been successfully set up.",
      });
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (stripeError) {
      toast({
        title: "Payment setup failed",
        description: `There was an error setting up your payment account: ${stripeError}`,
        variant: "destructive"
      });
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        
        // Fetch services via API
        const servicesRes = await fetch("/api/services", { cache: "no-store" });
        if (!servicesRes.ok) throw new Error("Failed to load services");
        const servicesData = await servicesRes.json();
        setServices(servicesData.services ?? []);

        // Fetch bookings via API
        const bookingsRes = await fetch("/api/bookings", { cache: "no-store" });
        if (!bookingsRes.ok) throw new Error("Failed to load bookings");
        const bookingsData = await bookingsRes.json();
        
        if (bookingsData.success) {
          // This will be handled by the separate useEffect for bookings
        } else {
          // Reset all booking states if fetch failed
          setPendingBookings([]);
          setScheduledBookings([]);
          setCompletedBookings([]);
          setCancelledBookings([]);
        }

        // Fetch earnings stats
        const earningsRes = await fetch("/api/earnings", { cache: "no-store" });
        if (earningsRes.ok) {
          const earningsData = await earningsRes.json();
          if (earningsData.success) {
            setEarningsStats(earningsData.stats);
          }
        }

        // Fetch pending quote requests count
        const quoteRequestsRes = await fetch("/api/quotes/request?role=provider&status=pending", { cache: "no-store" });
        if (quoteRequestsRes.ok) {
          const quoteRequestsData = await quoteRequestsRes.json();
          if (quoteRequestsData.success) {
            setPendingQuoteRequestsCount(quoteRequestsData.quote_requests?.length || 0);
          }
        }

        // Fetch Stripe Connect account status
        const stripeRes = await fetch("/api/stripe/connect/setup", { cache: "no-store" });
        if (stripeRes.ok) {
          const stripeData = await stripeRes.json();
          if (stripeData.success) {
            setStripeAccountStatus({
              hasAccount: stripeData.hasAccount,
              accountStatus: stripeData.accountStatus,
              loading: false
            });
          }
        } else {
          setStripeAccountStatus(prev => ({ ...prev, loading: false }));
        }
      } catch (e: any) {
        toast({ title: "Load failed", description: e.message, variant: "destructive" });
        setPendingBookings([]);
        setScheduledBookings([]);
        setCompletedBookings([]);
        setCancelledBookings([]);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [toast]);

  const activeServices = services.filter((s) => s.status === "active");
  const pausedServices = services.filter((s) => s.status === "paused");
  
  // Separate bookings by type
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [scheduledBookings, setScheduledBookings] = useState<Booking[]>([]);
  const [completedBookings, setCompletedBookings] = useState<Booking[]>([]);
  const [cancelledBookings, setCancelledBookings] = useState<Booking[]>([]);
  const [quoteRequests, setQuoteRequests] = useState<any[]>([]);
  
  // Helper function to check if booking is expired
  const isBookingExpired = (booking: Booking): boolean => {
    try {
      const bookingDateTime = new Date(`${booking.requested_date}T${booking.requested_time}`);
      const now = new Date();
      return bookingDateTime < now;
    } catch {
      return false;
    }
  };
  
  // Update booking arrays when bookings change
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const bookingsRes = await fetch("/api/bookings", { cache: "no-store" });
        if (bookingsRes.ok) {
          const bookingsData = await bookingsRes.json();
          if (bookingsData.success) {
            // For My Teen Hustle page, only show incoming bookings (where user is provider)
            const allIncoming = bookingsData.incoming || [];
            
            // Filter out expired bookings (only for pending/confirmed/alternative_proposed)
            const activeIncoming = allIncoming.filter((booking: Booking) => {
              if (booking.status === "pending" || booking.status === "confirmed" || booking.status === "alternative_proposed") {
                return !isBookingExpired(booking);
              }
              return true; // Keep paid, completed, cancelled, rejected regardless of date
            });
            
            // Pending: pending, confirmed, alternative_proposed (not expired)
            const pending = activeIncoming.filter((booking: Booking) => 
              booking.status === "pending" || 
              booking.status === "confirmed" || 
              booking.status === "alternative_proposed"
            );
            setPendingBookings(pending);
            
            // Scheduled: paid bookings
            const scheduled = allIncoming.filter((booking: Booking) => booking.status === "paid");
            setScheduledBookings(scheduled);
            
            // Completed: completed bookings
            const completed = allIncoming.filter((booking: Booking) => booking.status === "completed");
            setCompletedBookings(completed);
            
            // Cancelled: cancelled or rejected
            const cancelled = allIncoming.filter((booking: Booking) => 
              booking.status === "cancelled" || booking.status === "rejected"
            );
            setCancelledBookings(cancelled);
          }
        }
      } catch (e) {
        console.error("Failed to fetch bookings:", e);
      }
    };
    
    if (user) {
      fetchBookings();
    }
  }, [user]);

  // Show loading state while user data is being fetched
  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error state if no user data
  if (!userLoading && (!user || userError)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">
            {userError === 'Profile not found. Please complete your profile setup.' 
              ? 'Please complete your profile setup to continue.'
              : 'Unable to load user data. Please try logging in again.'}
          </p>
          <Button 
            onClick={() => window.location.href = userError === 'Profile not found. Please complete your profile setup.' ? '/profile' : '/login'} 
            className="mt-4"
          >
            {userError === 'Profile not found. Please complete your profile setup.' ? 'Complete Profile' : 'Go to Login'}
          </Button>
        </div>
      </div>
    );
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
    setAvailability("");
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
    setDuration((service.duration || 60) / 60); // Convert minutes to hours
    setEducation(service.education || "");
    setQualifications(service.qualifications || "");
    setAddress(service.address || "");
    setPricingModel(service.pricing_model === "quote" ? "per_hour" : (service.pricing_model || "per_hour"));
    setIsQuoteBased(service.pricing_model === "quote");
    setDeliveryMethod((service.delivery_method as "in_person" | "online") || "in_person");
    setLocationType((service.location_type as "public_address" | "client_location") || "public_address");
    setBannerUrl(service.banner_url);
    setServiceImages(service.images || []);
    setAvailability(service.availability || "");
    setOpen(true);
  };

  async function handleCreateService() {
    try {
      const userRes = await supabase.auth.getUser();
      const user = userRes.data.user;
      if (!user) throw new Error("You must be signed in to create a service.");

      // Check if payments are connected (only for new services, not edits)
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
            duration: Number(duration) * 60, // Convert hours to minutes
            education: education.trim() || null,
            qualifications: qualifications.trim() || null,
            address: address.trim() || null,
            pricing_model: isQuoteBased ? "quote" : pricingModel,
            delivery_method: deliveryMethod,
            location_type: locationType,
            banner_url: bannerUrl
          }
        : { 
            title, 
            description, 
            price: Number(price), 
            location, 
            category, 
            status,
            duration: Number(duration) * 60, // Convert hours to minutes
            education: education.trim() || null,
            qualifications: qualifications.trim() || null,
            address: address.trim() || null,
            pricing_model: isQuoteBased ? "quote" : pricingModel,
            delivery_method: deliveryMethod,
            location_type: locationType,
            banner_url: bannerUrl,
            availability: availability.trim() || null
          };

      // Persist service via API (server validates & RLS protects)
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
      
      // Upload images if there are any (for new services or when images were added)
      if (serviceImages.length > 0) {
        try {
          // Filter out images that already have IDs (already uploaded)
          const imagesToUpload = serviceImages.filter(img => !img.id);
          
          if (imagesToUpload.length > 0) {
            // Convert blob URLs to files if needed
            const formData = new FormData();
            formData.append('service_id', service.id);
            
            for (const image of imagesToUpload) {
              if (image.url.startsWith('blob:')) {
                // Fetch blob and convert to file
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
            // All images already uploaded, just use existing
            service.images = serviceImages;
          }
        } catch (imgError: any) {
          console.error('Error uploading images:', imgError);
          // Don't fail the whole operation if image upload fails
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

  async function handleBookingStatusUpdate(bookingId: string, newStatus: string, alternativeDate?: string, alternativeTime?: string) {
    try {
      const body: any = { status: newStatus };
      if (alternativeDate && alternativeTime) {
        body.alternative_date = alternativeDate;
        body.alternative_time = alternativeTime;
      }

      console.log("Sending booking update request:", { bookingId, newStatus, alternativeDate, alternativeTime, body });

      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || "Failed to update booking");
      }

      const data = await res.json();
      console.log("Booking update response:", data);
      
      if (data.success) {
        // Refetch bookings to update all tabs
        const bookingsRes = await fetch("/api/bookings", { cache: "no-store" });
        if (bookingsRes.ok) {
          const bookingsData = await bookingsRes.json();
          if (bookingsData.success) {
            const allIncoming = bookingsData.incoming || [];
            
            console.log("Refetched bookings - alternative_proposed:", 
              allIncoming.filter((b: Booking) => b.status === "alternative_proposed")
            );
            
            const pending = allIncoming.filter((booking: Booking) => 
              booking.status === "pending" || 
              booking.status === "confirmed" || 
              booking.status === "alternative_proposed"
            );
            setPendingBookings(pending);
            
            const scheduled = allIncoming.filter((booking: Booking) => booking.status === "paid");
            setScheduledBookings(scheduled);
            
            const completed = allIncoming.filter((booking: Booking) => booking.status === "completed");
            setCompletedBookings(completed);
            
            const cancelled = allIncoming.filter((booking: Booking) => 
              booking.status === "cancelled" || booking.status === "rejected"
            );
            setCancelledBookings(cancelled);
          }
        }
        
        toast({ 
          title: "Booking updated", 
          description: `Booking ${newStatus} successfully.` 
        });
      }
    } catch (e: any) {
      toast({ 
        title: "Could not update booking", 
        description: e.message, 
        variant: "destructive" 
      });
    }
  }

  async function handleWithdrawMoney() {
    try {
      const res = await fetch("/api/earnings/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || "Failed to process withdrawal");
      }

      const data = await res.json();
      if (data.success) {
        toast({ 
          title: "Withdrawal successful", 
          description: data.message || `$${data.amount} has been transferred to your account.` 
        });
        
        // Refresh earnings stats
        const earningsRes = await fetch("/api/earnings", { cache: "no-store" });
        if (earningsRes.ok) {
          const earningsData = await earningsRes.json();
          if (earningsData.success) {
            setEarningsStats(earningsData.stats);
          }
        }
      }
    } catch (e: any) {
      toast({ 
        title: "Could not withdraw money", 
        description: e.message, 
        variant: "destructive" 
      });
    }
  }

  async function handleStripeConnectSetup() {
    try {
      const res = await fetch("/api/stripe/connect/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      // Get response text first to handle empty or malformed JSON
      const responseText = await res.text();
      console.log("Stripe Connect setup response:", {
        status: res.status,
        statusText: res.statusText,
        responseText: responseText.substring(0, 500)
      });

      if (!res.ok) {
        let err: any = {};
        try {
          err = JSON.parse(responseText);
        } catch (parseError) {
          // If JSON parsing fails, create a meaningful error
          err = {
            error: `Server returned ${res.status}: ${res.statusText}`,
            responseText: responseText || "Empty response"
          };
        }
        
        console.error("Stripe Connect setup error:", err);
        
        // Build detailed error message
        let errorMessage = err.error || "Failed to create payment account";
        
        // If there are details/instructions, include them
        if (err.details) {
          if (err.details.instructions && Array.isArray(err.details.instructions)) {
            errorMessage += "\n\n" + err.details.instructions.join("\n");
          }
          if (err.details.currentUrl) {
            errorMessage += `\n\nCurrent URL: ${err.details.currentUrl}`;
          }
          if (err.details.originalUrl) {
            errorMessage += `\nOriginal URL: ${err.details.originalUrl}`;
          }
        }
        
        // If account already exists, show different message
        if (err.error === "Stripe Connect account already exists" && err.accountId) {
          errorMessage = `You already have a Stripe Connect account linked. Account ID: ${err.accountId}`;
        }
        
        // If there are debug instructions, include them
        if (err.debug && err.debug.instructions) {
          errorMessage += "\n\n" + err.debug.instructions.join("\n");
        }
        
        throw new Error(errorMessage);
      }

      const data = JSON.parse(responseText);
      if (data.success && data.authUrl) {
        // Redirect to Stripe OAuth
        window.location.href = data.authUrl;
      } else {
        throw new Error(data.error || "Failed to get authorization URL");
      }
    } catch (e: any) {
      console.error("Stripe Connect setup exception:", e);
      toast({ 
        title: "Could not set up payment account", 
        description: e.message || "An unexpected error occurred",
        variant: "destructive",
        duration: 10000, // Show for 10 seconds to read longer messages
      });
    }
  }

  async function handleStripeConnectLogin() {
    try {
      const res = await fetch("/api/stripe/connect/setup", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.accountStatus?.loginUrl) {
          window.location.href = data.accountStatus.loginUrl;
        }
      }
    } catch (e: any) {
      toast({ 
        title: "Could not access payment account", 
        description: e.message, 
        variant: "destructive" 
      });
    }
  }


  return (
    <DashboardLayout user={user}>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-[#434c9d] to-[#96cbc3] bg-clip-text text-transparent mb-3">
                My Teen Hustle
              </h1>
              <p className="text-gray-600 text-lg">Manage your services, bookings, and earnings</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <Link href="/provider/quote-requests">
                <Button variant="outline" className="border-[#434c9d] text-[#434c9d] hover:bg-[#434c9d] hover:text-white relative">
                  <FileText className="w-4 h-4 mr-2" />
                  Quote Requests
                  {pendingQuoteRequestsCount > 0 && (
                    <Badge className="ml-2 bg-[#434c9d] text-white">{pendingQuoteRequestsCount}</Badge>
                  )}
                </Button>
              </Link>
              <Dialog open={open} onOpenChange={(newOpen) => {
                  // Prevent opening dialog if payments aren't connected (only for new services)
                  if (newOpen && !editingService && !stripeAccountStatus.loading && !stripeAccountStatus.hasAccount) {
                    toast({
                      title: "Payment Account Required",
                      description: "You must connect your payment account before adding a service. Please set up payments first.",
                      variant: "destructive",
                    });
                    return;
                  }
                  setOpen(newOpen);
                }}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-[#434c9d] text-white hover:bg-[#434c9d]/90"
                    disabled={!stripeAccountStatus.loading && !stripeAccountStatus.hasAccount}
                    title={!stripeAccountStatus.loading && !stripeAccountStatus.hasAccount ? "Please connect your payment account first" : ""}
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add New Service
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-5xl max-h-[90vh] overflow-y-auto mx-auto p-8">
                <DialogHeader className="text-center pb-6">
                  <DialogTitle className="text-2xl font-bold text-gray-800">{editingService ? 'Edit Service' : 'Add a Service'}</DialogTitle>
                  <DialogDescription className="text-sm text-gray-600 mt-2">
                    Fill in the details below to {editingService ? 'update your service' : 'create your new service'}
                  </DialogDescription>
                </DialogHeader>
                
                {!editingService && !stripeAccountStatus.loading && !stripeAccountStatus.hasAccount && (
                  <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Wallet className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-yellow-800 mb-1">
                          Payment Account Required
                        </p>
                        <p className="text-sm text-yellow-700 mb-3">
                          You must connect your payment account before adding a service. This allows you to receive payments from clients.
                        </p>
                        <Button
                          onClick={handleStripeConnectSetup}
                          size="sm"
                          className="bg-yellow-600 hover:bg-yellow-700 text-white"
                        >
                          <Wallet className="w-4 h-4 mr-2" />
                          Set Up Payments
                        </Button>
                      </div>
                    </div>
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
                      <Label htmlFor="availability" className="text-sm font-medium">Service Availability (Optional)</Label>
                      <Textarea 
                        id="availability" 
                        value={availability || ""} 
                        onChange={(e) => setAvailability(e.target.value)} 
                        placeholder="e.g., Weekdays 3-6 PM, Weekends 10 AM-2 PM" 
                        rows={3}
                        className="w-full resize-none"
                      />
                      <p className="text-xs text-gray-500">
                        Select the times you're typically available to provide this service. Customers will see your availability, send a booking request, and you can confirm it or suggest an alternative time if needed.
                      </p>
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
          </div>
        </div>

        {/* Earnings Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link href="/earnings" className="group">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border-2 border-green-200 hover:border-green-400 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-md">
                  <TrendingUp className="w-7 h-7 text-white" />
                </div>
                <div className="text-green-600 group-hover:translate-x-1 transition-transform">
                  →
                </div>
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">This Week</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                ${earningsStats.thisWeekEarned.toFixed(2)}
              </p>
            </div>
          </Link>
          <Link href="/earnings" className="group">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border-2 border-blue-200 hover:border-blue-400 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center shadow-md">
                  <Calendar className="w-7 h-7 text-white" />
                </div>
                <div className="text-blue-600 group-hover:translate-x-1 transition-transform">
                  →
                </div>
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">This Month</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                ${earningsStats.thisMonthEarned.toFixed(2)}
              </p>
            </div>
          </Link>
          <Link href="/earnings" className="group">
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-2xl border-2 border-purple-200 hover:border-purple-400 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center shadow-md">
                  <DollarSign className="w-7 h-7 text-white" />
                </div>
                <div className="text-purple-600 group-hover:translate-x-1 transition-transform">
                  →
                </div>
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Earned</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                ${earningsStats.totalEarned.toFixed(2)}
              </p>
            </div>
          </Link>
          <Link href="/earnings" className="group">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-2xl border-2 border-amber-200 hover:border-amber-400 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-md">
                  <Clock className="w-7 h-7 text-white" />
                </div>
                <div className="text-amber-600 group-hover:translate-x-1 transition-transform">
                  →
                </div>
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">Pending</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                ${earningsStats.pendingEarnings.toFixed(2)}
              </p>
            </div>
          </Link>
        </div>

        {/* Payment Setup Section */}
        {!stripeAccountStatus.loading && (
          <div className="mb-8">
            {!stripeAccountStatus.hasAccount ? (
              <div className="bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 p-8 rounded-2xl shadow-xl text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border-2 border-white/30">
                      <Wallet className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold mb-2">Set Up Payments</h3>
                      <p className="text-blue-100 text-lg">Connect your bank account to receive payments for your services</p>
                    </div>
                  </div>
                  <Button 
                    onClick={handleStripeConnectSetup}
                    className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                  >
                    <Wallet className="w-5 h-5 mr-2" />
                    Set Up Payments
                  </Button>
                </div>
              </div>
            ) : !stripeAccountStatus.accountStatus?.chargesEnabled ? (
              <div className="bg-gradient-to-br from-yellow-400 via-orange-400 to-amber-500 p-8 rounded-2xl shadow-xl text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border-2 border-white/30">
                      <Clock className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold mb-2">Complete Payment Setup</h3>
                      <p className="text-yellow-100 text-lg">Your payment account is being verified. Complete the setup to receive payments.</p>
                    </div>
                  </div>
                  <Button 
                    onClick={handleStripeConnectLogin}
                    className="bg-white text-orange-600 hover:bg-orange-50 px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                  >
                    <Clock className="w-5 h-5 mr-2" />
                    Complete Setup
                  </Button>
                </div>
              </div>
            ) : earningsStats.pendingEarnings > 0 ? (
              <div className="bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 p-8 rounded-2xl shadow-xl text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border-2 border-white/30">
                      <Wallet className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold mb-2">Ready to Withdraw</h3>
                      <p className="text-green-100 text-lg">You have <span className="font-bold text-2xl">${earningsStats.pendingEarnings.toFixed(2)}</span> available for withdrawal</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Link href="/earnings">
                      <Button 
                        variant="outline"
                        className="bg-white/20 backdrop-blur-sm border-2 border-white/30 text-white hover:bg-white/30 px-6 py-3 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                      >
                        <Wallet className="w-5 h-5 mr-2" />
                        Manage Account
                      </Button>
                    </Link>
                    <Button 
                      onClick={handleWithdrawMoney}
                      className="bg-white text-green-600 hover:bg-green-50 px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                    >
                      <Wallet className="w-5 h-5 mr-2" />
                      Withdraw Money
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-slate-100 via-gray-100 to-slate-200 p-8 rounded-2xl border-2 border-gray-300 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-500 rounded-2xl flex items-center justify-center shadow-inner">
                      <Wallet className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">Payment Account Ready</h3>
                      <p className="text-gray-600 text-lg">Your payment account is set up. Complete jobs to start earning!</p>
                    </div>
                  </div>
                  <Link href="/earnings">
                    <Button 
                      variant="outline"
                      className="bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-3 text-base font-semibold shadow-md hover:shadow-lg transition-all"
                    >
                      <Wallet className="w-5 h-5 mr-2" />
                      Manage Account
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* My Services Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">My Services</h2>
              <p className="text-sm text-gray-600 mt-1">Manage your service offerings</p>
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {services.map((s) => <ServiceCard key={s.id} service={s} onEdit={openEditDialog} onDelete={handleDeleteService} />)}  
                </div>
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

        {/* Tabs */}
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-gray-100 p-1 rounded-xl">
            <TabsTrigger value="pending" className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg font-semibold text-xs sm:text-sm">
              Pending Requests ({pendingBookings.length + quoteRequests.length})
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg font-semibold text-xs sm:text-sm">
              Scheduled Services ({scheduledBookings.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg font-semibold text-xs sm:text-sm">
              Completed Services ({completedBookings.length})
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg font-semibold text-xs sm:text-sm">
              Cancelled Services ({cancelledBookings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Pending Requests</h2>
                <p className="text-sm text-gray-600">Requests awaiting your response</p>
              </div>
              {(pendingBookings.length > 0 || quoteRequests.length > 0) ? (
                <div className="space-y-4">
                  {/* Regular Bookings */}
                  {pendingBookings.map((b) => <BookingCard key={b.id} booking={b} onStatusUpdate={handleBookingStatusUpdate} />)}
                  
                  {/* Quote Requests */}
                  {quoteRequests.map((qr: any) => (
                    <div key={qr.id} className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-[#434c9d] hover:shadow-xl transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-purple-100 text-purple-700">Quote Request</Badge>
                            <h3 className="text-xl font-bold text-gray-900">{qr.services?.title || 'Service'}</h3>
                          </div>
                          <p className="text-sm text-gray-600 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            {qr.profiles ? `${qr.profiles.first_name} ${qr.profiles.last_name}` : 'Customer'} requested a quote
                          </p>
                        </div>
                        <Badge className="bg-yellow-100 text-yellow-700 text-xs font-semibold px-3 py-1">
                          Pending Quote
                        </Badge>
                      </div>
                      {qr.requested_date && qr.requested_time && (
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <span className="font-medium">{new Date(qr.requested_date).toLocaleDateString()}</span>
                            <Clock className="w-4 h-4 text-purple-600 ml-2" />
                            <span className="font-medium">{qr.requested_time}</span>
                          </div>
                        </div>
                      )}
                      {qr.special_instructions && (
                        <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
                          <p className="text-sm text-gray-700">{qr.special_instructions}</p>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-[#434c9d] hover:bg-[#434c9d]/90 text-white"
                          onClick={() => router.push(`/provider/quote-requests?request=${qr.id}`)}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          View & Respond
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-[#434c9d] text-[#434c9d] hover:bg-[#434c9d] hover:text-white"
                          onClick={() => router.push(`/messages`)}
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Message
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No pending requests</h3>
                  <p className="text-gray-600">When customers request your services, they'll appear here</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="scheduled" className="mt-6">
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Scheduled Services</h2>
                <p className="text-sm text-gray-600">Confirmed and paid bookings</p>
              </div>
              {scheduledBookings.length > 0 ? (
                <div className="space-y-4">{scheduledBookings.map((b) => <BookingCard key={b.id} booking={b} onStatusUpdate={handleBookingStatusUpdate} />)}</div>
              ) : (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No scheduled services yet</h3>
                  <p className="text-gray-600">Confirmed and paid bookings will appear here</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Completed Services</h2>
                <p className="text-sm text-gray-600">Services you've completed</p>
              </div>
              {completedBookings.length > 0 ? (
                <div className="space-y-4">{completedBookings.map((b) => <BookingCard key={b.id} booking={b} onStatusUpdate={handleBookingStatusUpdate} />)}</div>
              ) : (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No completed services yet</h3>
                  <p className="text-gray-600">Completed services will appear here</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="cancelled" className="mt-6">
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Cancelled Services</h2>
                <p className="text-sm text-gray-600">Cancelled or rejected bookings</p>
              </div>
              {cancelledBookings.length > 0 ? (
                <div className="space-y-4">{cancelledBookings.map((b) => <BookingCard key={b.id} booking={b} onStatusUpdate={handleBookingStatusUpdate} />)}</div>
              ) : (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <XCircle className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No cancelled services</h3>
                  <p className="text-gray-600">Cancelled or rejected bookings will appear here</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}