"use client";

import React, { useState, useEffect } from "react";
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
  Star
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

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
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

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch("/api/bookings");
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to fetch bookings");
      }
      
      let requestedBookings = result.myRequests || [];
      
      // Debug: Log alternative_proposed bookings
      const altProposed = requestedBookings.filter((b: Booking) => b.status === "alternative_proposed");
      if (altProposed.length > 0) {
        console.log("Alternative proposed bookings found:", altProposed);
      }
      
      // Filter out expired bookings (only for pending/confirmed/alternative_proposed)
      requestedBookings = requestedBookings.filter((booking: Booking) => {
        if (booking.status === "pending" || booking.status === "confirmed" || booking.status === "alternative_proposed") {
          return !isBookingExpired(booking);
        }
        return true; // Keep paid, completed, cancelled, rejected regardless of date
      });
      
      setBookings(requestedBookings);

      // Fetch completed bookings that need reviews (only when teen has marked as completed)
      const completedForReview = requestedBookings.filter((booking: Booking) => 
        booking.status === "completed"
      );
      
      // Check which ones already have reviews
      const bookingsWithReviewStatus = await Promise.all(
        completedForReview.map(async (booking: Booking) => {
          try {
            const reviewRes = await fetch(`/api/reviews?booking_id=${booking.id}`);
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
      
      // Only show bookings that don't have reviews yet
      setCompletedBookingsForReview(bookingsWithReviewStatus.filter((b: any) => !b.hasReview));

      // Fetch quote requests for this customer
      try {
        const quoteRes = await fetch("/api/quotes/request?role=customer", { cache: "no-store" });
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

      // Fetch the updated booking
      const bookingResponse = await fetch(`/api/bookings/${bookingId}`);
      if (bookingResponse.ok) {
        const bookingResult = await bookingResponse.json();
        if (bookingResult.success && bookingResult.booking) {
          setSelectedBooking({ ...bookingResult.booking, status: "confirmed" as any });
          setPaymentModalOpen(true);
        }
      }

      // Refresh bookings list
      await fetchBookings();

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
      
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to update booking");
      }

      setBookings(prev => 
        prev.map(booking => 
          booking.id === bookingId 
            ? { ...booking, status: newStatus as any, updated_at: new Date().toISOString() }
            : booking
        )
      );

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

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(price);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
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

  // Filter bookings by status
  const allBookings = bookings;
  // Pending: service is accepted and waiting for payment (pending, alternative_proposed, confirmed)
  const pendingBookings = bookings.filter(booking => 
    booking.status === "pending" || 
    booking.status === "alternative_proposed" || 
    booking.status === "confirmed"
  );
  // Scheduled: once it is paid
  const scheduledBookings = bookings.filter(booking => booking.status === "paid");
  // Completed: once the service is completed
  const completedBookings = bookings.filter(booking => booking.status === "completed");
  // Cancelled: cancelled or rejected requests
  const cancelledBookings = bookings.filter(booking => 
    booking.status === "cancelled" || booking.status === "rejected"
  );
  
  // Filter quote requests by status (only show in pending tab)
  const pendingQuoteRequests = quoteRequests.filter((qr: any) => 
    qr.status === "pending" || qr.status === "quoted"
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-orange-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#434c9d] to-[#96cbc3] rounded-xl flex items-center justify-center shadow-lg">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-[#434c9d] to-[#96cbc3] bg-clip-text text-transparent">
                  My Requests
                </h1>
                <p className="text-gray-600 mt-1">Track and manage your service bookings</p>
                {user?.role === "teen" && (
                  <p className="text-sm text-gray-500 mt-2 italic">
                    If you requested/purchased a service from another teen it will show up here. If looking for service requests for your own services visit the My Teen Hustle Page or{" "}
                    <Link href="/my-teen-hustle" className="text-[#434c9d] hover:underline font-medium">
                      click here
                    </Link>
                    .
                  </p>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
              <div className="flex items-center justify-between">
                <p className="text-red-700 font-medium">{error}</p>
                <Button 
                  onClick={fetchBookings}
                  variant="outline"
                  size="sm"
                  className="border-red-300 text-red-700 hover:bg-red-100"
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-8">
            <div className="bg-white p-4 md:p-6 rounded-xl md:rounded-2xl border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4">
                <div className="w-10 h-10 md:w-14 md:h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-md">
                  <Calendar className="w-5 h-5 md:w-7 md:h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">Total Requests</p>
                  <p className="text-xl md:text-3xl font-bold text-gray-900">{allBookings.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 md:p-6 rounded-xl md:rounded-2xl border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4">
                <div className="w-10 h-10 md:w-14 md:h-14 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-md">
                  <AlertCircle className="w-5 h-5 md:w-7 md:h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">Pending</p>
                  <p className="text-xl md:text-3xl font-bold text-gray-900">{pendingBookings.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 md:p-6 rounded-xl md:rounded-2xl border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4">
                <div className="w-10 h-10 md:w-14 md:h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-md">
                  <CheckCircle className="w-5 h-5 md:w-7 md:h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">Completed</p>
                  <p className="text-xl md:text-3xl font-bold text-gray-900">{completedBookings.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tip, Rate, and Review Section */}
          {completedBookingsForReview.length > 0 && (
            <div className="mb-8 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200 shadow-lg">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Tip, Rate, and Review Your Latest Teen Provider
                  </h2>
                  <p className="text-gray-600">
                    The service has been marked as completed. Help other parents by sharing your experience and supporting the teen who provided your service.
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {completedBookingsForReview.slice(0, 3).map((booking: any) => (
                  <div
                    key={booking.id}
                    className="bg-white rounded-lg p-4 border border-purple-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {booking.service?.title || "Service"}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Completed on {formatDate(booking.requested_date)}
                        </p>
                      </div>
                      <Button
                        onClick={() => {
                          setSelectedBookingForReview(booking);
                          setReviewModalOpen(true);
                        }}
                        className="bg-[#434c9d] hover:bg-[#434c9d]/90 text-white"
                        size="sm"
                      >
                        <Star className="w-4 h-4 mr-2" />
                        Review & Tip
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabs */}
          <Tabs defaultValue="pending" className="w-full">
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <TabsList className="inline-flex w-full sm:grid sm:grid-cols-4 bg-gray-100 p-1 rounded-xl h-auto min-w-max sm:min-w-0">
            <TabsTrigger value="pending" className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg font-semibold py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm whitespace-nowrap">
              Pending ({pendingBookings.length + pendingQuoteRequests.length})
              </TabsTrigger>
                <TabsTrigger value="scheduled" className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg font-semibold py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm whitespace-nowrap">
                Scheduled ({scheduledBookings.length})
              </TabsTrigger>
                <TabsTrigger value="completed" className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg font-semibold py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm whitespace-nowrap">
                Completed ({completedBookings.length})
              </TabsTrigger>
                <TabsTrigger value="cancelled" className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg font-semibold py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm whitespace-nowrap">
                Cancelled ({cancelledBookings.length})
              </TabsTrigger>
            </TabsList>
                </div>

            {/* Status-specific tabs */}
            {[
              { value: "pending", bookings: pendingBookings, quoteRequests: pendingQuoteRequests, icon: <AlertCircle className="w-16 h-16" />, title: "No pending requests", description: "All your requests have been processed." },
              { value: "scheduled", bookings: scheduledBookings, quoteRequests: [], icon: <Calendar className="w-16 h-16" />, title: "No scheduled services", description: "Paid services will appear here once payment is completed." },
              { value: "completed", bookings: completedBookings, quoteRequests: [], icon: <CheckCircle className="w-16 h-16" />, title: "No completed requests", description: "Completed services will appear here." },
              { value: "cancelled", bookings: cancelledBookings, quoteRequests: [], icon: <XCircle className="w-16 h-16" />, title: "No cancelled requests", description: "Cancelled requests will appear here." }
            ].map(({ value, bookings: tabBookings, quoteRequests: tabQuoteRequests, icon, title, description }) => (
              <TabsContent key={value} value={value} className="mt-6">
                {(tabBookings.length > 0 || tabQuoteRequests.length > 0) ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Regular Bookings */}
                    {tabBookings.map((booking) => {
                      const statusConfig = getStatusConfig(booking.status);
                      return (
                        <BookingCard
                          key={booking.id}
                          booking={booking}
                          statusConfig={statusConfig}
                          updating={updating === booking.id}
                          onCancel={() => updateBookingStatus(booking.id, "cancelled")}
                          onPay={() => {
                            setSelectedBooking(booking);
                            setPaymentModalOpen(true);
                          }}
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
                    {value === "pending" && tabQuoteRequests.map((qr: any) => (
                      <div key={qr.id} className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-purple-300 hover:shadow-xl transition-all">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className="bg-purple-100 text-purple-700">Quote Request</Badge>
                              <h3 className="text-xl font-bold text-gray-900">{qr.services?.title || 'Service'}</h3>
                            </div>
                            <p className="text-sm text-gray-600">Quote request for your service</p>
                          </div>
                          <Badge className="bg-yellow-100 text-yellow-700 text-xs font-semibold px-3 py-1">
                            {qr.status === "quoted" ? "Quoted" : "Pending"}
                          </Badge>
                        </div>
                        {qr.requested_date && qr.requested_time && (
                          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="w-4 h-4 text-blue-600" />
                              <span className="font-medium">{formatDate(qr.requested_date)}</span>
                              <Clock className="w-4 h-4 text-purple-600 ml-2" />
                              <span className="font-medium">{formatTime(qr.requested_time)}</span>
                            </div>
                          </div>
                        )}
                        {qr.quotes && qr.quotes.length > 0 && (
                          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm font-semibold text-green-900 mb-1">Provider's Quote:</p>
                            <p className="text-lg font-bold text-green-700">${qr.quotes[0].price.toFixed(2)}</p>
                            {qr.quotes[0].estimated_duration && (
                              <p className="text-xs text-green-600">Est. {qr.quotes[0].estimated_duration} minutes</p>
                            )}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 border-[#434c9d] text-[#434c9d] hover:bg-[#434c9d] hover:text-white"
                            onClick={() => router.push(`/my-quote-requests`)}
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            View Details
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 border-[#434c9d] text-[#434c9d] hover:bg-[#434c9d] hover:text-white"
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
                  <EmptyState
                    icon={icon}
                    title={title}
                    description={description}
                  />
                )}
              </TabsContent>
            ))}
          </Tabs>
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
          onPaymentSuccess={() => {
            fetchBookings();
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
  onCancel,
  onPay,
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
  onCancel: () => void;
  onPay: () => void;
  onAcceptAlternative?: (bookingId: string, alternativeDate: string, alternativeTime: string) => void;
  onMessage: () => void;
  formatPrice: (price: number) => string;
  formatDate: (date: string) => string;
  formatTime: (time: string) => string;
  toast: ReturnType<typeof useToast>['toast'];
}) {
  return (
    <div className="bg-white rounded-xl md:rounded-2xl border-2 border-gray-200 p-4 md:p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <Link 
            href={`/services/${booking.service_id}`}
            className="text-lg sm:text-xl font-bold text-gray-900 hover:text-[#434c9d] transition-colors block mb-2 line-clamp-2"
          >
            {booking.service?.title}
          </Link>
          <Badge className={`${statusConfig.bgColor} ${statusConfig.color} ${statusConfig.borderColor} border px-2 sm:px-3 py-1 flex items-center gap-1.5 w-fit text-xs sm:text-sm`}>
            {statusConfig.icon}
            <span className="font-semibold">{statusConfig.label}</span>
          </Badge>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#434c9d] to-[#96cbc3] bg-clip-text text-transparent">
            {formatPrice(booking.total_price)}
          </p>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span className="font-medium">{formatDate(booking.requested_date)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4 text-purple-600" />
          <span className="font-medium">{formatTime(booking.requested_time)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="w-4 h-4 text-red-600" />
          <span className="font-medium truncate">{booking.service?.location}</span>
        </div>
      </div>

      {/* Alternative Time Proposal Display */}
      {booking.status === "alternative_proposed" && booking.alternative_date && booking.alternative_time && (
        <div className="mb-4 p-4 bg-orange-50 border-l-4 border-orange-400 rounded-r-lg">
          <div className="flex items-start gap-2">
            <Clock className="w-5 h-5 text-orange-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-orange-900 mb-2">Alternative Time Proposed</p>
              <div className="space-y-1 text-sm text-orange-800">
                <p><strong>Original:</strong> {formatDate(booking.requested_date)} at {formatTime(booking.requested_time)}</p>
                <p><strong>Proposed:</strong> {formatDate(booking.alternative_date)} at {formatTime(booking.alternative_time)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Special Instructions */}
      {booking.special_instructions && (
        <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
          <p className="text-sm text-gray-700">
            <strong className="text-blue-700">Note:</strong> {booking.special_instructions}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        {booking.status === "alternative_proposed" && (
          <div className="space-y-2">
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-center">
              <div className="flex items-center justify-center text-orange-700 gap-2">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Provider Proposed Alternative Time</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => {
                  if (onAcceptAlternative && booking.alternative_date && booking.alternative_time) {
                    onAcceptAlternative(booking.id, booking.alternative_date, booking.alternative_time);
                  }
                }}
                size="sm"
                disabled={updating || !onAcceptAlternative || !booking.alternative_date || !booking.alternative_time}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-md text-xs sm:text-sm"
              >
                {updating ? (
                  <>
                    <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin mr-2" />
                    Accepting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                    Accept & Pay
                  </>
                )}
              </Button>
              <Button
                onClick={onCancel}
                variant="outline"
                size="sm"
                disabled={updating}
                className="flex-1 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 text-xs sm:text-sm"
              >
                {updating ? (
                  <>
                    <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin mr-2" />
                    Declining...
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                    Decline
                  </>
                )}
              </Button>
            </div>
            <Button
              onClick={onMessage}
              variant="outline"
              size="sm"
              className="w-full border-[#434c9d] text-[#434c9d] hover:bg-[#434c9d] hover:text-white text-xs sm:text-sm"
            >
              <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
              Message Provider
            </Button>
          </div>
        )}
        {booking.status === "pending" && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={onCancel}
              variant="outline"
              size="sm"
              disabled={updating}
              className="flex-1 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 text-xs sm:text-sm"
            >
              {updating ? <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin mr-2" /> : <XCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />}
              {updating ? "Cancelling..." : "Cancel"}
            </Button>
            <Button
              onClick={onMessage}
              variant="outline"
              size="sm"
              className="flex-1 border-[#434c9d] text-[#434c9d] hover:bg-[#434c9d] hover:text-white text-xs sm:text-sm"
            >
              <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
              Message
            </Button>
          </div>
        )}

        {booking.status === "confirmed" && (
          <div className="space-y-2">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
              <div className="flex items-center justify-center text-blue-700 gap-2">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Confirmed by Provider - Payment Required</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={onPay}
                size="sm"
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-md text-xs sm:text-sm"
              >
                <CreditCard className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                Confirm and Pay
              </Button>
              <Button
                onClick={onCancel}
                variant="outline"
                size="sm"
                disabled={updating}
                className="flex-1 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 text-xs sm:text-sm"
              >
                {updating ? <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin mr-2" /> : <XCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />}
                {updating ? "Cancelling..." : "Cancel"}
              </Button>
            </div>
            <Button
              onClick={onMessage}
              variant="outline"
              size="sm"
              className="w-full border-[#434c9d] text-[#434c9d] hover:bg-[#434c9d] hover:text-white text-xs sm:text-sm"
            >
              <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
              Message Provider
            </Button>
          </div>
        )}

        {booking.status === "completed" && (
          <div className="space-y-2">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
              <div className="flex items-center justify-center text-green-700 gap-2">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Service Completed</span>
              </div>
            </div>
            <Button
              onClick={onMessage}
              variant="outline"
              size="sm"
              className="w-full border-[#434c9d] text-[#434c9d] hover:bg-[#434c9d] hover:text-white text-xs sm:text-sm"
            >
              <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
              Message Provider
            </Button>
          </div>
        )}

        {booking.status === "paid" && (
          <div className="space-y-2">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
              <div className="flex items-center justify-center text-emerald-700 gap-2">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">Scheduled - Payment Completed</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
                <Button
                onClick={onCancel}
                  variant="outline"
                  size="sm"
                disabled={updating}
                className="flex-1 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 text-xs sm:text-sm"
                >
                {updating ? <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin mr-2" /> : <XCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />}
                {updating ? "Cancelling..." : "Cancel Service"}
                </Button>
              <Button
                onClick={onMessage}
                variant="outline"
                size="sm"
                className="flex-1 border-[#434c9d] text-[#434c9d] hover:bg-[#434c9d] hover:text-white text-xs sm:text-sm"
              >
                <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                Message
              </Button>
            </div>
          </div>
        )}

        {(booking.status === "cancelled" || booking.status === "rejected") && (
          <div className="space-y-2">
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
              <div className="flex items-center justify-center text-gray-700 gap-2">
                <XCircle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {booking.status === "cancelled" ? "Request Cancelled" : "Request Rejected"}
                </span>
              </div>
            </div>
            <Link href={`/services/${booking.service_id}`} className="block">
              <Button
                variant="outline"
                size="sm"
                className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                View Service Again
              </Button>
            </Link>
          </div>
        )}
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

