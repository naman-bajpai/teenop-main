"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useUser } from "@/hooks/useUser";
import MessageDialog from "@/components/messaging/MessageDialog";
import {
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  MapPin,
  MessageCircle,
  Phone,
  Mail,
  User,
  Star,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

interface BookingDetails {
  id: string;
  service_id: string;
  user_id: string;
  status: string;
  requested_date: string;
  requested_time: string;
  duration: number;
  total_price: number;
  special_instructions: string;
  created_at: string;
  updated_at: string;
  service: {
    id: string;
    title: string;
    description: string;
    price: number;
    pricing_model: string;
    location: string;
    category: string;
    duration: number;
    user_id: string;
    profiles?: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
      avatar_url?: string;
    };
  };
  customer: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    avatar_url?: string;
  };
  provider: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    avatar_url?: string;
  };
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "confirmed":
      return "bg-green-100 text-green-800";
    case "rejected":
      return "bg-red-100 text-red-800";
    case "completed":
      return "bg-gray-100 text-gray-800";
    case "cancelled":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "pending":
      return <AlertCircle className="w-4 h-4" />;
    case "confirmed":
      return <CheckCircle className="w-4 h-4" />;
    case "rejected":
      return <XCircle className="w-4 h-4" />;
    case "completed":
      return <CheckCircle className="w-4 h-4" />;
    case "cancelled":
      return <XCircle className="w-4 h-4" />;
    default:
      return <AlertCircle className="w-4 h-4" />;
  }
};

export default function BookingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: userLoading, error: userError } = useUser();
  const { toast } = useToast();
  
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);

  const bookingId = params.id as string;

  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        setLoading(true);
        console.log("Fetching booking details for ID:", bookingId);
        console.log("User:", user);
        console.log("User ID:", user?.id);
        
        const response = await fetch(`/api/bookings/${bookingId}`, {
          cache: "no-store",
          credentials: "include" // Ensure cookies are sent
        });
        
        console.log("Response status:", response.status);
        console.log("Response headers:", Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
          console.error("API Error:", errorData);
          throw new Error(errorData.error || `Failed to fetch booking details (${response.status})`);
        }
        
        const data = await response.json();
        console.log("Booking data:", data);
        
        if (data.success) {
          setBooking(data.booking);
        } else {
          throw new Error(data.error || "Failed to load booking");
        }
      } catch (error: any) {
        console.error("Error fetching booking details:", error);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
        // Don't redirect immediately, let user see the error
        // router.push("/my-teen-hustle");
      } finally {
        setLoading(false);
      }
    };

    if (bookingId && user) {
      console.log("Starting fetch with bookingId:", bookingId, "and user:", user.id);
      fetchBookingDetails();
    } else {
      console.log("Not fetching - bookingId:", bookingId, "user:", user);
    }
  }, [bookingId, user, toast, router]);

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      setActionLoading(true);
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update booking");
      }

      const data = await response.json();
      if (data.success) {
        setBooking(data.booking);
        toast({
          title: "Success",
          description: `Booking ${newStatus} successfully`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

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

  const isProvider = user && booking && booking.service.user_id === user.id;
  const isCustomer = user && booking && booking.user_id === user.id;

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading booking details...</p>
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

  if (!booking && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Booking not found or you don't have permission to view it</p>
          <p className="text-sm text-gray-500 mb-4">Booking ID: {bookingId}</p>
          <Button onClick={() => router.push("/my-teen-hustle")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to My Teen Hustle
          </Button>
        </div>
      </div>
    );
  }

  // Guard clause to ensure booking exists
  if (!booking) {
    return null;
  }

  const otherPerson = isProvider ? booking.customer : booking.provider;
  const otherPersonName = otherPerson ? 
    [otherPerson.first_name, otherPerson.last_name].filter(Boolean).join(" ").trim() || "User" : 
    "User";

  return (
    <DashboardLayout user={user}>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Booking Details
              </h1>
              <p className="text-gray-600">
                {booking.service.title} • {booking.service.category}
              </p>
            </div>
            <Badge className={`${getStatusColor(booking.status)} flex items-center gap-2`}>
              {getStatusIcon(booking.status)}
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Service Details */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Service Details</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900">{booking.service.title}</h3>
                  <p className="text-gray-600 mt-1">{booking.service.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <DollarSign className="w-4 h-4" />
                    <span className="font-semibold">${booking.service.price}</span>
                    <span className="text-xs text-gray-500">
                      /{booking.service.pricing_model === 'per_hour' ? 'hr' : 'job'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    {booking.service.duration} minutes
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    {booking.service.location}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    {new Date(booking.requested_date).toLocaleDateString()} at {formatTime(booking.requested_time)}
                  </div>
                </div>
              </div>
            </div>

            {/* Special Instructions */}
            {booking.special_instructions && (
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Special Instructions</h2>
                <p className="text-gray-700">{booking.special_instructions}</p>
              </div>
            )}

            {/* Actions */}
            {booking.status === "pending" && isProvider && (
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Actions</h2>
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleStatusUpdate("confirmed")}
                    disabled={actionLoading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Accept Booking
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleStatusUpdate("rejected")}
                    disabled={actionLoading}
                    className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject Booking
                  </Button>
                </div>
              </div>
            )}

            {booking.status === "confirmed" && isProvider && (
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Actions</h2>
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleStatusUpdate("completed")}
                    disabled={actionLoading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark as Completed
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Information */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {isProvider ? "Customer" : "Service Provider"}
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                    {otherPerson?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={otherPerson.avatar_url}
                        alt={otherPersonName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{otherPersonName}</h3>
                    <p className="text-sm text-gray-600">
                      {isProvider ? "Customer" : "Service Provider"}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4" />
                    <span>{otherPerson?.email || "Email not provided"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4" />
                    <span>{otherPerson?.phone || "Phone not provided"}</span>
                  </div>
                </div>

                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => setMessageDialogOpen(true)}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
              </div>
            </div>

            {/* Booking Summary */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Booking Summary</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Service</span>
                  <span className="font-medium">${booking.service.price}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Duration</span>
                  <span className="font-medium">{booking.duration} min</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Pricing</span>
                  <span className="font-medium">
                    {booking.service.pricing_model === 'per_hour' ? 'Per Hour' : 'Per Job'}
                  </span>
                </div>
                <hr className="border-gray-200" />
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>${booking.total_price}</span>
                </div>
              </div>
            </div>

            {/* Booking Timeline */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Timeline</h2>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Booking Created</p>
                    <p className="text-xs text-gray-600">
                      {new Date(booking.created_at).toLocaleDateString()} at{" "}
                      {new Date(booking.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                
                {booking.status !== "pending" && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Status Updated to {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </p>
                      <p className="text-xs text-gray-600">
                        {new Date(booking.updated_at).toLocaleDateString()} at{" "}
                        {new Date(booking.updated_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Message Dialog */}
        {booking && otherPerson && user && (
          <MessageDialog
            open={messageDialogOpen}
            onOpenChange={setMessageDialogOpen}
            bookingId={booking.id}
            otherPerson={otherPerson}
            currentUserId={user.id}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
