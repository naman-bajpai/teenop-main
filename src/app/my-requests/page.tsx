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
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useUser } from "@/hooks/useUser";
import { Booking } from "@/types/booking";
import { PaymentModal } from "@/components/payments/PaymentModal";
import { useToast } from "@/components/ui/use-toast";

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
    }
  };

  return configs[status] || configs.pending;
}

export default function MyRequestsPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch("/api/bookings");
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to fetch bookings");
      }
      
      const requestedBookings = result.myRequests || [];
      setBookings(requestedBookings);
    } catch (err: any) {
      console.error("Error fetching bookings:", err);
      setError(err.message || "Failed to load bookings");
    } finally {
      setLoading(false);
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
    if (!booking.service?.user_id) {
      toast({
        title: "Error",
        description: "Service provider information not available",
        variant: "destructive",
      });
      return;
    }

    // Navigate to messages page - conversations are automatically created from bookings
    // The messages page will show all conversations based on bookings
    router.push("/messages");
    
    // Show a toast to help user find the conversation
    toast({
      title: "Opening Messages",
      description: "Your conversation with the service provider will appear in the messages page.",
    });
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
  const pendingBookings = bookings.filter(booking => booking.status === "pending");
  const confirmedBookings = bookings.filter(booking => booking.status === "confirmed");
  const completedBookings = bookings.filter(booking => booking.status === "completed");
  const paidBookings = bookings.filter(booking => booking.status === "paid");
  const cancelledBookings = bookings.filter(booking => booking.status === "cancelled");

  // Calculate stats
  const totalSpent = bookings
    .filter(booking => booking.status === "paid")
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-2xl border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                  <Calendar className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Requests</p>
                  <p className="text-3xl font-bold text-gray-900">{allBookings.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-md">
                  <AlertCircle className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Pending</p>
                  <p className="text-3xl font-bold text-gray-900">{pendingBookings.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-md">
                  <CheckCircle className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Completed</p>
                  <p className="text-3xl font-bold text-gray-900">{paidBookings.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                  <DollarSign className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Spent</p>
                  <p className="text-3xl font-bold text-gray-900">{formatPrice(totalSpent)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-6 bg-gray-100 p-1 rounded-xl h-auto">
              <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg font-semibold py-3">
                All ({allBookings.length})
              </TabsTrigger>
              <TabsTrigger value="pending" className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg font-semibold py-3">
                Pending ({pendingBookings.length})
              </TabsTrigger>
              <TabsTrigger value="confirmed" className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg font-semibold py-3">
                Confirmed ({confirmedBookings.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg font-semibold py-3">
                Completed ({completedBookings.length})
              </TabsTrigger>
              <TabsTrigger value="paid" className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg font-semibold py-3">
                Paid ({paidBookings.length})
              </TabsTrigger>
              <TabsTrigger value="cancelled" className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg font-semibold py-3">
                Cancelled ({cancelledBookings.length})
              </TabsTrigger>
            </TabsList>

            {/* All Bookings Tab */}
            <TabsContent value="all" className="mt-6">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array(6).fill(0).map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl p-6 border-2 border-gray-200 animate-pulse">
                      <div className="h-6 bg-gray-200 rounded mb-4"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : allBookings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allBookings.map((booking) => {
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
                        onMessage={() => handleMessageUser(booking)}
                        formatPrice={formatPrice}
                        formatDate={formatDate}
                        formatTime={formatTime}
                        toast={toast}
                      />
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={<Calendar className="w-16 h-16" />}
                  title="No requests yet"
                  description="You haven't requested any services yet. Start exploring services to make your first booking!"
                  actionLabel="Browse Services"
                  actionHref="/dashboard"
                />
              )}
            </TabsContent>

            {/* Status-specific tabs */}
            {[
              { value: "pending", bookings: pendingBookings, icon: <AlertCircle className="w-16 h-16" />, title: "No pending requests", description: "All your requests have been processed." },
              { value: "confirmed", bookings: confirmedBookings, icon: <CheckCircle className="w-16 h-16" />, title: "No confirmed requests", description: "Confirmed bookings will appear here." },
              { value: "completed", bookings: completedBookings, icon: <CheckCircle className="w-16 h-16" />, title: "No completed requests", description: "Completed services will appear here." },
              { value: "paid", bookings: paidBookings, icon: <CheckCircle className="w-16 h-16" />, title: "No paid requests", description: "Paid services will appear here." },
              { value: "cancelled", bookings: cancelledBookings, icon: <XCircle className="w-16 h-16" />, title: "No cancelled requests", description: "Cancelled requests will appear here." }
            ].map(({ value, bookings: tabBookings, icon, title, description }) => (
              <TabsContent key={value} value={value} className="mt-6">
                {tabBookings.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                          onMessage={() => handleMessageUser(booking)}
                          formatPrice={formatPrice}
                          formatDate={formatDate}
                          formatTime={formatTime}
                          toast={toast}
                        />
                      );
                    })}
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
  onMessage: () => void;
  formatPrice: (price: number) => string;
  formatDate: (date: string) => string;
  formatTime: (time: string) => string;
  toast: ReturnType<typeof useToast>['toast'];
}) {
  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <Link 
            href={`/services/${booking.service_id}`}
            className="text-xl font-bold text-gray-900 hover:text-[#434c9d] transition-colors block mb-2 line-clamp-2"
          >
            {booking.service?.title}
          </Link>
          <Badge className={`${statusConfig.bgColor} ${statusConfig.color} ${statusConfig.borderColor} border px-3 py-1 flex items-center gap-1.5 w-fit`}>
            {statusConfig.icon}
            <span className="font-semibold">{statusConfig.label}</span>
          </Badge>
        </div>
        <div className="text-right ml-4">
          <p className="text-2xl font-bold bg-gradient-to-r from-[#434c9d] to-[#96cbc3] bg-clip-text text-transparent">
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
        {booking.status === "pending" && (
          <div className="flex gap-2">
            <Button
              onClick={onCancel}
              variant="outline"
              size="sm"
              disabled={updating}
              className="flex-1 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
            >
              {updating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
              {updating ? "Cancelling..." : "Cancel"}
            </Button>
            <Button
              onClick={onMessage}
              variant="outline"
              size="sm"
              className="flex-1 border-[#434c9d] text-[#434c9d] hover:bg-[#434c9d] hover:text-white"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Message
            </Button>
          </div>
        )}

        {booking.status === "confirmed" && (
          <div className="space-y-2">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
              <div className="flex items-center justify-center text-blue-700 gap-2">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Confirmed by Provider</span>
              </div>
            </div>
            <Button
              onClick={onMessage}
              variant="outline"
              size="sm"
              className="w-full border-[#434c9d] text-[#434c9d] hover:bg-[#434c9d] hover:text-white"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Message Provider
            </Button>
          </div>
        )}

        {booking.status === "completed" && (
          <div className="space-y-2">
            <Button
              onClick={onPay}
              size="sm"
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-md"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Pay Now - {formatPrice(booking.total_price)}
            </Button>
            <Button
              onClick={onMessage}
              variant="outline"
              size="sm"
              className="w-full border-[#434c9d] text-[#434c9d] hover:bg-[#434c9d] hover:text-white"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Message Provider
            </Button>
          </div>
        )}

        {booking.status === "paid" && (
          <div className="space-y-2">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
              <div className="flex items-center justify-center text-emerald-700 gap-2">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Payment Completed</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/services/${booking.service_id}`} className="flex-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Service
                </Button>
              </Link>
              <Button
                onClick={onMessage}
                variant="outline"
                size="sm"
                className="flex-1 border-[#434c9d] text-[#434c9d] hover:bg-[#434c9d] hover:text-white"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
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

