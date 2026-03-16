import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// Cron job endpoint for sending reminder notifications
export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    // Vercel sends Authorization: Bearer <CRON_SECRET> when configured in vercel.json
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = await createServerClient();
    const now = new Date();
    
    // Calculate time ranges for reminders (24 hours ± 1 hour window, 3 hours ± 30 min window, 1 hour ± 15 min window)
    const twentyFourHoursFromNow = new Date(now);
    twentyFourHoursFromNow.setHours(twentyFourHoursFromNow.getHours() + 24);
    
    const twentyFourHoursStart = new Date(twentyFourHoursFromNow);
    twentyFourHoursStart.setHours(twentyFourHoursStart.getHours() - 1);
    
    const twentyFourHoursEnd = new Date(twentyFourHoursFromNow);
    twentyFourHoursEnd.setHours(twentyFourHoursEnd.getHours() + 1);
    
    const threeHoursFromNow = new Date(now);
    threeHoursFromNow.setHours(threeHoursFromNow.getHours() + 3);
    
    const threeHoursStart = new Date(threeHoursFromNow);
    threeHoursStart.setMinutes(threeHoursStart.getMinutes() - 30);
    
    const threeHoursEnd = new Date(threeHoursFromNow);
    threeHoursEnd.setMinutes(threeHoursEnd.getMinutes() + 30);

    // Get all confirmed and paid bookings that might need reminders
    // We'll filter by date/time in JavaScript since we need to combine date and time
    // We need to look ahead enough to catch 24-hour reminders (up to 25 hours from now)
    const maxDate = new Date(now);
    maxDate.setHours(maxDate.getHours() + 25);
    
    const { data: allBookings, error: bookingsError } = await supabase
      .from("bookings")
      .select(`
        *,
        services (
          id,
          title,
          location,
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
      .in("status", ["confirmed", "paid"])
      .gte("requested_date", now.toISOString().split('T')[0])
      .lte("requested_date", maxDate.toISOString().split('T')[0]);

    if (bookingsError) {
      console.error("Error fetching bookings:", bookingsError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch bookings" },
        { status: 500 }
      );
    }

    console.log(`Found ${allBookings?.length || 0} confirmed/paid bookings to check for reminders`);

    // Filter bookings for 24-hour reminders (24 hours ± 1 hour)
    const tomorrowBookings = (allBookings || []).filter((booking: any) => {
      try {
        const bookingDateTime = new Date(`${booking.requested_date}T${booking.requested_time}`);
        const isInRange = bookingDateTime >= twentyFourHoursStart && bookingDateTime <= twentyFourHoursEnd;
        if (isInRange) {
          console.log(`Booking ${booking.id} is in 24-hour reminder window: ${bookingDateTime.toISOString()}`);
        }
        return isInRange;
      } catch (error) {
        console.error(`Error parsing date/time for booking ${booking.id}:`, error);
        return false;
      }
    });

    // Filter bookings for 3-hour reminders (3 hours ± 30 minutes)
    const threeHourBookings = (allBookings || []).filter((booking: any) => {
      try {
        const bookingDateTime = new Date(`${booking.requested_date}T${booking.requested_time}`);
        const isInRange = bookingDateTime >= threeHoursStart && bookingDateTime <= threeHoursEnd;
        if (isInRange) {
          console.log(`Booking ${booking.id} is in 3-hour reminder window: ${bookingDateTime.toISOString()}`);
        }
        return isInRange;
      } catch (error) {
        console.error(`Error parsing date/time for booking ${booking.id}:`, error);
        return false;
      }
    });

    console.log(`Filtered to ${tomorrowBookings.length} bookings for 24-hour reminders and ${threeHourBookings.length} for 3-hour reminders`);

    const results = {
      tomorrowReminders: 0,
      threeHourReminders: 0,
      errors: [] as string[]
    };

    // Send 24-hour reminders
    if (tomorrowBookings && tomorrowBookings.length > 0) {
      for (const booking of tomorrowBookings) {
        try {
          const bookingData = booking as any;
          const service = bookingData.services;
          const customer = bookingData.profiles;
          const provider = service?.profiles;

          // Send buyer 24-hour reminder
          if (customer?.email) {
            try {
              const buyerResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/send`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${process.env.CRON_SECRET}`
                },
                body: JSON.stringify({
                  type: 'buyer_24_hour_reminder',
                  bookingId: bookingData.id
                })
              });

              if (buyerResponse.ok) {
                results.tomorrowReminders++;
                console.log(`Sent 24-hour reminder to buyer for booking ${bookingData.id}`);
              } else {
                const errorData = await buyerResponse.json().catch(() => ({}));
                results.errors.push(`Buyer 24h reminder failed for booking ${bookingData.id}: ${buyerResponse.status} - ${errorData.error || 'Unknown error'}`);
              }
            } catch (fetchError) {
              results.errors.push(`Buyer 24h reminder fetch error for booking ${bookingData.id}: ${fetchError}`);
            }
          }

          // Send service provider 24-hour reminder (email)
          if (provider?.email) {
            try {
              const providerResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/send`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${process.env.CRON_SECRET}`
                },
                body: JSON.stringify({
                  type: 'service_provider_24_hour_reminder',
                  bookingId: bookingData.id
                })
              });

              if (providerResponse.ok) {
                results.tomorrowReminders++;
                console.log(`Sent 24-hour reminder email to provider for booking ${bookingData.id}`);
              } else {
                const errorData = await providerResponse.json().catch(() => ({}));
                results.errors.push(`Provider 24h reminder failed for booking ${bookingData.id}: ${providerResponse.status} - ${errorData.error || 'Unknown error'}`);
              }
            } catch (fetchError) {
              results.errors.push(`Provider 24h reminder fetch error for booking ${bookingData.id}: ${fetchError}`);
            }
          }
        } catch (error) {
          console.error("Error sending 24-hour reminder:", error);
          results.errors.push(`24-hour reminder error for booking ${(booking as any).id}: ${error}`);
        }
      }
    }

    // Send 3-hour reminders
    if (threeHourBookings && threeHourBookings.length > 0) {
      for (const booking of threeHourBookings) {
        try {
          const bookingData = booking as any;
          const service = bookingData.services;
          const customer = bookingData.profiles;
          const provider = service?.profiles;

          // Send buyer 3-hour reminder
          if (customer?.email) {
            try {
              const buyerResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/send`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${process.env.CRON_SECRET}`
                },
                body: JSON.stringify({
                  type: 'buyer_3_hour_reminder',
                  bookingId: bookingData.id
                })
              });

              if (buyerResponse.ok) {
                results.threeHourReminders++;
                console.log(`Sent 3-hour reminder to buyer for booking ${bookingData.id}`);
              } else {
                const errorData = await buyerResponse.json().catch(() => ({}));
                results.errors.push(`Buyer 3h reminder failed for booking ${bookingData.id}: ${buyerResponse.status} - ${errorData.error || 'Unknown error'}`);
              }
            } catch (fetchError) {
              results.errors.push(`Buyer 3h reminder fetch error for booking ${bookingData.id}: ${fetchError}`);
            }
          }

          // Send service provider 3-hour reminder (email)
          if (provider?.email) {
            try {
              const providerResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/send`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${process.env.CRON_SECRET}`
                },
                body: JSON.stringify({
                  type: 'service_provider_3_hour_reminder',
                  bookingId: bookingData.id
                })
              });

              if (providerResponse.ok) {
                results.threeHourReminders++;
                console.log(`Sent 3-hour reminder email to provider for booking ${bookingData.id}`);
              } else {
                const errorData = await providerResponse.json().catch(() => ({}));
                results.errors.push(`Provider 3h reminder failed for booking ${bookingData.id}: ${providerResponse.status} - ${errorData.error || 'Unknown error'}`);
              }
            } catch (fetchError) {
              results.errors.push(`Provider 3h reminder fetch error for booking ${bookingData.id}: ${fetchError}`);
            }
          }
        } catch (error) {
          console.error("Error sending 3-hour reminder:", error);
          results.errors.push(`3-hour reminder error for booking ${(booking as any).id}: ${error}`);
        }
      }
    }

    // Check for paid bookings that have passed their scheduled time and need completion
    const { data: paidBookings, error: paidBookingsError } = await supabase
      .from("bookings")
      .select(`
        *,
        services (
          id,
          title,
          location,
          user_id,
          profiles:profiles!services_user_id_fkey (
            first_name,
            last_name,
            email,
            phone
          )
        )
      `)
      .eq("status", "paid")
      .lte("requested_date", now.toISOString().split('T')[0]);

    let completionReminders = 0;
    if (!paidBookingsError && paidBookings) {
      // Filter for bookings that have passed their scheduled time (date + time has passed)
      const pastDueBookings = paidBookings.filter((booking: any) => {
        try {
          const bookingDateTime = new Date(`${booking.requested_date}T${booking.requested_time}`);
          // Check if booking time has passed (at least 1 hour after scheduled time to give buffer)
          const oneHourAfterBooking = new Date(bookingDateTime);
          oneHourAfterBooking.setHours(oneHourAfterBooking.getHours() + 1);
          return now >= oneHourAfterBooking;
        } catch (error) {
          console.error(`Error parsing date/time for booking ${booking.id}:`, error);
          return false;
        }
      });

      console.log(`Found ${pastDueBookings.length} paid bookings that need completion reminders`);

      // Send completion reminder emails to service providers
      for (const booking of pastDueBookings) {
        try {
          const bookingData = booking as any;
          const service = bookingData.services;
          const provider = service?.profiles;

          if (provider?.email) {
            try {
              const { emailService } = await import("@/lib/email");
              await emailService.sendServiceProviderCompletionReminder({
                providerName: `${provider.first_name || ''} ${provider.last_name || ''}`.trim() || 'Provider',
                providerEmail: provider.email,
                serviceName: service?.title || 'Service',
                bookingId: bookingData.id
              });

              completionReminders++;
              console.log(`Sent completion reminder to provider for booking ${bookingData.id}`);
            } catch (emailError) {
              console.error(`Error sending completion reminder email for booking ${bookingData.id}:`, emailError);
              results.errors.push(`Completion reminder failed for booking ${bookingData.id}: ${emailError}`);
            }
          }
        } catch (error) {
          console.error("Error processing completion reminder:", error);
          results.errors.push(`Completion reminder error for booking ${(booking as any).id}: ${error}`);
        }
      }
    }

    console.log(`Reminder cron job completed: ${results.tomorrowReminders} 24-hour reminders, ${results.threeHourReminders} 3-hour reminders, ${completionReminders} completion reminders, ${results.errors.length} errors`);

    return NextResponse.json({
      success: true,
      message: "Reminder notifications processed",
      results: {
        ...results,
        processed24h: tomorrowBookings.length,
        processed3h: threeHourBookings.length,
        completionReminders
      }
    });

  } catch (error) {
    console.error("Error in reminder cron job:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
