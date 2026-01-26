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
import ServiceAvailabilityCalendar from "@/components/availability/ServiceAvailabilityCalendar";
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
  User,
  MessageCircle,
  CheckCircle,
  Wallet,
  FileText,
  XCircle,
  AlertCircle,
  ChevronRight,
  Info,
  Loader2,
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
  availability?: Record<string, Array<{ start: string; end: string }>> | null;
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
  customer_id?: string;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "active": return "bg-green-50 text-green-700";
    case "paused": return "bg-yellow-50 text-yellow-700";
    case "confirmed": return "bg-green-50 text-green-700";
    case "completed": return "bg-gray-50 text-gray-700";
    case "paid": return "bg-blue-50 text-blue-700";
    case "rejected": return "bg-red-50 text-red-700";
    case "cancelled": return "bg-gray-50 text-gray-700";
    default: return "bg-gray-50 text-gray-700";
  }
};

function BookingCard({ booking, onStatusUpdate }: {
  booking: Booking;
  onStatusUpdate: (bookingId: string, status: string, alternativeDate?: string, alternativeTime?: string) => Promise<void>;
}) {
  const [showAlternativeDialog, setShowAlternativeDialog] = useState(false);
  const [alternativeDate, setAlternativeDate] = useState("");
  const [alternativeTime, setAlternativeTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const formatTime = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch { return timeString; }
  };

  const handleAccept = async () => await onStatusUpdate(booking.id, "confirmed");
  const handleDecline = () => setShowAlternativeDialog(true);

  const handleProposeAlternative = async () => {
    if (!alternativeDate || !alternativeTime) {
      toast({ title: "Missing Information", description: "Please provide both an alternative date and time.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await onStatusUpdate(booking.id, "alternative_proposed", alternativeDate, alternativeTime);
      setShowAlternativeDialog(false);
      setAlternativeDate("");
      setAlternativeTime("");
      toast({ title: "Alternative Proposed", description: "The customer has been notified." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to propose alternative time.", variant: "destructive" });
    } finally { setIsSubmitting(false); }
  };

  const handleRejectWithoutAlternative = async () => {
    setIsSubmitting(true);
    try {
      await onStatusUpdate(booking.id, "rejected");
      setShowAlternativeDialog(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to reject booking.", variant: "destructive" });
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all group">
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl font-bold text-gray-900 leading-tight">{booking.service.title}</h3>
          </div>
          <p className="text-sm text-gray-500 font-medium flex items-center gap-2">
            <Users className="w-4 h-4 text-[#96cbc3]" />
            {booking.customer_name ? (
              booking.customer_id ? (
                <span>Requested by <Link href={`/profile/${booking.customer_id}`} className="text-[#434c9d] hover:underline font-bold">{booking.customer_name}</Link></span>
              ) : `Requested by ${booking.customer_name}`
            ) : 'Customer request'}
          </p>
        </div>
        <Badge className={cn("text-[10px] font-bold uppercase tracking-widest px-3 py-1 border-none", getStatusColor(booking.status))}>
          {booking.status === "confirmed" ? "Awaiting Payment" : booking.status}
        </Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-2xl mb-6">
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Date</div>
          <div className="text-sm font-bold text-gray-900">{new Date(booking.requested_date).toLocaleDateString()}</div>
          <div className="text-[10px] font-medium text-gray-500">{formatTime(booking.requested_time)}</div>
        </div>
        <div className="space-y-1 text-right sm:text-left">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center justify-end sm:justify-start gap-1.5"><DollarSign className="w-3 h-3" /> Price</div>
          <div className="text-sm font-bold text-gray-900">${booking.total_price}</div>
          <div className="text-[10px] font-medium text-gray-500">Total amount</div>
        </div>
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><Clock className="w-3 h-3" /> Duration</div>
          <div className="text-sm font-bold text-gray-900">{booking.duration} min</div>
        </div>
        <div className="space-y-1 text-right sm:text-left">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center justify-end sm:justify-start gap-1.5"><MapPin className="w-3 h-3" /> Location</div>
          <div className="text-sm font-bold text-gray-900 truncate">{booking.service.location}</div>
        </div>
      </div>

      {booking.special_instructions && (
        <div className="bg-blue-50/50 rounded-xl p-4 mb-6 text-sm text-blue-700 font-medium leading-relaxed italic border-l-2 border-blue-200">
          &quot;{booking.special_instructions}&quot;
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        {booking.status === "pending" && (
          <>
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-6 h-10 font-bold" onClick={handleAccept}>Accept Request</Button>
            <Button variant="outline" size="sm" className="text-red-600 border-red-100 hover:bg-red-50 rounded-xl px-6 h-10 font-bold" onClick={handleDecline}>Decline / Propose Time</Button>
          </>
        )}
        {(booking.status === "confirmed" || booking.status === "paid" || booking.status === "completed" || booking.status === "rejected") && (
          <Button variant="outline" size="sm" onClick={() => router.push(`/booking/${booking.id}`)} className="border-gray-100 text-gray-600 hover:bg-gray-50 rounded-xl px-6 h-10 font-bold flex items-center gap-2">
            <Eye className="w-4 h-4" /> View Details
          </Button>
        )}
        {booking.status === "paid" && (
          <Button variant="default" size="sm" onClick={() => onStatusUpdate(booking.id, "completed")} className="bg-[#434c9d] text-white hover:bg-[#434c9d]/90 rounded-xl px-6 h-10 font-bold flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> Mark as Completed
          </Button>
        )}
      </div>

      <Dialog open={showAlternativeDialog} onOpenChange={setShowAlternativeDialog}>
        <DialogContent className="rounded-[32px] p-8 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">Propose Alternative</DialogTitle>
            <DialogDescription className="text-gray-500 pt-2 leading-relaxed">The requested time doesn&apos;t work. Suggest a better time for you.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">New Date</Label>
                <Input type="date" value={alternativeDate} onChange={(e) => setAlternativeDate(e.target.value)} min={new Date().toISOString().split("T")[0]} className="rounded-xl bg-gray-50/50 border-gray-100" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">New Time</Label>
                <Input type="time" value={alternativeTime} onChange={(e) => setAlternativeTime(e.target.value)} className="rounded-xl bg-gray-50/50 border-gray-100" />
              </div>
            </div>
            <div className="flex flex-col gap-3 pt-4">
              <Button onClick={handleProposeAlternative} disabled={isSubmitting || !alternativeDate || !alternativeTime} className="w-full bg-[#434c9d] hover:bg-[#434c9d]/90 rounded-xl h-12 font-bold">Propose New Time</Button>
              <Button onClick={handleRejectWithoutAlternative} disabled={isSubmitting} variant="ghost" className="w-full text-red-500 hover:bg-red-50 rounded-xl h-12 font-bold">Reject Without Alternative</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
  const [earningsStats, setEarningsStats] = useState({ totalEarned: 0, thisWeekEarned: 0, thisMonthEarned: 0, pendingEarnings: 0 });
  const [stripeAccountStatus, setStripeAccountStatus] = useState({ hasAccount: false, accountStatus: null as any, loading: true });

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
  const [serviceAvailability, setServiceAvailability] = useState<Record<string, Array<{ start: string; end: string }>>>({});

  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [scheduledBookings, setScheduledBookings] = useState<Booking[]>([]);
  const [completedBookings, setCompletedBookings] = useState<Booking[]>([]);
  const [cancelledBookings, setCancelledBookings] = useState<Booking[]>([]);
  const [quoteRequests, setQuoteRequests] = useState<any[]>([]);
  const [servicesNeedingCompletion, setServicesNeedingCompletion] = useState<number>(0);
  const [cancellingQuoteRequest, setCancellingQuoteRequest] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('stripe_success') === 'true') {
      toast({ title: "Account connected!", description: "Your Stripe Connect account is ready." });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (urlParams.get('stripe_error')) {
      toast({ title: "Setup failed", description: "Error setting up payment account.", variant: "destructive" });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const isBookingExpired = (booking: Booking): boolean => {
    try {
      const bookingDateTime = new Date(`${booking.requested_date}T${booking.requested_time}`);
      return bookingDateTime < new Date();
    } catch { return false; }
  };

  const fetchEverything = async (forceRefresh = false) => {
    if (!user) return;
    try {
      setLoading(true);
      // Use cache: 'no-store' when forceRefresh is true to bypass browser cache
      const fetchOptions = forceRefresh ? { cache: 'no-store' as RequestCache } : {};
      
      const [sRes, bRes, eRes, qRes, stripeRes] = await Promise.all([
        fetch("/api/services", fetchOptions),
        fetch("/api/bookings", fetchOptions),
        fetch("/api/earnings", fetchOptions),
        fetch("/api/quotes/request?role=provider&status=pending", fetchOptions),
        fetch("/api/stripe/connect/setup", fetchOptions)
      ]);

      if (sRes.ok) setServices((await sRes.json()).services ?? []);
      if (bRes.ok) {
        const bData = await bRes.json();
        if (bData.success) {
          const allIncoming = bData.incoming || [];
          const activeIncoming = allIncoming.filter((b: Booking) => (b.status === "pending" || b.status === "confirmed" || b.status === "alternative_proposed") ? !isBookingExpired(b) : true);
          setPendingBookings(activeIncoming.filter((b: Booking) => b.status === "pending" || b.status === "confirmed" || b.status === "alternative_proposed"));
          const scheduled = allIncoming.filter((b: Booking) => b.status === "paid");
          setScheduledBookings(scheduled);
          const now = new Date();
          setServicesNeedingCompletion(scheduled.filter((b: Booking) => {
            try { return now >= new Date(new Date(`${b.requested_date}T${b.requested_time}`).setHours(new Date(`${b.requested_date}T${b.requested_time}`).getHours() + 1)); }
            catch { return false; }
          }).length);
          setCompletedBookings(allIncoming.filter((b: Booking) => b.status === "completed"));
          setCancelledBookings(allIncoming.filter((b: Booking) => b.status === "cancelled" || b.status === "rejected"));
        }
      }
      if (eRes.ok) {
        const eData = await eRes.json();
        if (eData.success) setEarningsStats(eData.stats);
      }
      if (qRes.ok) {
        const qData = await qRes.json();
        if (qData.success) {
          setPendingQuoteRequestsCount((qData.quote_requests || []).length);
          setQuoteRequests(qData.quote_requests || []);
        }
      }
      if (stripeRes.ok) {
        const sData = await stripeRes.json();
        if (sData.success) setStripeAccountStatus({ hasAccount: sData.hasAccount, accountStatus: sData.accountStatus, loading: false });
      }
    } catch (e: any) {
      toast({ title: "Load failed", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleDenyQuoteRequest = async (quoteRequestId: string) => {
    try {
      setCancellingQuoteRequest(quoteRequestId);
      const response = await fetch(`/api/quotes/request/${quoteRequestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to deny quote request");
      }

      const data = await response.json();
      if (data.success) {
        toast({ title: "Quote Request Denied", description: "The quote request has been cancelled." });
        await fetchEverything(true);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to deny quote request", variant: "destructive" });
    } finally {
      setCancellingQuoteRequest(null);
    }
  };

  const handleBookingStatusUpdate = async (bookingId: string, newStatus: string, alternativeDate?: string, alternativeTime?: string) => {
    // Optimistic UI update - immediately update the booking status in local state
    const updateBookingInState = (status: string) => {
      const updateBooking = (booking: Booking) => 
        booking.id === bookingId ? { ...booking, status } : booking;
      
      setPendingBookings(prev => {
        const updated = prev.map(updateBooking);
        // If status changed to something other than pending/confirmed/alternative_proposed, remove from pending
        if (!["pending", "confirmed", "alternative_proposed"].includes(status)) {
          return updated.filter(b => b.id !== bookingId);
        }
        return updated;
      });
      
      setScheduledBookings(prev => {
        const booking = [...pendingBookings, ...prev].find(b => b.id === bookingId);
        if (status === "paid" && booking) {
          // Add to scheduled if not already there
          const exists = prev.some(b => b.id === bookingId);
          if (!exists) return [...prev, { ...booking, status }];
        }
        if (status === "completed") {
          return prev.filter(b => b.id !== bookingId);
        }
        return prev.map(updateBooking);
      });
      
      setCompletedBookings(prev => {
        const booking = [...pendingBookings, ...scheduledBookings].find(b => b.id === bookingId);
        if (status === "completed" && booking) {
          const exists = prev.some(b => b.id === bookingId);
          if (!exists) return [...prev, { ...booking, status }];
        }
        return prev.map(updateBooking);
      });
      
      setCancelledBookings(prev => {
        const booking = [...pendingBookings, ...scheduledBookings].find(b => b.id === bookingId);
        if ((status === "cancelled" || status === "rejected") && booking) {
          const exists = prev.some(b => b.id === bookingId);
          if (!exists) return [...prev, { ...booking, status }];
        }
        return prev.map(updateBooking);
      });
    };

    // Apply optimistic update immediately
    updateBookingInState(newStatus);

    try {
      const body: any = { status: newStatus };
      if (alternativeDate && alternativeTime) {
        body.alternative_date = alternativeDate;
        body.alternative_time = alternativeTime;
      }

      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        // Revert optimistic update on failure
        await fetchEverything(true);
        throw new Error("Failed to update booking");
      }

      toast({ title: "Booking updated", description: `Booking ${newStatus} successfully.` });
      // Fetch fresh data to ensure consistency, with cache bypass
      await fetchEverything(true);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  useEffect(() => { fetchEverything(); }, [user]);

  if (userLoading || loading) {
    return (
      <DashboardLayout user={user}>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#434c9d] border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  if (!userLoading && (!user || userError)) {
    return (
      <DashboardLayout user={null}>
        <div className="p-6 max-w-sm mx-auto text-center py-20">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-100"><User className="w-8 h-8 text-gray-300" /></div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Setup Profile</h3>
          <p className="text-gray-500 mb-6 text-sm leading-relaxed">Complete your profile to access your Teen Hustle dashboard.</p>
          <Button onClick={() => window.location.href = '/profile'} className="w-full bg-[#434c9d] hover:bg-[#434c9d]/90 rounded-xl h-12 font-bold">Go to Profile</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user}>
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">My Teen Hustle</h1>
            <p className="text-gray-500 font-medium">Manage your micro-business and earnings.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/provider/quote-requests">
              <Button variant="outline" className="rounded-2xl border-gray-100 text-gray-700 hover:bg-gray-50 h-12 font-bold relative">
                <FileText className="w-4 h-4 mr-2 text-[#96cbc3]" /> Quote Requests
                {pendingQuoteRequestsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-[#ff725a] text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-lg border-2 border-white">{pendingQuoteRequestsCount}</span>
                )}
              </Button>
            </Link>
            <Link href="/my-services">
              <Button variant="outline" className="rounded-2xl border-gray-100 text-gray-700 hover:bg-gray-50 h-12 font-bold">
                <Star className="w-4 h-4 mr-2 text-yellow-400 fill-yellow-400" /> My Services
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Card */}
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8 mb-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#434c9d]/5 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Total Earnings</div>
              <div className="text-3xl font-black text-gray-900">${earningsStats.totalEarned.toFixed(2)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">This Week</div>
              <div className="text-3xl font-black text-[#96cbc3]">${earningsStats.thisWeekEarned.toFixed(2)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Total Jobs</div>
              <div className="text-3xl font-black text-gray-900">{completedBookings.length}</div>
            </div>
            <div className="flex items-center">
              <Link href="/earnings" className="w-full">
                <Button className="w-full bg-[#434c9d] hover:bg-[#434c9d]/90 rounded-2xl h-14 font-bold shadow-lg shadow-[#434c9d]/20 transition-all active:scale-95 flex items-center justify-center gap-2">
                  <Wallet className="w-5 h-5" /> View Payouts <ChevronRight className="w-4 h-4 opacity-50" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Bookings Section */}
        <div className="space-y-8">
          <Tabs defaultValue="pending" className="w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
              <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Booking Dashboard</h2>
              <TabsList className="bg-gray-100/50 p-1 rounded-2xl border border-gray-100">
                <TabsTrigger value="pending" className="rounded-xl font-bold text-xs uppercase tracking-wider px-6 data-[state=active]:bg-white data-[state=active]:text-[#434c9d] data-[state=active]:shadow-sm relative">
                  Pending {pendingBookings.length > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#ff725a] rounded-full" />}
                </TabsTrigger>
                <TabsTrigger value="scheduled" className="rounded-xl font-bold text-xs uppercase tracking-wider px-6 data-[state=active]:bg-white data-[state=active]:text-[#434c9d] data-[state=active]:shadow-sm">Scheduled</TabsTrigger>
                <TabsTrigger value="completed" className="rounded-xl font-bold text-xs uppercase tracking-wider px-6 data-[state=active]:bg-white data-[state=active]:text-[#434c9d] data-[state=active]:shadow-sm">History</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="pending">
              <div className="grid grid-cols-1 gap-6">
                {(pendingBookings.length > 0 || quoteRequests.length > 0) ? (
                  <>
                    {pendingBookings.map((b) => <BookingCard key={b.id} booking={b} onStatusUpdate={handleBookingStatusUpdate} />)}
                    {quoteRequests.map((qr: any) => (
                      <div key={qr.id} className="bg-white rounded-[24px] p-6 border-2 border-dashed border-[#96cbc3]/30 hover:border-[#96cbc3] transition-all">
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-[#96cbc3]/10 text-[#96cbc3] border-none text-[10px] font-bold uppercase tracking-widest px-2 py-0.5">Quote Request</Badge>
                              <h3 className="text-xl font-bold text-gray-900">{qr.services?.title}</h3>
                            </div>
                            <p className="text-sm text-gray-500 font-medium">From <span className="text-[#434c9d] font-bold">{qr.profiles?.first_name}</span></p>
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={() => router.push(`/provider/quote-requests?request=${qr.id}`)} className="bg-[#96cbc3] hover:bg-[#96cbc3]/90 text-white rounded-xl font-bold h-10 px-6">Respond</Button>
                          </div>
                        </div>
                        {qr.special_instructions && <p className="text-sm text-gray-500 leading-relaxed bg-gray-50 p-4 rounded-xl italic mb-4">&quot;{qr.special_instructions}&quot;</p>}
                        {(qr.status === "pending" || qr.status === "quoted") && (
                          <div className="flex gap-2 pt-2 border-t border-gray-100">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDenyQuoteRequest(qr.id)}
                              disabled={cancellingQuoteRequest === qr.id}
                              className="flex-1 text-red-600 border-red-100 hover:bg-red-50 rounded-xl h-10 font-bold"
                            >
                              {cancellingQuoteRequest === qr.id ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Denying...
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Deny Request
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="py-20 text-center bg-gray-50/50 rounded-[32px] border-2 border-dashed border-gray-100">
                    <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm"><Info className="w-8 h-8 text-gray-200" /></div>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">No new requests</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="scheduled">
              <div className="grid grid-cols-1 gap-6">
                {servicesNeedingCompletion > 0 && (
                  <div className="bg-[#ff725a]/10 border border-[#ff725a]/20 rounded-[24px] p-6 flex items-center gap-4">
                    <div className="p-3 bg-[#ff725a] rounded-2xl text-white shadow-lg shadow-[#ff725a]/20"><AlertCircle className="w-6 h-6" /></div>
                    <div>
                      <div className="text-lg font-bold text-gray-900">{servicesNeedingCompletion} services finished!</div>
                      <p className="text-sm text-gray-600 font-medium">Mark them as completed to receive your payment and reviews.</p>
                    </div>
                  </div>
                )}
                {scheduledBookings.length > 0 ? (
                  scheduledBookings.map((b) => <BookingCard key={b.id} booking={b} onStatusUpdate={handleBookingStatusUpdate} />)
                ) : (
                  <div className="py-20 text-center bg-gray-50/50 rounded-[32px] border-2 border-dashed border-gray-100">
                    <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm"><Calendar className="w-8 h-8 text-gray-200" /></div>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Nothing scheduled</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="completed">
              <div className="grid grid-cols-1 gap-6 opacity-80">
                {completedBookings.length > 0 ? (
                  completedBookings.map((b) => <BookingCard key={b.id} booking={b} onStatusUpdate={handleBookingStatusUpdate} />)
                ) : (
                  <div className="py-20 text-center bg-gray-50/50 rounded-[32px] border-2 border-dashed border-gray-100">
                    <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm"><CheckCircle className="w-8 h-8 text-gray-200" /></div>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">No history yet</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
}
