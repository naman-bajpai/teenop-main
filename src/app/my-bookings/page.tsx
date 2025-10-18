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
  CreditCard
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useUser } from "@/hooks/useUser";
import { Booking } from "@/types/booking";
import { PaymentModal } from "@/components/payments/PaymentModal";

export default function MyBookingsPage() {
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
      
      setBookings(result.bookings || []);
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

  // Separate bookings into requested and received
  const requestedBookings = bookings.filter(booking => booking.user_id === user?.id);
  const receivedBookings = bookings.filter(booking => booking.service?.user_id === user?.id); 

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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Bookings</h1>
            <p className="text-gray-600">Manage your service requests and bookings</p>
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

          <Tabs defaultValue="requested" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="requested">
                My Requests ({requestedBookings.length})
              </TabsTrigger>
              <TabsTrigger value="received">
                Received Requests ({receivedBookings.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="requested" className="space-y-4">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array(6).fill(0).map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
                      <div className="h-4 bg-slate-200 rounded mb-2"></div>
                      <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                    </div>
                  ))}
                </div>
              ) : requestedBookings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {requestedBookings.map((booking) => (
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
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No bookings yet</h3>
                  <p className="text-gray-600 mb-6">You haven't requested any services yet.</p>
                  <Button asChild>
                    <a href="/dashboard">Browse Services</a>
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="received" className="space-y-4">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array(6).fill(0).map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
                      <div className="h-4 bg-slate-200 rounded mb-2"></div>
                      <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                    </div>
                  ))}
                </div>
              ) : receivedBookings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {receivedBookings.map((booking) => (
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
                          <User className="w-4 h-4" />
                          <span>{booking.user?.first_name} {booking.user?.last_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(booking.requested_date)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>{formatTime(booking.requested_time)}</span>
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
                        <div className="flex gap-2">
                          <Button
                            onClick={() => updateBookingStatus(booking.id, "confirmed")}
                            size="sm"
                            disabled={updating === booking.id}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            {updating === booking.id ? "Updating..." : "Confirm"}
                          </Button>
                          <Button
                            onClick={() => updateBookingStatus(booking.id, "rejected")}
                            variant="outline"
                            size="sm"
                            disabled={updating === booking.id}
                            className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                          >
                            {updating === booking.id ? "Updating..." : "Reject"}
                          </Button>
                        </div>
                      )}

                      {booking.status === "confirmed" && (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => updateBookingStatus(booking.id, "in_progress")}
                            size="sm"
                            disabled={updating === booking.id}
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                          >
                            {updating === booking.id ? "Updating..." : "Start Service"}
                          </Button>
                        </div>
                      )}

                      {booking.status === "in_progress" && (
                        <Button
                          onClick={() => updateBookingStatus(booking.id, "completed")}
                          size="sm"
                          disabled={updating === booking.id}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          {updating === booking.id ? "Updating..." : "Mark Complete"}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
                  <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No booking requests</h3>
                  <p className="text-gray-600 mb-6">You haven't received any booking requests yet.</p>
                  <Button asChild>
                    <a href="/provider">Create a Service</a>
                  </Button>
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
