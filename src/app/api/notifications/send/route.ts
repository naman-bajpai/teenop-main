import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { emailService } from "@/lib/email";
import { smsService } from "@/lib/sms";

// API endpoint for sending notifications
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Check for cron authentication (for automated reminders)
    const authHeader = request.headers.get('authorization');
    const isCronRequest = authHeader === `Bearer ${process.env.CRON_SECRET}`;
    
    // Get the current user (only required for non-cron requests)
    let user = null;
    if (!isCronRequest) {
      const { data: authUser, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        return NextResponse.json(
          { success: false, error: "Authentication required" },
          { status: 401 }
        );
      }
      user = authUser;
    }

    const body = await request.json();
    const { type, bookingId, data: notificationData } = body;

    if (!type || !bookingId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get booking details with user information
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        services (
          id,
          title,
          user_id,
          profiles:profiles!services_user_id_fkey (
            first_name,
            last_name,
            email,
            phone
          )
        ),
        profiles:profiles!bookings_user_id_fkey (
          first_name,
          last_name,
          email,
          phone
        )
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    const bookingData = booking as any;
    const service = bookingData.services;
    const customer = bookingData.profiles;
    const provider = service?.profiles;

    // Format date and time
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    };

    const formatTime = (timeString: string) => {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    };

    const formattedDate = formatDate(bookingData.requested_date);
    const formattedTime = formatTime(bookingData.requested_time);
    const timeZone = 'EST'; // You might want to make this configurable

    let result;

    switch (type) {
      case 'service_provider_confirmation':
        if (!provider?.email || !provider?.phone) {
          return NextResponse.json(
            { success: false, error: "Provider contact information not found" },
            { status: 400 }
          );
        }

        // Send email
        const emailResult = await emailService.sendServiceProviderConfirmation({
          providerName: `${provider.first_name} ${provider.last_name}`.trim(),
          providerEmail: provider.email,
          serviceName: service.title,
          buyerName: `${customer.first_name} ${customer.last_name}`.trim(),
          date: formattedDate,
          time: formattedTime,
          timeZone,
          location: service.location || 'Online',
          duration: bookingData.duration,
          totalPrice: bookingData.total_price,
        });

        // Send SMS
        const smsResult = await smsService.sendServiceProviderConfirmation({
          providerPhone: provider.phone,
          serviceName: service.title,
          buyerName: `${customer.first_name} ${customer.last_name}`.trim(),
          date: formattedDate,
          time: formattedTime,
          timeZone,
          location: service.location || 'Online',
        });

        result = { email: emailResult, sms: smsResult };
        break;

      case 'buyer_rejection':
        if (!customer?.email) {
          return NextResponse.json(
            { success: false, error: "Customer email not found" },
            { status: 400 }
          );
        }

        result = await emailService.sendBuyerRejection({
          buyerName: `${customer.first_name} ${customer.last_name}`.trim(),
          buyerEmail: customer.email,
          serviceName: service.title,
        });
        break;

      case 'buyer_24_hour_reminder':
        if (!customer?.email) {
          return NextResponse.json(
            { success: false, error: "Customer email not found" },
            { status: 400 }
          );
        }

        result = await emailService.sendBuyer24HourReminder({
          buyerName: `${customer.first_name} ${customer.last_name}`.trim(),
          buyerEmail: customer.email,
          serviceName: service.title,
          teenName: `${provider.first_name} ${provider.last_name}`.trim(),
          date: formattedDate,
          time: formattedTime,
          timeZone,
          location: service.location || 'Online',
          bookingId: bookingData.id,
        });
        break;

      case 'buyer_3_hour_reminder':
        if (!customer?.email) {
          return NextResponse.json(
            { success: false, error: "Customer email not found" },
            { status: 400 }
          );
        }

        result = await emailService.sendBuyer3HourReminder({
          buyerName: `${customer.first_name} ${customer.last_name}`.trim(),
          buyerEmail: customer.email,
          serviceName: service.title,
          teenName: `${provider.first_name} ${provider.last_name}`.trim(),
          time: formattedTime,
          timeZone,
          location: service.location || 'Online',
          bookingId: bookingData.id,
        });
        break;

      case 'service_provider_24_hour_reminder':
        if (!provider?.email) {
          return NextResponse.json(
            { success: false, error: "Provider email not found" },
            { status: 400 }
          );
        }

        result = await emailService.sendServiceProvider24HourReminder({
          providerName: `${provider.first_name} ${provider.last_name}`.trim(),
          providerEmail: provider.email,
          serviceName: service.title,
          buyerName: `${customer.first_name} ${customer.last_name}`.trim(),
          date: formattedDate,
          time: formattedTime,
          timeZone,
          location: service.location || 'Online',
          bookingId: bookingData.id,
        });
        break;

      case 'service_provider_3_hour_reminder':
        if (!provider?.email) {
          return NextResponse.json(
            { success: false, error: "Provider email not found" },
            { status: 400 }
          );
        }

        result = await emailService.sendServiceProvider3HourReminder({
          providerName: `${provider.first_name} ${provider.last_name}`.trim(),
          providerEmail: provider.email,
          serviceName: service.title,
          buyerName: `${customer.first_name} ${customer.last_name}`.trim(),
          time: formattedTime,
          timeZone,
          location: service.location || 'Online',
          bookingId: bookingData.id,
        });
        break;

      default:
        return NextResponse.json(
          { success: false, error: "Invalid notification type" },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
