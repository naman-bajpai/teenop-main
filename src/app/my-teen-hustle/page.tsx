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
  Timer,
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

const getStatusConfig = (status: string) => {
  switch (status) {
    case "pending":
      return { color: "text-amber-700", bg: "bg-amber-50", label: "Pending Response" };
    case "awaiting_payment":
    case "confirmed":
      return { color: "text-blue-700", bg: "bg-blue-50", label: "Awaiting Payment" };
    case "paid":
      return { color: "text-emerald-700", bg: "bg-emerald-50", label: "Paid & Confirmed" };
    case "completed":
      return { color: "text-gray-600", bg: "bg-gray-50", label: "Completed" };
    case "rejected":
      return { color: "text-red-700", bg: "bg-red-50", label: "Rejected" };
    case "cancelled":
      return { color: "text-gray-600", bg: "bg-gray-50", label: "Cancelled" };
    case "alternative_proposed":
      return { color: "text-orange-700", bg: "bg-orange-50", label: "Alt. Proposed" };
    default:
      return { color: "text-gray-600", bg: "bg-gray-50", label: status.replace(/_/g, " ") };
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
      const [hours, minutes] = timeString.split(":");
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? "PM" : "AM";
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch { return timeString; }
  };

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split("-").map(Number);
    const localDate = new Date(year, (month || 1) - 1, day || 1);
    return localDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
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
    } catch {
      toast({ title: "Error", description: "Failed to propose alternative time.", variant: "destructive" });
    } finally { setIsSubmitting(false); }
  };

  const handleRejectWithoutAlternative = async () => {
    setIsSubmitting(true);
    try {
      await onStatusUpdate(booking.id, "rejected");
      setShowAlternativeDialog(false);
    } catch {
      toast({ title: "Error", description: "Failed to reject booking.", variant: "destructive" });
    } finally { setIsSubmitting(false); }
  };

  const buildGoogleCalendarUrl = () => {
    const startDate = new Date(`${booking.requested_date}T${booking.requested_time}`);
    if (Number.isNaN(startDate.getTime())) return null;
    const endDate = new Date(startDate.getTime() + booking.duration * 60 * 1000);
    const formatForGoogle = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const details = [`Booking ID: ${booking.id}`, booking.special_instructions ? `Notes: ${booking.special_instructions}` : ""].filter(Boolean).join("\n");
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
    const formatIcsDate = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const escapeText = (value: string) =>
      value.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
    const description = [`TeenOp Service Booking`, `Booking ID: ${booking.id}`, booking.special_instructions ? `Notes: ${booking.special_instructions}` : ""].filter(Boolean).join("\\n");
    return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//TeenOp//Booking Calendar//EN", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
      `UID:${booking.id}@teenop.com`, `DTSTAMP:${formatIcsDate(new Date())}`, `DTSTART:${formatIcsDate(startDate)}`,
      `DTEND:${formatIcsDate(endDate)}`, `SUMMARY:${escapeText(`${booking.service.title} (TeenOp)`)}`,
      `DESCRIPTION:${escapeText(description)}`, `LOCATION:${escapeText(booking.service.location || "")}`,
      "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  };

  const handleAddToCalendar = () => {
    const url = buildGoogleCalendarUrl();
    if (!url) { toast({ title: "Unable to add event", description: "This booking has an invalid date/time.", variant: "destructive" }); return; }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleAddToAppleCalendar = () => {
    const icsContent = buildIcsContent();
    if (!icsContent) { toast({ title: "Unable to add event", description: "This booking has an invalid date/time.", variant: "destructive" }); return; }
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

  const statusConfig = getStatusConfig(booking.status);

  return (
    <div className={cn(
      "group relative overflow-hidden transition-all duration-500 rounded-[32px] border border-gray-100 bg-white hover:shadow-2xl hover:shadow-[#434c9d]/10 flex flex-col h-full",
      booking.status === "paid" && "bg-gradient-to-br from-white to-emerald-50/30",
      booking.status === "pending" && "bg-gradient-to-br from-white to-amber-50/30",
      booking.status === "alternative_proposed" && "bg-gradient-to-br from-white to-orange-50/30"
    )}>
      {/* Decorative accent */}
      <div className={cn(
        "absolute top-0 left-0 w-2 h-full opacity-60",
        booking.status === "paid" ? "bg-emerald-400" :
        booking.status === "pending" ? "bg-amber-400" :
        booking.status === "completed" ? "bg-gray-400" : "bg-[#434c9d]"
      )} />

      <div className="p-8 pb-6 flex-1">
        {/* Header Section */}
        <div className="flex justify-between items-start gap-4 mb-6">
          <div className="flex-1 min-w-0 space-y-3">
            <Badge className={cn(
              "text-[10px] font-black uppercase tracking-widest px-3 py-1.5 border-none shadow-sm",
              statusConfig.bg, statusConfig.color
            )}>
              {statusConfig.label}
            </Badge>
            <div>
              <h3 className="text-xl font-black text-gray-900 leading-tight group-hover:text-[#434c9d] transition-colors">
                {booking.service.title}
              </h3>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                  <User className="w-4 h-4 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 font-bold">
                  {booking.customer_name ? (
                    booking.customer_id ? (
                      <span>by <Link href={`/profile/${booking.customer_id}`} className="text-[#434c9d] hover:text-[#ff725a] transition-colors font-black">{booking.customer_name}</Link></span>
                    ) : `by ${booking.customer_name}`
                  ) : "Customer request"}
                </p>
              </div>
            </div>
          </div>
          <div className="text-right p-4 bg-gray-50/80 rounded-3xl border border-gray-100/50 backdrop-blur-sm shrink-0">
            <p className="text-2xl font-black text-[#434c9d] leading-none">${booking.total_price}</p>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Total</p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-[#434c9d] shrink-0 border border-blue-100/50">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</p>
                <p className="text-sm font-black text-gray-900 truncate">{formatDate(booking.requested_date)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 shrink-0 border border-orange-100/50">
                <Clock className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Time</p>
                <p className="text-sm font-black text-gray-900 truncate">{formatTime(booking.requested_time)}</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 border border-emerald-100/50">
                <Timer className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Duration</p>
                <p className="text-sm font-black text-gray-900 truncate">{booking.duration} min</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 shrink-0 border border-red-100/50">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Location</p>
                <p className="text-sm font-black text-gray-900 truncate">{booking.service.location}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Special Instructions */}
        {booking.special_instructions && (
          <div className="mb-6 p-5 bg-[#96cbc3]/10 rounded-[24px] border border-[#96cbc3]/20 relative overflow-hidden group/note">
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover/note:opacity-30 transition-opacity">
              <FileText className="w-8 h-8 text-[#96cbc3]" />
            </div>
            <p className="text-sm text-[#434c9d] font-bold italic leading-relaxed relative z-10">
              &quot;{booking.special_instructions}&quot;
            </p>
          </div>
        )}

        {/* Status Banners */}
        {isAwaitingPaymentStatus(booking.status) && (
          <div className="mb-6 rounded-[24px] border-2 border-dashed border-blue-200 bg-blue-50/40 p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Timer className="w-5 h-5 animate-pulse" />
            </div>
            <p className="text-xs font-bold text-blue-800 leading-relaxed pt-1">
              Almost there! Waiting for the customer to complete payment. We&apos;ll notify you immediately when it&apos;s confirmed.
            </p>
          </div>
        )}

        {booking.status === "paid" && (
          <div className="mb-6 rounded-[24px] border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                <CheckCircle className="w-5 h-5" />
              </div>
              <p className="text-sm font-black text-emerald-900">Everything is set!</p>
            </div>
            <p className="text-xs font-bold text-emerald-800 mb-3">Next steps for a successful service:</p>
            <ul className="grid grid-cols-1 gap-2">
              {[
                "The parent has paid in advance",
                "Message them to confirm details",
                "Earnings unlock after completion"
              ].map((text, i) => (
                <li key={i} className="flex items-center gap-2 text-xs font-bold text-emerald-900/70">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {text}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="p-8 pt-0 mt-auto">
        <div className="flex flex-col gap-3 pt-6 border-t border-gray-100/50">
          {booking.status === "pending" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 px-1">
                <Info className="w-3.5 h-3.5 text-amber-500" />
                <p className="text-[11px] font-bold text-amber-700">Accept to allow the buyer to pay.</p>
              </div>
              <div className="flex gap-3">
                <Button size="sm" className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-2xl h-12 font-black shadow-lg shadow-green-500/20 transition-all hover:-translate-y-0.5" onClick={handleAccept}>
                  <CheckCircle className="w-4 h-4 mr-2" /> Accept
                </Button>
                <Button variant="outline" size="sm" className="flex-1 text-red-500 border-red-100 hover:bg-red-50 rounded-2xl h-12 font-black" onClick={handleDecline}>
                  <XCircle className="w-4 h-4 mr-2" /> Decline
                </Button>
              </div>
            </div>
          )}

          {(isAwaitingPaymentStatus(booking.status) || booking.status === "paid" || booking.status === "completed" || booking.status === "rejected") && (
            <Button variant="outline" size="sm" onClick={() => router.push(`/booking/${booking.id}`)} className="w-full border-gray-100 text-[#434c9d] hover:bg-[#434c9d] hover:text-white transition-all rounded-2xl h-12 font-black flex items-center justify-center gap-2">
              <Eye className="w-4 h-4" /> View Details
            </Button>
          )}

          {booking.status === "paid" && (
            <div className="flex flex-col gap-3">
              <Button variant="default" size="sm" onClick={() => setShowCompleteDialog(true)} className="w-full bg-[#434c9d] text-white hover:bg-[#434c9d]/90 rounded-2xl h-12 font-black shadow-lg shadow-[#434c9d]/20 transition-all hover:-translate-y-0.5">
                <CheckCircle className="w-4 h-4 mr-2" /> Mark as Completed
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleAddToCalendar} className="flex-1 border-gray-100 text-gray-700 hover:bg-gray-50 rounded-xl h-10 font-bold text-[10px] uppercase tracking-wider">
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Google
                </Button>
                <Button variant="outline" size="sm" onClick={handleAddToAppleCalendar} className="flex-1 border-gray-100 text-gray-700 hover:bg-gray-50 rounded-xl h-10 font-bold text-[10px] uppercase tracking-wider">
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Apple
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Propose Alternative Dialog */}
      <Dialog open={showAlternativeDialog} onOpenChange={setShowAlternativeDialog}>
        <DialogContent className="rounded-[32px] p-8 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-gray-900">Propose Alternative</DialogTitle>
            <DialogDescription className="text-gray-500 pt-2 leading-relaxed font-bold">The requested time doesn&apos;t work. Suggest a better time for you.</DialogDescription>
            <p className="text-xs font-black text-[#434c9d] uppercase tracking-wider">You will be notified by email when the buyer responds.</p>
          </DialogHeader>
          <div className="space-y-6 py-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">New Date</Label>
                <Input type="date" value={alternativeDate} onChange={(e) => setAlternativeDate(e.target.value)} min={new Date().toISOString().split("T")[0]} className="rounded-2xl bg-gray-50/50 border-gray-100 h-12 font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">New Time</Label>
                <Input type="time" value={alternativeTime} onChange={(e) => setAlternativeTime(e.target.value)} className="rounded-2xl bg-gray-50/50 border-gray-100 h-12 font-bold" />
              </div>
            </div>
            <div className="flex flex-col gap-3 pt-4">
              <Button onClick={handleProposeAlternative} disabled={isSubmitting || !alternativeDate || !alternativeTime} className="w-full bg-[#434c9d] hover:bg-[#434c9d]/90 rounded-2xl h-14 font-black shadow-lg shadow-[#434c9d]/20">Propose New Time</Button>
              <Button onClick={handleRejectWithoutAlternative} disabled={isSubmitting} variant="ghost" className="w-full text-red-500 hover:bg-red-50 rounded-2xl h-12 font-black">Reject Without Alternative</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mark Complete Confirmation */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="rounded-[32px] p-8 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-gray-900">Mark service as completed?</DialogTitle>
            <DialogDescription className="text-gray-500 pt-2 leading-relaxed font-bold">Confirm once the service has actually been completed. This unlocks earnings for withdrawal.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Button variant="outline" className="sm:flex-1 rounded-2xl h-12 font-black" onClick={() => setShowCompleteDialog(false)}>Not yet</Button>
            <Button className="sm:flex-1 rounded-2xl bg-[#434c9d] hover:bg-[#434c9d]/90 h-12 font-black shadow-lg shadow-[#434c9d]/20" onClick={async () => { setShowCompleteDialog(false); await onStatusUpdate(booking.id, "completed"); }}>
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
    if (urlParams.get("stripe_success") === "true") {
      toast({ title: "Account connected!", description: "Your Stripe Connect account is ready." });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (urlParams.get("stripe_error")) {
      toast({ title: "Setup failed", description: "Error setting up payment account.", variant: "destructive" });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const isBookingExpired = (booking: Booking): boolean => {
    try {
      if (booking.status === "alternative_proposed" && booking.alternative_date && booking.alternative_time) {
        return new Date(`${booking.alternative_date}T${booking.alternative_time}`) < new Date();
      }
      return new Date(`${booking.requested_date}T${booking.requested_time}`) < new Date();
    } catch { return false; }
  };

  const fetchEverything = async (forceRefresh = false) => {
    if (!user) return;
    try {
      setLoading(true);
      const fetchOptions = forceRefresh ? { cache: "no-store" as RequestCache } : {};
      const [sRes, bRes, eRes, qRes, stripeRes] = await Promise.all([
        fetch("/api/services", fetchOptions),
        fetch("/api/bookings", fetchOptions),
        fetch("/api/earnings", fetchOptions),
        fetch("/api/quotes/request?role=provider&status=pending,quoted", fetchOptions),
        fetch("/api/stripe/connect/setup", fetchOptions),
      ]);

      if (sRes.ok) setServices((await sRes.json()).services ?? []);
      if (bRes.ok) {
        const bData = await bRes.json();
        if (bData.success) {
          const allIncoming = bData.incoming || [];
          const activeIncoming = allIncoming.filter((b: Booking) => {
            if (isAwaitingPaymentStatus(b.status)) return true;
            if (b.status === "pending" || b.status === "alternative_proposed") return !isBookingExpired(b);
            return true;
          });
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
    } finally { setCancellingQuoteRequest(null); }
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
    if (!response.ok || !data?.success) throw new Error(data?.error || "Failed to update quote request");
  };

  const handleBookingStatusUpdate = async (bookingId: string, newStatus: string, alternativeDate?: string, alternativeTime?: string) => {
    const updateBookingInState = (status: string) => {
      const updateBooking = (booking: Booking) => booking.id === bookingId ? { ...booking, status } : booking;
      setPendingBookings(prev => {
        const updated = prev.map(updateBooking);
        if (!["pending", "awaiting_payment", "confirmed", "alternative_proposed"].includes(status)) {
          return updated.filter(b => b.id !== bookingId);
        }
        return updated;
      });
      setScheduledBookings(prev => {
        const booking = [...pendingBookings, ...prev].find(b => b.id === bookingId);
        if (status === "paid" && booking) {
          const exists = prev.some(b => b.id === bookingId);
          if (!exists) return [...prev, { ...booking, status }];
        }
        if (status === "completed") return prev.filter(b => b.id !== bookingId);
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

    updateBookingInState(newStatus);
    try {
      const body: any = { status: newStatus };
      if (alternativeDate && alternativeTime) { body.alternative_date = alternativeDate; body.alternative_time = alternativeTime; }
      const res = await fetch(`/api/bookings/${bookingId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { await fetchEverything(true); throw new Error("Failed to update booking"); }
      toast({ title: "Booking updated", description: `Booking ${newStatus} successfully.` });
      await fetchEverything(true);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
      throw e;
    }
  };

  const openSendQuoteDialog = (quoteRequest: any) => {
    setSendQuoteState({ quoteRequestId: quoteRequest.id, price: "", notes: "", estimatedDurationHours: "" });
  };

  const handleSubmitSendQuote = async () => {
    if (!sendQuoteState) return;
    const price = parseFloat(sendQuoteState.price);
    if (!Number.isFinite(price) || price <= 0) {
      toast({ title: "Enter a valid price", description: "Please enter how much you will charge (greater than $0).", variant: "destructive" });
      return;
    }
    let estimatedDuration: number | undefined;
    if (sendQuoteState.estimatedDurationHours.trim()) {
      const n = parseFloat(sendQuoteState.estimatedDurationHours);
      if (!Number.isFinite(n) || n <= 0) {
        toast({ title: "Invalid duration", description: "Estimated duration must be a positive number of hours.", variant: "destructive" });
        return;
      }
      estimatedDuration = Math.round(n * 60);
    }
    try {
      setProcessingQuoteRequestId(sendQuoteState.quoteRequestId);
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quote_request_id: sendQuoteState.quoteRequestId, price, notes: sendQuoteState.notes.trim() || undefined, estimated_duration: estimatedDuration }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to send quote");
      setSendQuoteState(null);
      toast({ title: "Quote sent", description: "The customer has been notified and can accept or decline." });
      await fetchEverything(true);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to send quote", variant: "destructive" });
    } finally { setProcessingQuoteRequestId(null); }
  };

  const openProposeTimeForQuoteRequest = (quoteRequest: any) => {
    setProposeTimeState({ quoteRequestId: quoteRequest.id, alternativeDate: "", alternativeTime: "" });
  };

  const handleSubmitQuoteRequestAlternative = async () => {
    if (!proposeTimeState) return;
    if (!proposeTimeState.alternativeDate || !proposeTimeState.alternativeTime) {
      toast({ title: "Missing Information", description: "Please provide both an alternative date and time.", variant: "destructive" });
      return;
    }
    try {
      setProcessingQuoteRequestId(proposeTimeState.quoteRequestId);
      await patchQuoteRequest(proposeTimeState.quoteRequestId, { status: "quoted", requested_date: proposeTimeState.alternativeDate, requested_time: proposeTimeState.alternativeTime });
      setProposeTimeState(null);
      toast({ title: "Alternative Proposed", description: "The customer has been notified of the new time." });
      await fetchEverything(true);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to propose alternative time", variant: "destructive" });
    } finally { setProcessingQuoteRequestId(null); }
  };

  const formatQuoteDate = (dateString: string) => {
    const [year, month, day] = dateString.split("-").map(Number);
    const localDate = new Date(year, (month || 1) - 1, day || 1);
    return localDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  };

  const formatQuoteTime = (timeString: string) =>
    new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

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
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-100">
            <User className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Setup Profile</h3>
          <p className="text-gray-500 mb-6 text-sm leading-relaxed">Complete your profile to access your Booking Dashboard.</p>
          <Button onClick={() => window.location.href = "/profile"} className="w-full bg-[#434c9d] hover:bg-[#434c9d]/90 rounded-xl h-12 font-bold">Go to Profile</Button>
        </div>
      </DashboardLayout>
    );
  }

  const tabs = [
    { value: "pending", label: "Pending", count: pendingBookings.length + quoteRequests.length, needsAttention: pendingBookings.some(b => b.status === "pending") || quoteRequests.length > 0 },
    { value: "scheduled", label: "Scheduled", count: scheduledBookings.length, needsAttention: scheduledBookings.length > 0 },
    { value: "completed", label: "History", count: completedBookings.length, needsAttention: false },
  ];

  return (
    <DashboardLayout user={user}>
      <div className="max-w-6xl mx-auto px-4 pt-10 lg:pt-16 pb-12">

        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 mb-16">
          <div className="space-y-5">
            <h1 className="text-5xl lg:text-6xl font-black text-gray-900 tracking-tight leading-none">
              My Teen <span className="text-[#434c9d]">Hustle</span>
            </h1>
            <p className="text-xl text-gray-500 font-bold max-w-2xl leading-relaxed">
              Managing your hustle has never been easier. Track requests, schedule jobs, and watch your earnings grow.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="/my-services">
              <Button variant="outline" className="rounded-2xl border-gray-100 text-gray-700 hover:bg-gray-50 h-14 px-8 font-black shadow-sm transition-all hover:-translate-y-0.5">
                <Star className="w-5 h-5 mr-2 text-yellow-400 fill-yellow-400" /> My Services
              </Button>
            </Link>
            <Link href="/earnings">
              <Button className="rounded-2xl bg-[#434c9d] hover:bg-[#434c9d]/90 text-white h-14 px-8 font-black shadow-xl shadow-[#434c9d]/20 transition-all hover:-translate-y-0.5">
                <Wallet className="w-5 h-5 mr-2" /> View Earnings
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Row - Minimal Style */}
        <div className="mb-16 p-8 rounded-[40px] bg-white border border-gray-100 shadow-sm overflow-x-auto custom-scrollbar">
          <div className="flex items-center justify-between min-w-[800px] lg:min-w-0 gap-8">
            {[
              { label: "Total Earned", value: `$${earningsStats.totalEarned.toFixed(2)}`, icon: DollarSign, color: "text-[#434c9d]", bg: "bg-[#434c9d]/10" },
              { label: "This Week", value: `$${earningsStats.thisWeekEarned.toFixed(2)}`, icon: TrendingUp, color: "text-[#96cbc3]", bg: "bg-[#96cbc3]/10" },
              { label: "Jobs Completed", value: completedBookings.length, icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-50" },
              { label: "Upcoming Jobs", value: scheduledBookings.length, icon: Calendar, color: "text-blue-500", bg: "bg-blue-50" },
            ].map((stat, i) => (
              <React.Fragment key={i}>
                <div className="flex items-center gap-5 group">
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300", stat.bg)}>
                    <stat.icon className={cn("w-7 h-7", stat.color)} />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-gray-900 leading-none">{stat.value}</div>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1.5">{stat.label}</div>
                  </div>
                </div>
                {i < 3 && <div className="h-12 w-px bg-gray-100 hidden lg:block" />}
              </React.Fragment>
            ))}
          </div>
        </div>


        {/* Cancellation Policy */}
        <div className="mb-12 rounded-[32px] border border-[#ff725a]/20 bg-[#ff725a]/5 p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#ff725a] flex items-center justify-center text-white shrink-0 shadow-lg shadow-[#ff725a]/20">
            <AlertCircle className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-gray-700 leading-relaxed">
            <span className="text-[#ff725a]">Pro Tip:</span> If you need to cancel, please do so at least 24 hours in advance. Providing great reliability helps you get more bookings!
          </p>
        </div>

        {/* Bookings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8 mb-10">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Your bookings</h2>
            <TabsList className="bg-gray-100/50 p-2 rounded-[24px] h-auto border border-gray-100 backdrop-blur-sm">
              {tabs.map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={cn(
                    "rounded-[18px] font-black text-[11px] uppercase tracking-widest px-6 py-3 data-[state=active]:bg-[#434c9d] data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-[#434c9d]/20 transition-all relative overflow-visible",
                    tab.needsAttention && "pr-10"
                  )}
                >
                  {tab.label}
                  <span className={cn(
                    "ml-2 px-2 py-0.5 rounded-lg text-[10px] font-black",
                    activeTab === tab.value ? "bg-white/20 text-white" : "bg-gray-200/60 text-gray-500"
                  )}>{tab.count}</span>
                  {tab.needsAttention && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#ff725a] border-2 border-white animate-bounce" />
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Pending Tab Content */}
          <TabsContent value="pending" className="mt-0 outline-none">
            {(pendingBookings.length > 0 || quoteRequests.length > 0) ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {pendingBookings.map(b => (
                  <BookingCard key={b.id} booking={b} onStatusUpdate={handleBookingStatusUpdate} />
                ))}
                {quoteRequests.map((qr: any) => (
                  <div key={qr.id} className="group relative bg-white rounded-[32px] overflow-hidden border-2 border-dashed border-[#96cbc3]/40 hover:border-[#96cbc3] transition-all duration-500 flex flex-col h-full hover:shadow-2xl hover:shadow-[#96cbc3]/10">
                    {/* Decorative accent */}
                    <div className="absolute top-0 left-0 w-2 h-full bg-[#96cbc3] opacity-40" />

                    <div className="p-8 pb-6 flex-1">
                      {(() => {
                        const refImageUrls = getQuoteReferenceImageUrls(qr);
                        return refImageUrls.length > 0 ? (
                          <div className="mb-6 rounded-[24px] overflow-hidden border border-gray-100 relative group/img">
                            <img src={refImageUrls[0]} alt="Quote request reference" className="w-full h-48 object-cover transition-transform duration-700 group-hover/img:scale-110" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity" />
                            {refImageUrls.length > 1 && (
                              <span className="absolute bottom-4 right-4 rounded-xl bg-black/70 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 border border-white/20">
                                +{refImageUrls.length - 1} More
                              </span>
                            )}
                          </div>
                        ) : null;
                      })()}

                      <div className="flex justify-between items-start gap-4 mb-6">
                        <div className="space-y-3 flex-1 min-w-0">
                          <Badge className="bg-[#96cbc3]/10 text-[#96cbc3] border-none text-[10px] font-black uppercase tracking-widest px-4 py-2 shadow-sm">
                            New Quote Request
                          </Badge>
                          <div>
                            <h3 className="text-xl font-black text-gray-900 group-hover:text-[#434c9d] transition-colors leading-tight">
                              {qr.services?.title}
                            </h3>
                            <div className="flex items-center gap-2 mt-2">
                              <div className="w-8 h-8 rounded-full bg-[#96cbc3]/10 flex items-center justify-center text-[#96cbc3] border-2 border-white shadow-sm">
                                <User className="w-4 h-4" />
                              </div>
                              <p className="text-sm text-gray-500 font-bold">
                                From <span className="text-[#434c9d] font-black">{qr.profiles?.first_name}</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {(qr.requested_date || qr.requested_time || qr.service_address) && (
                        <div className="mb-6 p-5 bg-gray-50/50 rounded-[24px] border border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {qr.requested_date && (
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-[#434c9d] shrink-0 border border-blue-100/50">
                                <Calendar className="w-4 h-4" />
                              </div>
                              <span className="text-sm font-black text-gray-900">{formatQuoteDate(qr.requested_date)}</span>
                            </div>
                          )}
                          {qr.requested_time && (
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 shrink-0 border border-orange-100/50">
                                <Clock className="w-4 h-4" />
                              </div>
                              <span className="text-sm font-black text-gray-900">{formatQuoteTime(qr.requested_time)}</span>
                            </div>
                          )}
                          {qr.service_address && (
                            <div className="flex items-center gap-3 sm:col-span-2">
                              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center text-red-500 shrink-0 border border-red-100/50">
                                <MapPin className="w-4 h-4" />
                              </div>
                              <span className="text-sm font-black text-gray-900 truncate">{qr.service_address}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {qr.special_instructions && (
                        <div className="mb-6 p-5 bg-[#96cbc3]/5 rounded-[24px] border border-dashed border-[#96cbc3]/20">
                          <p className="text-sm text-gray-500 leading-relaxed font-bold italic">&quot;{qr.special_instructions}&quot;</p>
                        </div>
                      )}

                      {Array.isArray(qr.quotes) && qr.quotes.length > 0 ? (
                        <div className="p-6 bg-[#96cbc3]/10 rounded-[28px] border border-[#96cbc3]/30 shadow-sm">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <p className="text-[10px] font-black text-[#96cbc3] uppercase tracking-widest mb-1">Your Proposed Quote</p>
                              <p className="text-3xl font-black text-gray-900">${Number(qr.quotes[0].price).toFixed(2)}</p>
                            </div>
                            {qr.quotes[0].estimated_duration != null && (
                              <div className="text-right">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Est. Time</p>
                                <p className="text-sm font-black text-gray-700">{formatHours(qr.quotes[0].estimated_duration)}</p>
                              </div>
                            )}
                          </div>
                          {qr.quotes[0].notes && (
                            <p className="text-sm text-gray-600 font-bold mb-3 leading-relaxed bg-white/50 p-3 rounded-xl border border-white/50">{qr.quotes[0].notes}</p>
                          )}
                          <div className="flex items-center gap-2 text-xs font-bold text-[#96cbc3]">
                            <Timer className="w-3.5 h-3.5 animate-pulse" />
                            <span>Awaiting customer response...</span>
                          </div>
                        </div>
                      ) : (
                        <div className="mb-6 rounded-[24px] border border-blue-100 bg-blue-50/50 p-5 flex items-start gap-4">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                            <Info className="w-5 h-5" />
                          </div>
                          <p className="text-xs font-bold text-blue-900 leading-relaxed pt-1">
                            Review the details and send your quote. After you send it and they pay, it&apos;ll move to your Scheduled tab.
                          </p>
                        </div>
                      )}
                    </div>

                    {(qr.status === "pending" || qr.status === "quoted") && (
                      <div className="p-8 pt-0 mt-auto">
                        <div className="flex flex-col gap-3 pt-6 border-t border-gray-100/50">
                          {!qr.quotes?.length && (
                            <Button size="sm" onClick={() => openSendQuoteDialog(qr)} disabled={processingQuoteRequestId === qr.id} className="w-full bg-green-500 hover:bg-green-600 text-white rounded-2xl h-12 font-black shadow-lg shadow-green-500/20 transition-all hover:-translate-y-0.5">
                              <DollarSign className="w-4 h-4 mr-2" /> Send Your Quote
                            </Button>
                          )}
                          <div className="flex gap-3">
                            <Button variant="outline" size="sm" onClick={() => openProposeTimeForQuoteRequest(qr)} disabled={processingQuoteRequestId === qr.id} className="flex-1 text-gray-700 border-gray-100 hover:bg-gray-50 rounded-2xl h-12 font-black transition-all">
                              <CalendarPlus className="w-4 h-4 mr-2" /> Change Time
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDenyQuoteRequest(qr.id)} disabled={cancellingQuoteRequest === qr.id || processingQuoteRequestId === qr.id} className="flex-1 text-red-500 border-red-100 hover:bg-red-50 rounded-2xl h-12 font-black transition-all">
                              {cancellingQuoteRequest === qr.id ? (
                                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Denying...</>
                              ) : (
                                <><XCircle className="w-4 h-4 mr-2" /> Decline</>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-24 text-center bg-white rounded-[40px] border-2 border-dashed border-gray-100 shadow-sm">
                <div className="w-24 h-24 bg-gray-50 rounded-[32px] flex items-center justify-center mx-auto mb-8 transition-transform hover:scale-110 duration-500">
                  <Info className="w-12 h-12 text-gray-200" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-3">No pending requests yet!</h3>
                <p className="text-lg text-gray-400 font-bold max-w-sm mx-auto">
                  When customers request your services or ask for quotes, they&apos;ll show up right here.
                </p>
              </div>
            )}
          </TabsContent>


          {/* Scheduled Tab */}
          <TabsContent value="scheduled" className="mt-0 outline-none">
            <div className="space-y-8">
              {servicesNeedingCompletion > 0 && (
                <div className="bg-[#ff725a]/10 border border-[#ff725a]/20 rounded-[32px] p-8 flex items-center gap-6 shadow-sm">
                  <div className="p-4 bg-[#ff725a] rounded-2xl text-white shadow-lg shadow-[#ff725a]/20 shrink-0">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="text-xl font-black text-gray-900">{servicesNeedingCompletion} service{servicesNeedingCompletion !== 1 ? "s" : ""} finished!</div>
                    <p className="text-sm text-gray-600 font-bold mt-1">Don&apos;t forget to mark them as completed to receive your payment and reviews.</p>
                  </div>
                </div>
              )}
              {scheduledBookings.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {scheduledBookings.map(b => (
                    <BookingCard key={b.id} booking={b} onStatusUpdate={handleBookingStatusUpdate} />
                  ))}
                </div>
              ) : (
                <div className="py-24 text-center bg-white rounded-[40px] border-2 border-dashed border-gray-100 shadow-sm">
                  <div className="w-24 h-24 bg-gray-50 rounded-[32px] flex items-center justify-center mx-auto mb-8 transition-transform hover:scale-110 duration-500">
                    <Calendar className="w-12 h-12 text-gray-200" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-3">Nothing scheduled yet</h3>
                  <p className="text-lg text-gray-400 font-bold max-w-sm mx-auto">
                    Once a customer pays for a service, it will appear here. Get ready to hustle!
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="completed" className="mt-0 outline-none">
            {completedBookings.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 opacity-90">
                {completedBookings.map(b => (
                  <BookingCard key={b.id} booking={b} onStatusUpdate={handleBookingStatusUpdate} />
                ))}
              </div>
            ) : (
              <div className="py-24 text-center bg-white rounded-[40px] border-2 border-dashed border-gray-100 shadow-sm">
                <div className="w-24 h-24 bg-gray-50 rounded-[32px] flex items-center justify-center mx-auto mb-8 transition-transform hover:scale-110 duration-500">
                  <CheckCircle className="w-12 h-12 text-gray-200" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-3">No history yet</h3>
                <p className="text-lg text-gray-400 font-bold max-w-sm mx-auto">
                  Your completed jobs and achievements will be archived here. Time to start your first hustle!
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Propose Time Dialog (Quote Requests) */}
      <Dialog open={!!proposeTimeState} onOpenChange={(open) => { if (!open) setProposeTimeState(null); }}>
        <DialogContent className="rounded-[32px] p-8 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-gray-900">Propose a different time</DialogTitle>
            <DialogDescription className="text-gray-500 pt-2 leading-relaxed font-bold">Suggest a new date and time for this quote request.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">New Date</Label>
              <Input type="date" min={new Date().toISOString().split("T")[0]} value={proposeTimeState?.alternativeDate ?? ""} onChange={(e) => setProposeTimeState(prev => prev ? { ...prev, alternativeDate: e.target.value } : prev)} className="rounded-2xl bg-gray-50/50 border-gray-100 h-12 font-bold" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">New Time</Label>
              <Input type="time" value={proposeTimeState?.alternativeTime ?? ""} onChange={(e) => setProposeTimeState(prev => prev ? { ...prev, alternativeTime: e.target.value } : prev)} className="rounded-2xl bg-gray-50/50 border-gray-100 h-12 font-bold" />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <Button variant="outline" className="sm:flex-1 rounded-2xl h-12 font-black" onClick={() => setProposeTimeState(null)}>Cancel</Button>
            <Button className="sm:flex-1 rounded-2xl bg-[#434c9d] hover:bg-[#434c9d]/90 h-12 font-black shadow-lg shadow-[#434c9d]/20" onClick={handleSubmitQuoteRequestAlternative} disabled={!proposeTimeState?.alternativeDate || !proposeTimeState?.alternativeDate || processingQuoteRequestId === proposeTimeState?.quoteRequestId}>
              {processingQuoteRequestId === proposeTimeState?.quoteRequestId ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
              ) : "Propose New Time"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Quote Dialog */}
      <Dialog open={!!sendQuoteState} onOpenChange={(open) => { if (!open) setSendQuoteState(null); }}>
        <DialogContent className="rounded-[32px] p-8 border-none shadow-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-gray-900">Send your quote</DialogTitle>
            <DialogDescription className="text-gray-500 pt-2 leading-relaxed font-bold">Enter how much you will charge. The customer will get an email and can accept to book and pay.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 pt-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Your price (USD)</Label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#434c9d]/10 rounded-lg flex items-center justify-center text-[#434c9d]">
                  <DollarSign className="w-4 h-4" />
                </div>
                <Input type="number" min={0.01} step={0.01} placeholder="0.00" value={sendQuoteState?.price ?? ""} onChange={(e) => setSendQuoteState(prev => prev ? { ...prev, price: e.target.value } : prev)} className="rounded-2xl bg-gray-50/50 border-gray-100 h-14 pl-12 font-black text-lg focus:bg-white transition-colors" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Estimated duration (hours, optional)</Label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 bg-orange-50 rounded-lg flex items-center justify-center text-orange-600">
                  <Clock className="w-4 h-4" />
                </div>
                <Input type="number" min={0.25} step={0.25} placeholder="e.g. 1.5" value={sendQuoteState?.estimatedDurationHours ?? ""} onChange={(e) => setSendQuoteState(prev => prev ? { ...prev, estimatedDurationHours: e.target.value } : prev)} className="rounded-2xl bg-gray-50/50 border-gray-100 h-14 pl-12 font-black focus:bg-white transition-colors" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Notes (optional)</Label>
              <Textarea placeholder="Anything the customer should know about what's included" value={sendQuoteState?.notes ?? ""} onChange={(e) => setSendQuoteState(prev => prev ? { ...prev, notes: e.target.value } : prev)} className="rounded-2xl bg-gray-50/50 border-gray-100 min-h-[120px] p-4 font-bold resize-none focus:bg-white transition-colors" />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <Button variant="outline" className="sm:flex-1 rounded-2xl h-12 font-black" onClick={() => setSendQuoteState(null)}>Cancel</Button>
            <Button className="sm:flex-1 rounded-2xl bg-green-500 hover:bg-green-600 h-12 font-black text-white shadow-lg shadow-green-500/20" onClick={handleSubmitSendQuote} disabled={processingQuoteRequestId === sendQuoteState?.quoteRequestId}>
              {processingQuoteRequestId === sendQuoteState?.quoteRequestId ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
              ) : "Submit quote"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
}
