"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Clock, MapPin, Calendar, DollarSign, User, Phone, Mail } from "lucide-react";
import MessageDialog from "@/components/messaging/MessageDialog";
import { useUser } from "@/hooks/useUser";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Image from "next/image";

interface Service {
  id: string;
  title: string;
  description: string;
  category: string;
  price_per_hour: number;
  pricing_model: string;
  provider_id: string;
  provider: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
    avatar_url?: string;
  };
  images: string[];
}

interface Booking {
  id: string;
  user_id: string;
  status: string;
  requested_date: string;
  requested_time: string;
  duration: number;
  total_price: number;
  special_instructions?: string;
  created_at: string;
  service: Service;
}

export default function OngoingRequestsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const { user, loading: userLoading, error: userError } = useUser();

  useEffect(() => {
    fetchOngoingRequests();
  }, []);

  const fetchOngoingRequests = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('No user found');
        return;
      }

      console.log('Fetching bookings for user:', user.id);

      // Get bookings where user is either the customer or the service provider
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .in('status', ['confirmed', 'in_progress'])
        .or(`user_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        return;
      }

      console.log('Bookings found:', bookingsData?.length || 0);

      // Get services where user is the provider
      const { data: providerServices, error: providerServicesError } = await supabase
        .from('services')
        .select('*')
        .eq('user_id', user.id);

      if (providerServicesError) {
        console.error('Error fetching provider services:', providerServicesError);
        return;
      }

      // Get bookings for services where user is the provider
      let providerBookings: any[] = [];
      if (providerServices && providerServices.length > 0) {
        const serviceIds = (providerServices as any[]).map(service => service.id);
        const { data: providerBookingsData, error: providerBookingsError } = await supabase
          .from('bookings')
          .select('*')
          .in('service_id', serviceIds)
          .in('status', ['confirmed', 'in_progress'])
          .order('created_at', { ascending: false });

        if (providerBookingsError) {
          console.error('Error fetching provider bookings:', providerBookingsError);
        } else {
          providerBookings = providerBookingsData || [];
        }
      }

      // Combine all bookings
      const allBookings = [...(bookingsData || []), ...providerBookings];
      console.log('Total bookings:', allBookings.length);

      if (allBookings.length > 0) {
        // Get all service IDs
        const serviceIds = allBookings.map(booking => booking.service_id);
        
        // Get services with their providers
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select(`
            *,
            provider:profiles!services_user_id_fkey(
              id,
              first_name,
              last_name,
              phone,
              email,
              avatar_url
            )
          `)
          .in('id', serviceIds);

        if (servicesError) {
          console.error('Error fetching services:', servicesError);
          return;
        }

        // Combine bookings with their services
        const bookingsWithServices = allBookings.map((booking: any) => {
          const service = servicesData?.find((s: any) => s.id === booking.service_id);
          return {
            ...booking,
            service: service || null
          };
        }).filter((booking: any) => booking.service !== null);

        setBookings(bookingsWithServices);
      } else {
        setBookings([]);
      }
    } catch (error) {
      console.error('Error fetching ongoing requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmed';
      case 'in_progress':
        return 'In Progress';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const openMessageDialog = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsMessageDialogOpen(true);
  };

  // Show loading state while user data is being fetched
  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#434c9d] mx-auto mb-4"></div>
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

  if (loading) {
    return (
      <DashboardLayout user={user}>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#434c9d]"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user}>
      <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#434c9d] mb-2">Ongoing Requests</h1>
        <p className="text-gray-600">Manage your active service requests and bookings</p>
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Ongoing Requests</h3>
          <p className="text-gray-500">You don't have any active service requests at the moment.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {bookings.map((booking) => (
            <Card key={booking.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-[#434c9d] mb-1">
                      {booking.service.title}
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-600">
                      {booking.service.description}
                    </CardDescription>
                  </div>
                  <Badge className={`${getStatusColor(booking.status)} text-xs font-medium`}>
                    {getStatusText(booking.status)}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Service Details */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Date:</span>
                    <span>{formatDate(booking.requested_date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Time:</span>
                    <span>{formatTime(booking.requested_time)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Total:</span>
                    <span className="font-semibold text-[#434c9d]">${booking.total_price}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Duration:</span>
                    <span>{booking.duration} {booking.service.pricing_model === 'per_hour' ? 'hours' : 'job'}</span>
                  </div>
                </div>

                {/* Provider/Customer Info */}
                <div className="border-t pt-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#23a699] flex items-center justify-center">
                      {booking.service.provider.avatar_url ? (
                        <Image
                          src={booking.service.provider.avatar_url}
                          alt="Provider"
                          width={40}
                          height={40}
                          className="rounded-full"
                        />
                      ) : (
                        <span className="text-white font-semibold text-sm">
                          {booking.service.provider.first_name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-900">
                        {booking.service.provider.first_name} {booking.service.provider.last_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {user?.id === booking.service.provider_id ? 'Customer' : 'Service Provider'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Special Instructions */}
                {booking.special_instructions && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-gray-700 mb-1">Special Instructions:</p>
                    <p className="text-xs text-gray-600">{booking.special_instructions}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => openMessageDialog(booking)}
                    className="flex-1 bg-[#434c9d] hover:bg-[#434c9d]/90 text-white"
                    size="sm"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Message Dialog */}
      {selectedBooking && (
        <MessageDialog
          isOpen={isMessageDialogOpen}
          onClose={() => {
            setIsMessageDialogOpen(false);
            setSelectedBooking(null);
          }}
          recipientId={
            user?.id === selectedBooking.service.provider_id 
              ? selectedBooking.user_id 
              : selectedBooking.service.provider_id
          }
          recipientName={
            user?.id === selectedBooking.service.provider_id 
              ? 'Customer' 
              : `${selectedBooking.service.provider.first_name} ${selectedBooking.service.provider.last_name}`
          }
          bookingId={selectedBooking.id}
        />
      )}
      </div>
    </DashboardLayout>
  );
}
