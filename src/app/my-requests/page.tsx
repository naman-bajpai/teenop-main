"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  MessageCircle,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  CreditCard,
  Star,
  TrendingUp
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useUser } from "@/hooks/useUser";
import { Booking } from "@/types/booking";
import { PaymentModal } from "@/components/payments/PaymentModal";

export default function MyRequestsPage() {
  const { user, loading: userLoading } = useUser();
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
      
      // The API already separates bookings into myRequests (where user is customer)
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

      // Update the local state
      setBookings(prev => 
        prev.map(booking => 
          booking.id === bookingId 
            ? { ...booking, status: newStatus as any, updated_at: new Date().toISOString() }
            : booking
        )
      );
    } catch (err: any) {
      console.error("Error updating booking:", err);
      alert(err.message || "Failed to update booking");
    } finally {
      setUpdating(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "confirmed": return "bg-blue-100 text-blue-800 border-blue-200";
      case "in_progress": return "bg-purple-100 text-purple-800 border-purple-200";
      case "completed": return "bg-green-100 text-green-800 border-green-200";
      case "paid": return "bg-green-100 text-green-800 border-green-200";
      case "cancelled": return "bg-gray-100 text-gray-800 border-gray-200";
      case "rejected": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <AlertCircle className="w-4 h-4" />;
      case "confirmed": return <CheckCircle className="w-4 h-4" />;
      case "in_progress": return <Loader2 className="w-4 h-4 animate-spin" />;
      case "completed": return <CheckCircle className="w-4 h-4" />;
      case "paid": return <CheckCircle className="w-4 h-4" />;
      case "cancelled": return <XCircle className="w-4 h-4" />;
      case "rejected": return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
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
  const pendingBookings = bookings.filter(booking => booking.status === "pending");
  const confirmedBookings = bookings.filter(booking => booking.status === "confirmed");
  const paidBookings = bookings.filter(booking => booking.status === "paid");
  const cancelledBookings = bookings.filter(booking => booking.status === "cancelled");

  // Calculate stats
  const totalSpent = bookings
    .filter(booking => booking.status === "paid")
    .reduce((sum, booking) => sum + booking.total_price, 0);

  const thisMonthBookings = bookings.filter(booking => {
    const bookingDate = new Date(booking.created_at);
    const now = new Date();
    return bookingDate.getMonth() === now.getMonth() && 
           bookingDate.getFullYear() === now.getFullYear();
  });

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

  return (
    <DashboardLayout user={user}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-orange-50 to-white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Requests</h1>
            <p className="text-gray-600">Track your bookings with teen entrepreneurs</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{error}</p>
              <Button 
                onClick={fetchBookings}
                variant="outline"
                size="sm"
                className="mt-2 border-red-200 text-red-600 hover:bg-red-50"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Requests</p>
                  <p className="text-2xl font-bold text-gray-900">{allBookings.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingBookings.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Paid</p>
                  <p className="text-2xl font-bold text-gray-900">{paidBookings.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Spent</p>
                  <p className="text-2xl font-bold text-gray-900">{formatPrice(totalSpent)}</p>
                </div>
              </div>
            </div>
          </div>

          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">
                All ({allBookings.length})
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending ({pendingBookings.length})
              </TabsTrigger>
              <TabsTrigger value="confirmed">
                Confirmed ({confirmedBookings.length})
              </TabsTrigger>
              <TabsTrigger value="paid">
                Paid ({paidBookings.length})
              </TabsTrigger>
              <TabsTrigger value="cancelled">
                Cancelled ({cancelledBookings.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array(6).fill(0).map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
                      <div className="h-4 bg-slate-200 rounded mb-2"></div>
                      <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                    </div>
                  ))}
                </div>
              ) : allBookings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allBookings.map((booking) => (
                    <div key={booking.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-1">{booking.service?.title}</h3>
                          <Badge className={`text-xs px-2 py-1 border ${getStatusColor(booking.status)}`}>
                            {getStatusIcon(booking.status)}
                            <span className="ml-1 capitalize">{booking.status}</span>
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">{formatPrice(booking.total_price)}</p>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(booking.requested_date)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>{formatTime(booking.requested_time)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span>{booking.service?.location}</span>
                        </div>
                      </div>

                      {booking.special_instructions && (
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700">
                            <strong>Special Instructions:</strong> {booking.special_instructions}
                          </p>
                        </div>
                      )}

                      {booking.status === "pending" && (
                        <Button
                          onClick={() => updateBookingStatus(booking.id, "cancelled")}
                          variant="outline"
                          size="sm"
                          disabled={updating === booking.id}
                          className="w-full border-red-200 text-red-600 hover:bg-red-50"
                        >
                          {updating === booking.id ? "Cancelling..." : "Cancel Request"}
                        </Button>
                      )}

                      {booking.status === "completed" && (
                        <Button
                          onClick={() => {
                            setSelectedBooking(booking);
                            setPaymentModalOpen(true);
                          }}
                          size="sm"
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Pay Now - {formatPrice(booking.total_price)}
                        </Button>
                      )}

                      {booking.status === "paid" && (
                        <div className="w-full p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                          <div className="flex items-center justify-center text-green-700">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            <span className="text-sm font-medium">Payment Completed</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
                  <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No requests yet</h3>
                  <p className="text-gray-600 mb-6">You haven't requested any services yet.</p>
                  <Button asChild>
                    <a href="/dashboard">Browse Services</a>
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="pending" className="space-y-4">
              {pendingBookings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pendingBookings.map((booking) => (
                    <div key={booking.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-1">{booking.service?.title}</h3>
                          <Badge className={`text-xs px-2 py-1 border ${getStatusColor(booking.status)}`}>
                            {getStatusIcon(booking.status)}
                            <span className="ml-1 capitalize">{booking.status}</span>
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">{formatPrice(booking.total_price)}</p>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(booking.requested_date)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>{formatTime(booking.requested_time)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span>{booking.service?.location}</span>
                        </div>
                      </div>

                      {booking.special_instructions && (
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700">
                            <strong>Special Instructions:</strong> {booking.special_instructions}
                          </p>
                        </div>
                      )}

                      <Button
                        onClick={() => updateBookingStatus(booking.id, "cancelled")}
                        variant="outline"
                        size="sm"
                        disabled={updating === booking.id}
                        className="w-full border-red-200 text-red-600 hover:bg-red-50"
                      >
                        {updating === booking.id ? "Cancelling..." : "Cancel Request"}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
                  <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No pending requests</h3>
                  <p className="text-gray-600">All your requests have been processed.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="confirmed" className="space-y-4">
              {confirmedBookings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {confirmedBookings.map((booking) => (
                    <div key={booking.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-1">{booking.service?.title}</h3>
                          <Badge className={`text-xs px-2 py-1 border ${getStatusColor(booking.status)}`}>
                            {getStatusIcon(booking.status)}
                            <span className="ml-1 capitalize">{booking.status}</span>
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">{formatPrice(booking.total_price)}</p>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(booking.requested_date)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>{formatTime(booking.requested_time)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span>{booking.service?.location}</span>
                        </div>
                      </div>

                      {booking.special_instructions && (
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700">
                            <strong>Special Instructions:</strong> {booking.special_instructions}
                          </p>
                        </div>
                      )}

                      <div className="w-full p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                        <div className="flex items-center justify-center text-blue-700">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          <span className="text-sm font-medium">Confirmed by Provider</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
                  <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No confirmed requests</h3>
                  <p className="text-gray-600">Confirmed bookings will appear here.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="paid" className="space-y-4">
              {paidBookings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paidBookings.map((booking) => (
                    <div key={booking.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-1">{booking.service?.title}</h3>
                          <Badge className={`text-xs px-2 py-1 border ${getStatusColor(booking.status)}`}>
                            {getStatusIcon(booking.status)}
                            <span className="ml-1 capitalize">{booking.status}</span>
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">{formatPrice(booking.total_price)}</p>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(booking.requested_date)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>{formatTime(booking.requested_time)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span>{booking.service?.location}</span>
                        </div>
                      </div>

                      {booking.special_instructions && (
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700">
                            <strong>Special Instructions:</strong> {booking.special_instructions}
                          </p>
                        </div>
                      )}

                      <div className="w-full p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                        <div className="flex items-center justify-center text-green-700">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          <span className="text-sm font-medium">Payment Completed</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
                  <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No paid requests</h3>
                  <p className="text-gray-600">Paid services will appear here.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="cancelled" className="space-y-4">
              {cancelledBookings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {cancelledBookings.map((booking) => (
                    <div key={booking.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-1">{booking.service?.title}</h3>
                          <Badge className={`text-xs px-2 py-1 border ${getStatusColor(booking.status)}`}>
                            {getStatusIcon(booking.status)}
                            <span className="ml-1 capitalize">{booking.status}</span>
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">{formatPrice(booking.total_price)}</p>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(booking.requested_date)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>{formatTime(booking.requested_time)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span>{booking.service?.location}</span>
                        </div>
                      </div>

                      {booking.special_instructions && (
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700">
                            <strong>Special Instructions:</strong> {booking.special_instructions}
                          </p>
                        </div>
                      )}

                      <div className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
                        <div className="flex items-center justify-center text-gray-700">
                          <XCircle className="w-4 h-4 mr-2" />
                          <span className="text-sm font-medium">Request Cancelled</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
                  <XCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No cancelled requests</h3>
                  <p className="text-gray-600">Cancelled requests will appear here.</p>
                </div>
              )}
            </TabsContent>
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
            // Refresh the bookings data after successful payment
            fetchBookings();
            setPaymentModalOpen(false);
            setSelectedBooking(null);
          }}
        />
      )}
    </DashboardLayout>
  );
}