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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { formatBookingStatusLabel, isAwaitingPaymentStatus } from "@/lib/booking-status";
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
  Briefcase,
  CalendarPlus,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { getQuoteReferenceImageUrls } from "@/lib/quote-reference-images";

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
    case "awaiting_payment":
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
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
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

  const formatDate = (dateString: string) => {
    // Parse YYYY-MM-DD as a local calendar date to avoid timezone day-shift.
    const [year, month, day] = dateString.split("-").map(Number);
    const localDate = new Date(year, (month || 1) - 1, day || 1);
    return localDate.toLocaleDateString("en-US");
  };

  const handleAccept = async () => await onStatusUpdate(booking.id, "awaiting_payment");
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

  const buildGoogleCalendarUrl = () => {
    const startDate = new Date(`${booking.requested_date}T${booking.requested_time}`);
    if (Number.isNaN(startDate.getTime())) return null;
    const endDate = new Date(startDate.getTime() + booking.duration * 60 * 1000);
    const formatForGoogle = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const details = [
      `Booking ID: ${booking.id}`,
      booking.special_instructions ? `Notes: ${booking.special_instructions}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `${booking.service.title} (TeenOp)`,
      dates: `${formatForGoogle(startDate)}/${formatForGoogle(endDate)}`,
      details,
      location: booking.service.location || "",
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  const buildIcsContent = () => {
    const startDate = new Date(`${booking.requested_date}T${booking.requested_time}`);
    if (Number.isNaN(startDate.getTime())) return null;
    const endDate = new Date(startDate.getTime() + booking.duration * 60 * 1000);
    const formatIcsDate = (date: Date) =>
      date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

    const escapeText = (value: string) =>
      value
        .replace(/\\/g, "\\\\")
        .replace(/,/g, "\\,")
        .replace(/;/g, "\\;")
        .replace(/\n/g, "\\n");

    const description = [
      `TeenOp Service Booking`,
      `Booking ID: ${booking.id}`,
      booking.special_instructions ? `Notes: ${booking.special_instructions}` : "",
    ]
      .filter(Boolean)
      .join("\\n");

    return [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//TeenOp//Booking Calendar//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:${booking.id}@teenop.com`,
      `DTSTAMP:${formatIcsDate(new Date())}`,
      `DTSTART:${formatIcsDate(startDate)}`,
      `DTEND:${formatIcsDate(endDate)}`,
      `SUMMARY:${escapeText(`${booking.service.title} (TeenOp)`)}`,
      `DESCRIPTION:${escapeText(description)}`,
      `LOCATION:${escapeText(booking.service.location || "")}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
  };

  const handleAddToCalendar = () => {
    const url = buildGoogleCalendarUrl();
    if (!url) {
      toast({ title: "Unable to add event", description: "This booking has an invalid date/time.", variant: "destructive" });
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleAddToAppleCalendar = () => {
    const icsContent = buildIcsContent();
    if (!icsContent) {
      toast({ title: "Unable to add event", description: "This booking has an invalid date/time.", variant: "destructive" });
      return;
    }

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `teenop-booking-${booking.id}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
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
          {formatBookingStatusLabel(booking.status)}
        </Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-2xl mb-6">
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Date</div>
          <div className="text-sm font-bold text-gray-900">{formatDate(booking.requested_date)}</div>
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
      {booking.status === "paid" && (
        <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-black text-blue-900 mb-2">Booking Confirmed</p>
          <p className="text-xs font-bold text-blue-800 mb-2">Here&apos;s what happens next:</p>
          <ul className="space-y-1 text-xs font-medium text-blue-900 list-disc pl-4">
            <li>A parent has paid in advance for your service.</li>
            <li>Funds will be transferred to your account after you mark the service as completed.</li>
            <li>Be sure to message the parent through the platform to confirm details.</li>
            <li>You&apos;ll receive email reminders 24 hours and 3 hours before your scheduled service.</li>
            <li>Once completed, Mark Service Completed on Bookings Page and visit Earnings Page to see how to receive payment.</li>
            <li>After the service, the parent can tip and leave a review.</li>
          </ul>
          <p className="text-xs font-bold text-blue-900 mt-2">You&apos;re all set go do your thing &#128155;</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        {booking.status === "pending" && (
          <>
            <p className="w-full text-[11px] font-semibold text-gray-600 mb-1">
              You will be notified by email when the buyer completes payment.
            </p>
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-6 h-10 font-bold" onClick={handleAccept}>Accept Request</Button>
            <Button variant="outline" size="sm" className="text-red-600 border-red-100 hover:bg-red-50 rounded-xl px-6 h-10 font-bold" onClick={handleDecline}>Decline / Propose Time</Button>
          </>
        )}
        {(isAwaitingPaymentStatus(booking.status) || booking.status === "paid" || booking.status === "completed" || booking.status === "rejected") && (
          <Button variant="outline" size="sm" onClick={() => router.push(`/booking/${booking.id}`)} className="border-gray-100 text-gray-600 hover:bg-gray-50 rounded-xl px-6 h-10 font-bold flex items-center gap-2">
            <Eye className="w-4 h-4" /> View Details
          </Button>
        )}
        {booking.status === "paid" && (
          <>
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowCompleteDialog(true)}
              className="bg-[#434c9d] text-white hover:bg-[#434c9d]/90 rounded-xl px-6 h-10 font-bold flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" /> Mark as Completed
            </Button>
          </>
        )}

        {booking.status === "paid" && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddToCalendar}
              className="border-gray-100 text-gray-700 hover:bg-gray-50 rounded-xl px-6 h-10 font-bold flex items-center gap-2"
            >
              <CalendarPlus className="w-4 h-4" /> Google Calendar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddToAppleCalendar}
              className="border-gray-100 text-gray-700 hover:bg-gray-50 rounded-xl px-6 h-10 font-bold flex items-center gap-2"
            >
              <CalendarPlus className="w-4 h-4" /> Apple Calendar
            </Button>
          </>
        )}
      </div>

      <Dialog open={showAlternativeDialog} onOpenChange={setShowAlternativeDialog}>
        <DialogContent className="rounded-[32px] p-8 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">Propose Alternative</DialogTitle>
            <DialogDescription className="text-gray-500 pt-2 leading-relaxed">The requested time doesn&apos;t work. Suggest a better time for you.</DialogDescription>
            <p className="text-xs font-semibold text-[#434c9d]">
              You will be notified by email when the buyer responds.
            </p>
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

      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="rounded-[28px] p-7">
          <DialogHeader>
            <DialogTitle>Mark service as completed?</DialogTitle>
            <DialogDescription>
              Confirm once the service has actually been completed. This unlocks earnings for withdrawal.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <Button
              variant="outline"
              className="sm:flex-1 rounded-xl"
              onClick={() => setShowCompleteDialog(false)}
            >
              Not yet
            </Button>
            <Button
              className="sm:flex-1 rounded-xl bg-[#434c9d] hover:bg-[#434c9d]/90"
              onClick={async () => {
                setShowCompleteDialog(false);
                await onStatusUpdate(booking.id, "completed");
              }}
            >
              Yes, mark completed
            </Button>
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
  const [proposeTimeState, setProposeTimeState] = useState<{
    quoteRequestId: string;
    alternativeDate: string;
    alternativeTime: string;
  } | null>(null);
  const [sendQuoteState, setSendQuoteState] = useState<{
    quoteRequestId: string;
    price: string;
    notes: string;
    estimatedDurationHours: string;
  } | null>(null);
  const [processingQuoteRequestId, setProcessingQuoteRequestId] = useState<string | null>(null);
  const [servicesNeedingCompletion, setServicesNeedingCompletion] = useState<number>(0);
  const [cancellingQuoteRequest, setCancellingQuoteRequest] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("pending");

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
      if (
        booking.status === "alternative_proposed" &&
        booking.alternative_date &&
        booking.alternative_time
      ) {
        const alt = new Date(`${booking.alternative_date}T${booking.alternative_time}`);
        return alt < new Date();
      }
      const bookingDateTime = new Date(`${booking.requested_date}T${booking.requested_time}`);
      return bookingDateTime < new Date();
    } catch {
      return false;
    }
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
        fetch("/api/quotes/request?role=provider&status=pending,quoted", fetchOptions),
        fetch("/api/stripe/connect/setup", fetchOptions)
      ]);

      if (sRes.ok) setServices((await sRes.json()).services ?? []);
      if (bRes.ok) {
        const bData = await bRes.json();
        if (bData.success) {
          const allIncoming = bData.incoming || [];
          const activeIncoming = allIncoming.filter((b: Booking) => (b.status === "pending" || isAwaitingPaymentStatus(b.status) || b.status === "alternative_proposed") ? !isBookingExpired(b) : true);
          setPendingBookings(activeIncoming.filter((b: Booking) => b.status === "pending" || isAwaitingPaymentStatus(b.status) || b.status === "alternative_proposed"));
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
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("providerAttentionRefresh"));
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

  const patchQuoteRequest = async (
    quoteRequestId: string,
    payload: { status?: string; requested_date?: string; requested_time?: string }
  ) => {
    const response = await fetch(`/api/quotes/request/${quoteRequestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.success) {
      throw new Error(data?.error || "Failed to update quote request");
    }
  };

  const handleBookingStatusUpdate = async (bookingId: string, newStatus: string, alternativeDate?: string, alternativeTime?: string) => {
    // Optimistic UI update - immediately update the booking status in local state
    const updateBookingInState = (status: string) => {
      const updateBooking = (booking: Booking) => 
        booking.id === bookingId ? { ...booking, status } : booking;
      
      setPendingBookings(prev => {
        const updated = prev.map(updateBooking);
        // If status changed to something other than pending / awaiting payment / alternative_proposed, remove from pending
        if (!["pending", "awaiting_payment", "confirmed", "alternative_proposed"].includes(status)) {
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
      throw e;
    }
  };

  const openSendQuoteDialog = (quoteRequest: any) => {
    setSendQuoteState({
      quoteRequestId: quoteRequest.id,
      price: "",
      notes: "",
      estimatedDurationHours: "",
    });
  };

  const handleSubmitSendQuote = async () => {
    if (!sendQuoteState) return;
    const price = parseFloat(sendQuoteState.price);
    if (!Number.isFinite(price) || price <= 0) {
      toast({
        title: "Enter a valid price",
        description: "Please enter how much you will charge (greater than $0).",
        variant: "destructive",
      });
      return;
    }
    let estimatedDuration: number | undefined;
    if (sendQuoteState.estimatedDurationHours.trim()) {
      const n = parseFloat(sendQuoteState.estimatedDurationHours);
      if (!Number.isFinite(n) || n <= 0) {
        toast({
          title: "Invalid duration",
          description: "Estimated duration must be a positive number of hours.",
          variant: "destructive",
        });
        return;
      }
      estimatedDuration = Math.round(n * 60);
    }
    try {
      setProcessingQuoteRequestId(sendQuoteState.quoteRequestId);
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quote_request_id: sendQuoteState.quoteRequestId,
          price,
          notes: sendQuoteState.notes.trim() || undefined,
          estimated_duration: estimatedDuration,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Failed to send quote");
      }
      setSendQuoteState(null);
      toast({
        title: "Quote sent",
        description: "The customer has been notified and can accept or decline.",
      });
      await fetchEverything(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send quote",
        variant: "destructive",
      });
    } finally {
      setProcessingQuoteRequestId(null);
    }
  };

  const openProposeTimeForQuoteRequest = (quoteRequest: any) => {
    setProposeTimeState({
      quoteRequestId: quoteRequest.id,
      alternativeDate: "",
      alternativeTime: "",
    });
  };

  const handleSubmitQuoteRequestAlternative = async () => {
    if (!proposeTimeState) return;
    if (!proposeTimeState.alternativeDate || !proposeTimeState.alternativeTime) {
      toast({
        title: "Missing Information",
        description: "Please provide both an alternative date and time.",
        variant: "destructive",
      });
      return;
    }
    try {
      setProcessingQuoteRequestId(proposeTimeState.quoteRequestId);
      await patchQuoteRequest(proposeTimeState.quoteRequestId, {
        status: "quoted",
        requested_date: proposeTimeState.alternativeDate,
        requested_time: proposeTimeState.alternativeTime,
      });
      setProposeTimeState(null);
      toast({
        title: "Alternative Proposed",
        description: "The customer has been notified of the new time.",
      });
      await fetchEverything(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to propose alternative time",
        variant: "destructive",
      });
    } finally {
      setProcessingQuoteRequestId(null);
    }
  };

  const formatQuoteDate = (dateString: string) => {
    const [year, month, day] = dateString.split("-").map(Number);
    const localDate = new Date(year, (month || 1) - 1, day || 1);
    return localDate.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatQuoteTime = (timeString: string) =>
    new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

  const formatHours = (minutes: number) => {
    const hours = minutes / 60;
    const rounded = Number.isInteger(hours) ? hours.toString() : hours.toFixed(1).replace(/\.0$/, "");
    return `${rounded} hour${rounded === "1" ? "" : "s"}`;
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
        {/* Page Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 mb-12">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-[#434c9d]/10 text-[#434c9d] rounded-full px-4 py-1.5">
              <Briefcase className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.15em]">Booking Dashboard</span>
            </div>
            <h1 className="page-title text-gray-900">Booking Dashboard</h1>
            <p className="text-lg text-gray-500 font-medium max-w-2xl leading-relaxed">
              Manage your services, bookings, and earnings.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/my-services">
              <Button variant="outline" className="rounded-2xl border-gray-100 text-gray-700 hover:bg-gray-50 h-12 font-bold">
                <Star className="w-4 h-4 mr-2 text-yellow-400 fill-yellow-400" /> My Services
              </Button>
            </Link>
          </div>
        </div>

        <div className="mb-10 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-semibold text-amber-900 leading-relaxed">
            If you need to cancel, please do so at least 24 hours in advance. Last-minute cancellations should be avoided whenever possible.
          </p>
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
                  <Wallet className="w-5 h-5" /> Earnings Dashboard<ChevronRight className="w-4 h-4 opacity-50" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Bookings Section */}
        <div className="space-y-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
              <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Your bookings</h2>
              <TabsList className="bg-gray-100/50 p-1 rounded-2xl border border-gray-100">
                <TabsTrigger
                  value="pending"
                  className={cn(
                    "rounded-xl font-bold text-xs uppercase tracking-wider px-6 data-[state=active]:bg-white data-[state=active]:text-[#434c9d] data-[state=active]:shadow-sm relative",
                    pendingBookings.some((b) => b.status === "pending") && "pr-7"
                  )}
                >
                  Pending
                  {pendingBookings.some((b) => b.status === "pending") && (
                    <span
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-red-500 animate-pulse"
                      aria-hidden
                    />
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="scheduled"
                  className={cn(
                    "rounded-xl font-bold text-xs uppercase tracking-wider px-6 data-[state=active]:bg-white data-[state=active]:text-[#434c9d] data-[state=active]:shadow-sm relative",
                    scheduledBookings.length > 0 && "pr-7"
                  )}
                >
                  Scheduled
                  {scheduledBookings.length > 0 && (
                    <span
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-red-500 animate-pulse"
                      aria-hidden
                    />
                  )}
                </TabsTrigger>
                <TabsTrigger value="completed" className="rounded-xl font-bold text-xs uppercase tracking-wider px-6 data-[state=active]:bg-white data-[state=active]:text-[#434c9d] data-[state=active]:shadow-sm">History</TabsTrigger>
              </TabsList>
            </div>
            <div className="mb-6 rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
              <p className="text-sm font-semibold text-gray-700">
                {activeTab === "pending" && "Pending: Awaiting teen response, customer payment, or a response to an alternative time request."}
                {activeTab === "scheduled" && "Scheduled: Payment received; your service is locked in."}
                {activeTab === "completed" && "History: Completed or past bookings, including reviews and payments."}
              </p>
            </div>

            <TabsContent value="pending">
              <div className="grid grid-cols-1 gap-6">
                {(pendingBookings.length > 0 || quoteRequests.length > 0) ? (
                  <>
                    {pendingBookings.map((b) => <BookingCard key={b.id} booking={b} onStatusUpdate={handleBookingStatusUpdate} />)}
                    {quoteRequests.map((qr: any) => (
                      <div key={qr.id} className="bg-white rounded-[24px] p-6 border-2 border-dashed border-[#96cbc3]/30 hover:border-[#96cbc3] transition-all">
                        {(() => {
                          const refImageUrls = getQuoteReferenceImageUrls(qr);
                          return refImageUrls.length > 0 ? (
                            <div className="mb-4 rounded-2xl overflow-hidden border border-gray-100 relative">
                              <img
                                src={refImageUrls[0]}
                                alt="Quote request reference"
                                className="w-full h-40 object-cover"
                              />
                              {refImageUrls.length > 1 && (
                                <span className="absolute bottom-2 right-2 rounded-lg bg-black/70 text-white text-[10px] font-black uppercase tracking-wider px-2 py-1">
                                  +{refImageUrls.length - 1}
                                </span>
                              )}
                            </div>
                          ) : null;
                        })()}
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-[#96cbc3]/10 text-[#96cbc3] border-none text-[10px] font-bold uppercase tracking-widest px-2 py-0.5">Quote Request</Badge>
                              <h3 className="text-xl font-bold text-gray-900">{qr.services?.title}</h3>
                            </div>
                            <p className="text-sm text-gray-500 font-medium">From <span className="text-[#434c9d] font-bold">{qr.profiles?.first_name}</span></p>
                          </div>
                          <div className="flex gap-2" />
                        </div>
                        {(qr.requested_date || qr.requested_time || qr.service_address) && (
                          <div className="mb-4 p-4 bg-gray-50/70 rounded-xl border border-gray-100 space-y-1.5">
                            {qr.requested_date && (
                              <p className="text-sm text-gray-700 font-semibold">
                                Requested date:{" "}
                                <span className="text-gray-900 font-bold">{formatQuoteDate(qr.requested_date)}</span>
                              </p>
                            )}
                            {qr.requested_time && (
                              <p className="text-sm text-gray-700 font-semibold">
                                Requested time:{" "}
                                <span className="text-gray-900 font-bold">{formatQuoteTime(qr.requested_time)}</span>
                              </p>
                            )}
                            {qr.service_address && (
                              <p className="text-sm text-gray-700 font-semibold">
                                Location: <span className="text-gray-900 font-bold">{qr.service_address}</span>
                              </p>
                            )}
                          </div>
                        )}
                        {qr.special_instructions && <p className="text-sm text-gray-500 leading-relaxed bg-gray-50 p-4 rounded-xl italic mb-4">&quot;{qr.special_instructions}&quot;</p>}
                        <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/70 p-3">
                          <p className="text-xs font-semibold text-blue-900 leading-relaxed">
                            You will receive an email notification when the parent responds. After you accept and the parent pays, this will appear under your Bookings tab.
                          </p>
                        </div>
                        {Array.isArray(qr.quotes) && qr.quotes.length > 0 && (
                          <div className="mb-4 p-4 bg-[#96cbc3]/10 rounded-2xl border border-[#96cbc3]/25">
                            <p className="text-[10px] font-black text-[#96cbc3] uppercase tracking-widest mb-1">Your quote</p>
                            <p className="text-2xl font-black text-gray-900">
                              ${Number(qr.quotes[0].price).toFixed(2)}
                            </p>
                            {qr.quotes[0].estimated_duration != null && (
                              <p className="text-xs text-gray-600 font-medium mt-1">
                                Est. duration: {formatHours(qr.quotes[0].estimated_duration)}
                              </p>
                            )}
                            {qr.quotes[0].notes && (
                              <p className="text-sm text-gray-600 mt-2 leading-relaxed">{qr.quotes[0].notes}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-2">
                              Waiting for the customer to accept or decline this quote.
                            </p>
                          </div>
                        )}
                        {(qr.status === "pending" || qr.status === "quoted") && (
                          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-gray-100">
                            {!qr.quotes?.length ? (
                              <Button
                                size="sm"
                                onClick={() => openSendQuoteDialog(qr)}
                                disabled={processingQuoteRequestId === qr.id}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl h-10 font-bold"
                              >
                                Send quote
                              </Button>
                            ) : null}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openProposeTimeForQuoteRequest(qr)}
                              disabled={processingQuoteRequestId === qr.id}
                              className="flex-1 text-gray-700 border-gray-200 hover:bg-gray-50 rounded-xl h-10 font-bold"
                            >
                              Propose Different Time
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDenyQuoteRequest(qr.id)}
                              disabled={cancellingQuoteRequest === qr.id || processingQuoteRequestId === qr.id}
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
      <Dialog
        open={!!proposeTimeState}
        onOpenChange={(openState) => {
          if (!openState) setProposeTimeState(null);
        }}
      >
        <DialogContent className="rounded-[28px] p-7">
          <DialogHeader>
            <DialogTitle>Propose a different time</DialogTitle>
            <DialogDescription>
              Suggest a new date and time for this quote request.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">New Date</Label>
              <Input
                type="date"
                min={new Date().toISOString().split("T")[0]}
                value={proposeTimeState?.alternativeDate ?? ""}
                onChange={(e) =>
                  setProposeTimeState((prev) =>
                    prev ? { ...prev, alternativeDate: e.target.value } : prev
                  )
                }
                className="rounded-xl bg-gray-50/50 border-gray-100"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">New Time</Label>
              <Input
                type="time"
                value={proposeTimeState?.alternativeTime ?? ""}
                onChange={(e) =>
                  setProposeTimeState((prev) =>
                    prev ? { ...prev, alternativeTime: e.target.value } : prev
                  )
                }
                className="rounded-xl bg-gray-50/50 border-gray-100"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-5">
            <Button
              variant="outline"
              className="sm:flex-1 rounded-xl"
              onClick={() => setProposeTimeState(null)}
            >
              Cancel
            </Button>
            <Button
              className="sm:flex-1 rounded-xl bg-[#434c9d] hover:bg-[#434c9d]/90"
              onClick={handleSubmitQuoteRequestAlternative}
              disabled={
                !proposeTimeState?.alternativeDate ||
                !proposeTimeState?.alternativeTime ||
                processingQuoteRequestId === proposeTimeState?.quoteRequestId
              }
            >
              {processingQuoteRequestId === proposeTimeState?.quoteRequestId ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Propose New Time"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!sendQuoteState}
        onOpenChange={(openState) => {
          if (!openState) setSendQuoteState(null);
        }}
      >
        <DialogContent className="rounded-[28px] p-7 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send your quote</DialogTitle>
            <DialogDescription>
              Enter how much you will charge. The customer will get an email and can accept to book and pay.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Your price (USD)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="number"
                  min={0.01}
                  step={0.01}
                  placeholder="0.00"
                  value={sendQuoteState?.price ?? ""}
                  onChange={(e) =>
                    setSendQuoteState((prev) =>
                      prev ? { ...prev, price: e.target.value } : prev
                    )
                  }
                  className="rounded-xl bg-gray-50/50 border-gray-100 pl-9 font-semibold"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                Estimated duration (hours, optional)
              </Label>
              <Input
                type="number"
                min={0.25}
                step={0.25}
                placeholder="e.g. 1.5"
                value={sendQuoteState?.estimatedDurationHours ?? ""}
                onChange={(e) =>
                  setSendQuoteState((prev) =>
                    prev ? { ...prev, estimatedDurationHours: e.target.value } : prev
                  )
                }
                className="rounded-xl bg-gray-50/50 border-gray-100"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                Notes (optional)
              </Label>
              <Textarea
                placeholder="Anything the customer should know about what’s included"
                value={sendQuoteState?.notes ?? ""}
                onChange={(e) =>
                  setSendQuoteState((prev) =>
                    prev ? { ...prev, notes: e.target.value } : prev
                  )
                }
                className="rounded-xl bg-gray-50/50 border-gray-100 min-h-[88px] resize-none"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <Button
              variant="outline"
              className="sm:flex-1 rounded-xl"
              onClick={() => setSendQuoteState(null)}
            >
              Cancel
            </Button>
            <Button
              className="sm:flex-1 rounded-xl bg-green-600 hover:bg-green-700"
              onClick={handleSubmitSendQuote}
              disabled={processingQuoteRequestId === sendQuoteState?.quoteRequestId}
            >
              {processingQuoteRequestId === sendQuoteState?.quoteRequestId ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Submit quote"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
