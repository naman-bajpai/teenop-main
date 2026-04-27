"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Clock,
  MapPin,
  MessageCircle,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  CreditCard,
  TrendingUp,
  Eye,
  ArrowRight,
  DollarSign,
  User,
  Sparkles,
  FileText,
  Star,
  Info
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useUser } from "@/hooks/useUser";
import { Booking } from "@/types/booking";
import { PaymentModal } from "@/components/payments/PaymentModal";
import { useToast } from "@/components/ui/use-toast";
import ReviewForm from "@/components/reviews/ReviewForm";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// Status configuration helper function
type StatusConfig = {
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
  label: string;
};

function getStatusConfig(status: string): StatusConfig {
  const configs: Record<string, StatusConfig> = {
    pending: {
      color: "text-yellow-700",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
      icon: <AlertCircle className="w-4 h-4" />,
      label: "Pending"
    },
    confirmed: {
      color: "text-blue-700",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      icon: <CheckCircle className="w-4 h-4" />,
      label: "Confirmed"
    },
    in_progress: {
      color: "text-purple-700",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      icon: <Loader2 className="w-4 h-4 animate-spin" />,
      label: "In Progress"
    },
    completed: {
      color: "text-green-700",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      icon: <CheckCircle className="w-4 h-4" />,
      label: "Completed"
    },
    paid: {
      color: "text-emerald-700",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
      icon: <CheckCircle className="w-4 h-4" />,
      label: "Paid"
    },
    cancelled: {
      color: "text-gray-700",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      icon: <XCircle className="w-4 h-4" />,
      label: "Cancelled"
    },
    rejected: {
      color: "text-red-700",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      icon: <XCircle className="w-4 h-4" />,
      label: "Rejected"
    },
    alternative_proposed: {
      color: "text-orange-700",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
      icon: <Clock className="w-4 h-4" />,
      label: "Alternative Proposed"
    },
    expired: {
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      icon: <Clock className="w-4 h-4" />,
      label: "Expired"
    }
  };

  return configs[status] || configs.pending;
}

export default function MyRequestsPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [quoteRequests, setQuoteRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<Booking | null>(null);
  const [completedBookingsForReview, setCompletedBookingsForReview] = useState<Booking[]>([]);
  const [openingQuoteMessageId, setOpeningQuoteMessageId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("pending");
  const quoteMessageNavInFlight = useRef(false);

  useEffect(() => {
    if (user) {
      if (user.role === "teen") {
        router.replace("/my-teen-hustle");
        return;
      }
      fetchBookings();
    }
  }, [user, router]);

  // Refetch when tab becomes visible so parent sees updated status after paying (e.g. webhook updated booking)
  useEffect(() => {
    if (!user) return;
    const onFocus = () => fetchBookings(true);
    const onVisibility = () => { if (document.visibilityState === "visible") fetchBookings(true); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [user]);

  // Helper function to check if booking is expired
  const isBookingExpired = (booking: Booking): boolean => {
    try {
      // For alternative_proposed bookings, check the alternative date/time instead
      if (booking.status === "alternative_proposed" && booking.alternative_date && booking.alternative_time) {
        const alternativeDateTime = new Date(`${booking.alternative_date}T${booking.alternative_time}`);
        const now = new Date();
        return alternativeDateTime < now;
      }
      // For other bookings, check the requested date/time
      const bookingDateTime = new Date(`${booking.requested_date}T${booking.requested_time}`);
      const now = new Date();
      return bookingDateTime < now;
    } catch {
      return false;
    }
  };

  const fetchBookings = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      // Use cache: 'no-store' when forceRefresh is true to bypass browser cache
      const fetchOptions = forceRefresh ? { cache: 'no-store' as RequestCache } : {};
      const response = await fetch("/api/bookings", fetchOptions);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to fetch bookings");
      }

      const requestedBookings = result.myRequests || [];
      setBookings(requestedBookings);

      // Fetch completed bookings that need reviews (only when teen has marked as completed)
      const completedForReview = requestedBookings.filter((booking: Booking) =>
        booking.status === "completed"
      );

      // Check which ones already have reviews
      const bookingsWithReviewStatus = await Promise.all(
        completedForReview.map(async (booking: Booking) => {
          try {
            const reviewRes = await fetch(`/api/reviews?booking_id=${booking.id}`, fetchOptions);
            if (reviewRes.ok) {
              const reviewData = await reviewRes.json();
              return {
                ...booking,
                hasReview: reviewData.reviews && reviewData.reviews.length > 0
              };
            }
            return { ...booking, hasReview: false };
          } catch {
            return { ...booking, hasReview: false };
          }
        })
      );

      setCompletedBookingsForReview(bookingsWithReviewStatus.filter((b: any) => !b.hasReview));

      // Fetch quote requests for this customer
      try {
        const quoteRes = await fetch("/api/quotes/request?role=customer", fetchOptions);
        if (quoteRes.ok) {
          const quoteData = await quoteRes.json();
          if (quoteData.success) {
            setQuoteRequests(quoteData.quote_requests || []);
          }
        }
      } catch (quoteError) {
        console.error("Error fetching quote requests:", quoteError);
      }
    } catch (err: any) {
      console.error("Error fetching bookings:", err);
      setError(err.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptAlternative = async (bookingId: string, alternativeDate: string, alternativeTime: string) => {
    try {
      setUpdating(bookingId);

      // Update booking with alternative date/time and set status to confirmed
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "confirmed",
          requested_date: alternativeDate,
          requested_time: alternativeTime
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to accept alternative time");
      }

      // Fetch the updated booking with cache bypass
      const bookingResponse = await fetch(`/api/bookings/${bookingId}`, { cache: 'no-store' as RequestCache });
      if (bookingResponse.ok) {
        const bookingResult = await bookingResponse.json();
        if (bookingResult.success && bookingResult.booking) {
          setSelectedBooking({ ...bookingResult.booking, status: "confirmed" as any });
          setPaymentModalOpen(true);
        }
      }

      // Refresh bookings list with cache bypass
      await fetchBookings(true);

      toast({
        title: "Alternative Time Accepted",
        description: "Please complete payment to confirm the booking.",
      });
    } catch (err: any) {
      console.error("Error accepting alternative time:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to accept alternative time. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      setUpdating(bookingId);
      console.log(`Updating booking ${bookingId} to status: ${newStatus}`);

      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();
      console.log(`API response for booking ${bookingId}:`, { ok: response.ok, success: result.success, result });

      if (!response.ok || !result.success) {
        // Revert optimistic update on failure
        await fetchBookings(true);
        const errorMessage = result.error || "Failed to update booking";
        console.error(`Failed to update booking ${bookingId}:`, errorMessage);
        throw new Error(errorMessage);
      }

      // Optimistic UI update after successful API call
      setBookings(prev =>
        prev.map(booking =>
          booking.id === bookingId
            ? { ...booking, status: newStatus as any, updated_at: new Date().toISOString() }
            : booking
        )
      );

      // Fetch fresh data to ensure consistency
      await fetchBookings(true);

      toast({
        title: "Success",
        description: `Booking ${newStatus} successfully.`,
      });
    } catch (err: any) {
      console.error("Error updating booking:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to update booking",
        variant: "destructive",
      });
      // Revert on error by fetching fresh data
      await fetchBookings(true);
    } finally {
      setUpdating(null);
    }
  };

  const handleMessageUser = async (booking: Booking) => {
    try {
      // Check if we have the booking ID
      if (!booking.id) {
        toast({
          title: "Error",
          description: "Booking information not available",
          variant: "destructive",
        });
        return;
      }

      // Navigate to messages page with booking_id to automatically open the conversation
      // The messages page will handle finding or creating the conversation based on the booking
      router.push(`/messages?booking_id=${booking.id}`);

      toast({
        title: "Opening Messages",
        description: "Your conversation with the service provider will appear in the messages page.",
      });
    } catch (error) {
      console.error("Error opening messages:", error);
      toast({
        title: "Error",
        description: "Failed to open messages. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleMessageQuoteRequest = async (qr: { id: string; booking_id?: string | null }) => {
    if (quoteMessageNavInFlight.current) return;
    quoteMessageNavInFlight.current = true;
    setOpeningQuoteMessageId(qr.id);
    try {
      let bookingId = qr.booking_id ?? null;
      if (!bookingId) {
        const response = await fetch(`/api/quotes/request/${qr.id}/booking`, { cache: "no-store" });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.booking_id) bookingId = data.booking_id;
        }
      }
      if (bookingId) {
        router.push(`/messages?booking_id=${bookingId}`);
        toast({
          title: "Opening Messages",
          description: "Your conversation with the provider will open in messages.",
        });
      } else {
        router.push("/messages");
        toast({
          title: "Messages",
          description: "Select your conversation from the list if it does not open automatically.",
        });
      }
    } catch (e) {
      console.error("Error opening quote request messages:", e);
      router.push("/messages");
      toast({
        title: "Error",
        description: "Failed to open messages. Please try again.",
        variant: "destructive",
      });
    } finally {
      quoteMessageNavInFlight.current = false;
      setOpeningQuoteMessageId(null);
    }
  };

  const handleCancelQuoteRequest = async (quoteRequestId: string) => {
    try {
      setUpdating(quoteRequestId);
      const response = await fetch(`/api/quotes/request/${quoteRequestId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "cancelled" }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to cancel quote request");
      }

      // Refresh data
      await fetchBookings(true);

      toast({
        title: "Quote Request Cancelled",
        description: "The quote request has been cancelled successfully.",
      });
    } catch (err: any) {
      console.error("Error cancelling quote request:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to cancel quote request",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  // Helper function to check if quote request is past due
  const isQuoteRequestPastDue = (qr: any): boolean => {
    if (!qr.requested_date || !qr.requested_time) return false;
    try {
      const requestedDateTime = new Date(`${qr.requested_date}T${qr.requested_time}`);
      return requestedDateTime < new Date();
    } catch {
      return false;
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(price);

  const formatDate = (dateString: string) => {
    // Parse YYYY-MM-DD as a local calendar date to avoid timezone day-shift.
    const [year, month, day] = dateString.split("-").map(Number);
    const localDate = new Date(year, (month || 1) - 1, day || 1);
    return localDate.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Filter bookings by status (any request past its requested date goes under Expired)
  const pendingStatuses = (b: Booking) =>
    b.status === "pending" || b.status === "alternative_proposed" || b.status === "confirmed";
  const expiredBookings = bookings.filter(
    (b) => pendingStatuses(b) && isBookingExpired(b)
  );
  const pendingBookings = bookings.filter(
    (b) => pendingStatuses(b) && !isBookingExpired(b)
  );
  const scheduledBookings = bookings.filter((b) => b.status === "paid");
  const completedBookings = bookings.filter((b) => b.status === "completed");
  const cancelledBookings = bookings.filter(
    (b) => b.status === "cancelled" || b.status === "rejected"
  );

  // Filter quote requests by status (only show in pending tab)
  const pendingQuoteRequests = quoteRequests.filter((qr: any) =>
    qr.status === "pending" || qr.status === "quoted"
  );

  /** Payment due or provider offered a new time — show Pending tab attention bubble */
  const pendingTabNeedsAttention = pendingBookings.some(
    (b) =>
      b.status === "confirmed" ||
      (b.status === "alternative_proposed" &&
        Boolean(b.alternative_date && b.alternative_time))
  );

  // Calculate stats
  const totalSpent = bookings
    .filter(booking => booking.status === "paid" || booking.status === "completed")
    .reduce((sum, booking) => sum + booking.total_price, 0);

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-orange-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#434c9d] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your requests...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout user={user}>
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          {/* Page Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 mb-12">
            <div className="space-y-4">
              <h1 className="page-title text-gray-900">
                My Requests
              </h1>
              <p className="text-lg text-gray-500 font-medium max-w-2xl leading-relaxed">
                Track and manage your service bookings and quote requests.
              </p>
              {user?.role === "teen" && (
                <p className="text-sm text-gray-400 font-medium italic">
                  Looking for requests for your own services? Visit the{" "}
                  <Link href="/my-teen-hustle" className="text-[#434c9d] hover:underline font-bold">
                    Booking Dashboard
                  </Link>{" "}
                  page.
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-12 p-6 bg-red-50 border-2 border-red-100 rounded-[32px] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <p className="text-red-700 font-bold">{error}</p>
              </div>
              <Button
                onClick={() => fetchBookings(true)}
                variant="outline"
                className="rounded-xl font-bold border-red-200 text-red-700 hover:bg-red-100"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16">
            {[
              { label: "Pending", value: pendingBookings.length + pendingQuoteRequests.length, icon: AlertCircle, color: "text-yellow-500", bg: "bg-yellow-50", description: "Awaiting action" },
              { label: "Scheduled", value: scheduledBookings.length, icon: Calendar, color: "text-[#434c9d]", bg: "bg-[#434c9d]/10", description: "Upcoming services" },
              { label: "Completed", value: completedBookings.length, icon: CheckCircle, color: "text-[#96cbc3]", bg: "bg-[#96cbc3]/10", description: "Services delivered" },
            ].map((stat, i) => (
              <div key={i} className="bg-white p-8 rounded-[32px] border border-gray-100 flex items-center gap-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center shrink-0", stat.bg)}>
                  <stat.icon className={cn("w-8 h-8", stat.color)} />
                </div>
                <div>
                  <div className="text-3xl font-black text-gray-900 leading-tight">{stat.value}</div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-1">{stat.label}</div>
                  <div className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{stat.description}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mb-12 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-sm font-semibold text-amber-900 leading-relaxed">
              If you need to cancel, please do so at least 24 hours in advance to receive a full refund. If the teen cancels, you will also receive a full automatic refund within 5 days.
            </p>
          </div>

          {/* Tip, Rate, and Review Section */}
          {completedBookingsForReview.length > 0 && (
            <div className="mb-16 relative overflow-hidden bg-white rounded-[40px] border-2 border-[#434c9d]/10 p-8 shadow-sm hover:shadow-xl transition-all duration-500">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#434c9d]/5 rounded-full -mr-32 -mt-32 blur-3xl" />
              <div className="relative flex flex-col lg:flex-row items-center gap-8">
                <div className="w-20 h-20 bg-[#434c9d]/10 rounded-[24px] flex items-center justify-center shrink-0">
                  <Star className="w-10 h-10 text-[#434c9d]" />
                </div>
                <div className="flex-1 text-center lg:text-left">
                  <h2 className="text-2xl font-black text-gray-900 mb-2">
                    Tip & Review Your Recent Services
                  </h2>
                  <p className="text-gray-500 font-medium leading-relaxed max-w-2xl">
                    Support your teen provider by sharing your experience. Your feedback helps the entire community!
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-3 shrink-0">
                  {completedBookingsForReview.slice(0, 2).map((booking: any) => (
                    <Button
                      key={booking.id}
                      onClick={() => {
                        setSelectedBookingForReview(booking);
                        setReviewModalOpen(true);
                      }}
                      className="bg-[#434c9d] hover:bg-[#434c9d]/90 text-white rounded-2xl px-6 h-12 font-black shadow-lg shadow-[#434c9d]/20 transition-all active:scale-95"
                    >
                      Review {booking.service?.title}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-6 mb-10 pb-6 border-b border-gray-100">
              <TabsList className="bg-gray-100/50 p-1.5 rounded-2xl h-auto flex flex-wrap justify-center">
                {[
                  { value: "pending", label: "Pending", count: pendingBookings.length + pendingQuoteRequests.length, color: "text-yellow-600" },
                  { value: "expired", label: "Expired", count: expiredBookings.length, color: "text-gray-500" },
                  { value: "scheduled", label: "Scheduled", count: scheduledBookings.length, color: "text-[#434c9d]" },
                  { value: "completed", label: "History", count: completedBookings.length, color: "text-[#96cbc3]" },
                  { value: "cancelled", label: "Cancelled", count: cancelledBookings.length, color: "text-red-500" },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className={cn(
                      "rounded-xl px-6 py-3 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all relative",
                      tab.value === "pending" && pendingTabNeedsAttention && "pr-8"
                    )}
                  >
                    {tab.label}
                    <span className={cn("ml-2 px-2 py-0.5 rounded-lg bg-current/10 opacity-50", tab.color)}>{tab.count}</span>
                    {tab.value === "pending" && pendingTabNeedsAttention && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <div className="mb-8 rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
              <p className="text-sm font-semibold text-gray-700">
                {activeTab === "pending" && "Pending: Booking not yet confirmed, awaiting response from the teen."}
                {activeTab === "expired" && "Expired: Booking request expired due to no response or missed confirmation."}
                {activeTab === "scheduled" && "Scheduled: Payment completed and service is confirmed."}
                {activeTab === "completed" && "History: Past bookings including completed services, reviews, and payments."}
                {activeTab === "cancelled" && "Cancelled: Bookings that were canceled and refunded."}
              </p>
            </div>

            {/* Status-specific tabs */}
            {[
              { value: "pending", bookings: pendingBookings, quoteRequests: pendingQuoteRequests, icon: <AlertCircle className="w-12 h-12" />, title: "No pending requests", description: "All your requests have been processed." },
              { value: "expired", bookings: expiredBookings, quoteRequests: [], icon: <Clock className="w-12 h-12" />, title: "No expired requests", description: "Requests that passed their scheduled date will appear here." },
              { value: "scheduled", bookings: scheduledBookings, quoteRequests: [], icon: <Calendar className="w-12 h-12" />, title: "No scheduled services", description: "Paid services will appear here once payment is completed." },
              { value: "completed", bookings: completedBookings, quoteRequests: [], icon: <CheckCircle className="w-12 h-12" />, title: "No history yet", description: "Your completed services will appear here." },
              { value: "cancelled", bookings: cancelledBookings, quoteRequests: [], icon: <XCircle className="w-12 h-12" />, title: "No cancelled requests", description: "Cancelled requests will appear here." }
            ].map(({ value, bookings: tabBookings, quoteRequests: tabQuoteRequests, icon, title, description }) => (
              <TabsContent key={value} value={value} className="mt-0 outline-none">
                {(tabBookings.length > 0 || tabQuoteRequests.length > 0) ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Regular Bookings */}
                    {tabBookings.map((booking) => {
                      const isExpiredTab = value === "expired";
                      const statusConfig = isExpiredTab ? getStatusConfig("expired") : getStatusConfig(booking.status);
                      return (
                        <BookingCard
                          key={booking.id}
                          booking={booking}
                          statusConfig={statusConfig}
                          updating={updating === booking.id}
                          isExpired={isExpiredTab}
                          onCancel={() => updateBookingStatus(booking.id, "cancelled")}
                          onPay={() => {
                            setSelectedBooking(booking);
                            setPaymentModalOpen(true);
                          }}
                          onComplete={() => updateBookingStatus(booking.id, "completed")}
                          onAcceptAlternative={(bookingId, altDate, altTime) => handleAcceptAlternative(bookingId, altDate, altTime)}
                          onMessage={() => handleMessageUser(booking)}
                          formatPrice={formatPrice}
                          formatDate={formatDate}
                          formatTime={formatTime}
                          toast={toast}
                        />
                      );
                    })}
                    {/* Quote Requests (only in pending tab) */}
                    {value === "pending" && tabQuoteRequests.map((qr: any) => {
                      const pastDue = isQuoteRequestPastDue(qr);
                      return (
                        <div key={qr.id} className="group bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col h-full">
                          <div className="flex justify-between items-start mb-6">
                            <div className="space-y-2">
                              <Badge className="bg-purple-500/10 text-purple-600 border-none text-[10px] font-black uppercase tracking-widest px-3 py-1.5">
                                Quote Request
                              </Badge>
                              <h3 className="text-xl font-black text-gray-900 group-hover:text-[#434c9d] transition-colors line-clamp-1">
                                {qr.services?.title || 'Service'}
                              </h3>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge className={cn(
                                "text-[10px] font-black uppercase tracking-widest px-3 py-1.5 border-none",
                                qr.status === "quoted" ? "bg-blue-500 text-white" : "bg-yellow-500 text-white"
                              )}>
                                {qr.status === "quoted" ? "Quoted" : "Pending"}
                              </Badge>
                              {pastDue && (
                                <Badge className="bg-red-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 border-none">
                                  Past Due
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="space-y-3 mb-8">
                            {qr.requested_date && qr.requested_time && (
                              <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 space-y-2">
                                <div className="flex items-center gap-3 text-gray-600">
                                  <Calendar className="w-4 h-4 text-[#96cbc3]" />
                                  <span className="text-xs font-bold">{formatDate(qr.requested_date)}</span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-600">
                                  <Clock className="w-4 h-4 text-[#434c9d]" />
                                  <span className="text-xs font-bold">{formatTime(qr.requested_time)}</span>
                                </div>
                              </div>
                            )}

                            {qr.quotes && qr.quotes.length > 0 && (
                              <div className="p-4 bg-[#96cbc3]/10 rounded-2xl border border-[#96cbc3]/20">
                                <p className="text-[10px] font-black text-[#96cbc3] uppercase tracking-widest mb-1">Provider's Quote</p>
                                <p className="text-2xl font-black text-gray-900">{formatPrice(qr.quotes[0].price)}</p>
                                {qr.quotes[0].estimated_duration && (
                                  <p className="text-xs font-bold text-gray-500 mt-1">Est. {qr.quotes[0].estimated_duration} minutes</p>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-3 mt-auto pt-6 border-t border-gray-50">
                            <Button
                              variant="outline"
                              className="rounded-xl font-bold border-gray-100 hover:bg-[#434c9d] hover:text-white transition-all h-11"
                              onClick={() => router.push(`/my-quote-requests`)}
                            >
                              <FileText className="w-4 h-4 mr-2" /> Details
                            </Button>
                            <Button
                              variant="outline"
                              disabled={openingQuoteMessageId === qr.id}
                              className="rounded-xl font-bold border-gray-100 hover:bg-[#434c9d] hover:text-white transition-all h-11 disabled:opacity-50"
                              onClick={() => handleMessageQuoteRequest(qr)}
                            >
                              {openingQuoteMessageId === qr.id ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <MessageCircle className="w-4 h-4 mr-2" />
                              )}
                              Message
                            </Button>
                            {(pastDue || qr.status === "pending" || qr.status === "quoted") && (
                              <Button
                                variant="outline"
                                disabled={updating === qr.id}
                                className="col-span-2 rounded-xl font-bold border-gray-100 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all h-11"
                                onClick={() => handleCancelQuoteRequest(qr.id)}
                              >
                                {updating === qr.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <><XCircle className="w-4 h-4 mr-2" /> Cancel Request</>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-24 text-center bg-gray-50/50 rounded-[40px] border-2 border-dashed border-gray-100">
                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                      <div className="text-gray-200">{icon}</div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
                    <p className="text-gray-500 max-w-sm mx-auto leading-relaxed font-medium">
                      {description}
                    </p>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>

          <div className="mt-12 p-5 bg-[#434c9d]/5 border border-[#434c9d]/20 rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-white border border-[#434c9d]/15 flex items-center justify-center shrink-0">
                <Info className="w-4 h-4 text-[#434c9d]" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-black text-[#434c9d] uppercase tracking-widest">Payment Update</p>
                <p className="text-sm font-medium text-gray-700 leading-relaxed">
                  After you pay, please give it a moment for your account to update. If it does not reflect right away, refresh this page after about 30 seconds.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {selectedBooking && (
        <PaymentModal
          isOpen={paymentModalOpen}
          onClose={() => {
            setPaymentModalOpen(false);
            setSelectedBooking(null);
          }}
          bookingId={selectedBooking.id}
          amount={selectedBooking.total_price}
          serviceTitle={selectedBooking.service?.title || 'Service'}
          onPaymentSuccess={(updatedBooking) => {
            const bookingId = updatedBooking?.id || selectedBooking.id;
            setBookings((prev) =>
              prev.map((booking) =>
                booking.id === bookingId
                  ? {
                      ...booking,
                      status: (updatedBooking?.status as any) || "paid",
                      updated_at: updatedBooking?.updated_at || new Date().toISOString(),
                    }
                  : booking
              )
            );
            void fetchBookings(true);
            setPaymentModalOpen(false);
            setSelectedBooking(null);
          }}
        />
      )}

      {/* Review Modal */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tip, Rate, and Review</DialogTitle>
            <DialogDescription>
              Share your experience and show your appreciation
            </DialogDescription>
          </DialogHeader>
          {selectedBookingForReview && (
            <ReviewForm
              bookingId={selectedBookingForReview.id}
              serviceTitle={selectedBookingForReview.service?.title || "Service"}
              onSuccess={() => {
                setReviewModalOpen(false);
                setSelectedBookingForReview(null);
                fetchBookings(); // Refresh to update review status
              }}
              onCancel={() => {
                setReviewModalOpen(false);
                setSelectedBookingForReview(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

// Booking Card Component
function BookingCard({
  booking,
  statusConfig,
  updating,
  isExpired,
  onCancel,
  onPay,
  onComplete,
  onAcceptAlternative,
  onMessage,
  formatPrice,
  formatDate,
  formatTime,
  toast,
}: {
  booking: Booking;
  statusConfig: StatusConfig;
  updating: boolean;
  isExpired?: boolean;
  onCancel: () => void;
  onPay: () => void;
  onComplete?: () => void;
  onAcceptAlternative?: (bookingId: string, alternativeDate: string, alternativeTime: string) => void;
  onMessage: () => void;
  formatPrice: (price: number) => string;
  formatDate: (date: string) => string;
  formatTime: (time: string) => string;
  toast: ReturnType<typeof useToast>['toast'];
}) {
  return (
    <div className={cn(
      "group bg-white rounded-[32px] overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col h-full",
      isExpired && "opacity-75 grayscale-[0.5]"
    )}>
      {/* Header Section */}
      <div className="p-8 pb-6">
        <div className="flex justify-between items-start mb-6">
          <div className="space-y-2">
            <Badge className={cn(
              "text-[10px] font-black uppercase tracking-widest px-3 py-1.5 border-none shadow-sm",
              statusConfig.bgColor,
              statusConfig.color
            )}>
              <span className="flex items-center gap-1.5">{statusConfig.icon} {statusConfig.label}</span>
            </Badge>
            <Link
              href={`/services/${booking.service_id}`}
              className="text-xl font-black text-gray-900 group-hover:text-[#434c9d] transition-colors block line-clamp-2 leading-tight"
            >
              {booking.service?.title}
            </Link>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-gray-900">
              {formatPrice(booking.total_price)}
            </p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 gap-3 mb-6">
          <div className="flex items-center gap-3 p-3 bg-gray-50/50 rounded-2xl border border-gray-100">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
              <Calendar className="w-4 h-4 text-[#96cbc3]" />
            </div>
            <span className="text-xs font-bold text-gray-600">{formatDate(booking.requested_date)}</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50/50 rounded-2xl border border-gray-100">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
              <Clock className="w-4 h-4 text-[#434c9d]" />
            </div>
            <span className="text-xs font-bold text-gray-600">{formatTime(booking.requested_time)}</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50/50 rounded-2xl border border-gray-100">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
              <MapPin className="w-4 h-4 text-[#ff725a]" />
            </div>
            <span className="text-xs font-bold text-gray-600 truncate">{booking.service?.location}</span>
          </div>
        </div>

        {/* Alternative Time Proposal Display */}
        {booking.status === "alternative_proposed" && booking.alternative_date && booking.alternative_time && (
          <div className="mb-6 p-4 bg-orange-50 rounded-2xl border border-orange-100">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
                <Clock className="w-4 h-4 text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-orange-900 uppercase tracking-widest mb-2">Alternative Proposed</p>
                <div className="space-y-1 text-xs font-bold text-orange-800">
                  <p className="opacity-60">Original: {formatDate(booking.requested_date)} at {formatTime(booking.requested_time)}</p>
                  <p>Proposed: {formatDate(booking.alternative_date)} at {formatTime(booking.alternative_time)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Special Instructions */}
        {booking.special_instructions && (
          <div className="mb-6 p-4 bg-[#434c9d]/5 rounded-2xl border border-[#434c9d]/10">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
                <Info className="w-4 h-4 text-[#434c9d]" />
              </div>
              <p className="text-xs font-medium text-gray-600 leading-relaxed italic">
                &quot;{booking.special_instructions}&quot;
              </p>
            </div>
          </div>
        )}
        {booking.status === "paid" && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-black text-emerald-900 mb-2">Payment Confirmed</p>
            <p className="text-xs font-bold text-emerald-800 mb-2">Here&apos;s what happens next:</p>
            <ul className="space-y-1 text-xs font-medium text-emerald-900 list-disc pl-4">
              <li>Your payment has been received and securely held. Teens will not be paid until you mark the service as completed.</li>
              <li>Funds will be transferred to the teen after the service is marked as completed.</li>
              <li>You can message your teen anytime through the platform to coordinate details.</li>
              <li>You&apos;ll receive email reminders 24 hours and 3 hours before your scheduled service.</li>
              <li>Mark the service as completed on Requests Page to initiate teen payment.</li>
              <li>After the service, you&apos;ll have the option to tip and leave a review.</li>
            </ul>
            <p className="text-xs font-bold text-emerald-900 mt-2">Thank you for supporting young entrepreneurs &#128155;</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-auto p-8 pt-0">
        <div className="flex flex-col gap-2 pt-6 border-t border-gray-50">
          {isExpired && (
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-xl text-center">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Request Expired</p>
              </div>
              <Button
                variant="outline"
                className="w-full rounded-xl font-bold border-gray-100 hover:bg-[#434c9d] hover:text-white transition-all h-11"
                onClick={onMessage}
              >
                <MessageCircle className="w-4 h-4 mr-2" /> Message Provider
              </Button>
            </div>
          )}

          {!isExpired && booking.status === "alternative_proposed" && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-gray-600 px-1">
                You will be notified by email when the buyer responds.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    if (onAcceptAlternative && booking.alternative_date && booking.alternative_time) {
                      onAcceptAlternative(booking.id, booking.alternative_date, booking.alternative_time);
                    }
                  }}
                  disabled={updating}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold h-11 shadow-lg shadow-green-100"
                >
                  {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 mr-2" /> Accept</>}
                </Button>
                <Button
                  onClick={onCancel}
                  variant="outline"
                  disabled={updating}
                  className="flex-1 rounded-xl font-bold border-gray-100 text-red-500 hover:bg-red-500 hover:text-white transition-all h-11"
                >
                  <XCircle className="w-4 h-4 mr-2" /> Decline
                </Button>
              </div>
              <Button
                variant="outline"
                className="w-full rounded-xl font-bold border-gray-100 hover:bg-[#434c9d] hover:text-white transition-all h-11"
                onClick={onMessage}
              >
                <MessageCircle className="w-4 h-4 mr-2" /> Message Provider
              </Button>
            </div>
          )}

          {!isExpired && booking.status === "pending" && (
            <div className="flex gap-2">
              <Button
                onClick={onCancel}
                variant="outline"
                disabled={updating}
                className="flex-1 rounded-xl font-bold border-gray-100 text-red-500 hover:bg-red-500 hover:text-white transition-all h-11"
              >
                {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-4 h-4 mr-2" /> Cancel</>}
              </Button>
              <Button
                variant="outline"
                className="flex-1 rounded-xl font-bold border-gray-100 hover:bg-[#434c9d] hover:text-white transition-all h-11"
                onClick={onMessage}
              >
                <MessageCircle className="w-4 h-4 mr-2" /> Message
              </Button>
            </div>
          )}

          {!isExpired && booking.status === "confirmed" && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-gray-600 px-1">
                You will receive an email notification when the teen provider responds. View the status of your request under the Requests tab.
              </p>
              <Button
                onClick={onPay}
                className="w-full bg-[#434c9d] hover:bg-[#434c9d]/90 text-white rounded-xl font-black h-12 shadow-xl shadow-[#434c9d]/20 transition-all active:scale-95"
              >
                <CreditCard className="w-5 h-5 mr-2" /> Confirm and Pay
              </Button>
              <div className="flex gap-2">
                <Button
                  onClick={onCancel}
                  variant="outline"
                  disabled={updating}
                  className="flex-1 rounded-xl font-bold border-gray-100 text-red-500 hover:bg-red-50 transition-all h-11"
                >
                  <XCircle className="w-4 h-4 mr-2" /> Cancel
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl font-bold border-gray-100 hover:bg-[#434c9d] hover:text-white transition-all h-11"
                  onClick={onMessage}
                >
                  <MessageCircle className="w-4 h-4 mr-2" /> Message
                </Button>
              </div>
            </div>
          )}

          {booking.status === "completed" && (
            <Button
              variant="outline"
              className="w-full rounded-xl font-bold border-gray-100 hover:bg-[#434c9d] hover:text-white transition-all h-11"
              onClick={onMessage}
            >
              <MessageCircle className="w-4 h-4 mr-2" /> Message Provider
            </Button>
          )}

          {booking.status === "paid" && (
            <div className="space-y-2">
              <Button
                onClick={onComplete}
                disabled={updating}
                className="w-full bg-green-500 hover:bg-green-600 text-white rounded-xl font-black h-12 shadow-xl shadow-green-100 transition-all active:scale-95"
              >
                {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 mr-2" /> Mark as Completed</>}
              </Button>
              <Button
                variant="outline"
                disabled={updating}
                className="w-full rounded-xl font-bold border-amber-200 text-amber-700 hover:bg-amber-50 transition-all h-11"
                onClick={() => {
                  const shouldRefund = window.confirm(
                    "If teen doesn't complete service click here and payment will be refunded.\n\nClick OK to cancel this service and start refund processing."
                  );
                  if (shouldRefund) {
                    onCancel();
                    toast({
                      title: "Service Cancelled",
                      description: "Your cancellation was submitted. Refunds typically process within 5 business days.",
                    });
                  }
                }}
              >
                If teen doesn&apos;t complete service click here and payment will be refunded
              </Button>
              <div className="flex gap-2">
                <Button
                  onClick={onCancel}
                  variant="outline"
                  disabled={updating}
                  className="flex-1 rounded-xl font-bold border-gray-100 text-red-500 hover:bg-red-50 transition-all h-11"
                >
                  <XCircle className="w-4 h-4 mr-2" /> Cancel
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl font-bold border-gray-100 hover:bg-[#434c9d] hover:text-white transition-all h-11"
                  onClick={onMessage}
                >
                  <MessageCircle className="w-4 h-4 mr-2" /> Message
                </Button>
              </div>
            </div>
          )}

          {(booking.status === "cancelled" || booking.status === "rejected") && (
            <Link href={`/services/${booking.service_id}`} className="block">
              <Button
                variant="outline"
                className="w-full rounded-xl font-bold border-gray-100 hover:bg-[#434c9d] hover:text-white transition-all h-11"
              >
                <ArrowRight className="w-4 h-4 mr-2" /> View Service Again
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// Empty State Component
function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="text-center py-16 bg-white rounded-2xl border-2 border-gray-200">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-400">
        {icon}
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">{description}</p>
      {actionLabel && actionHref && (
        <Link href={actionHref}>
          <Button className="bg-gradient-to-r from-[#434c9d] to-[#96cbc3] hover:from-[#434c9d]/90 hover:to-[#96cbc3]/90 text-white shadow-lg">
            {actionLabel}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      )}
    </div>
  );
}

