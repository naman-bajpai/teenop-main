import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// Cron job endpoint for sending reminder notifications
export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request (you might want to add authentication)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = await createServerClient();
    const now = new Date();
    
    // Calculate time ranges for reminders
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);
    
    const threeHoursFromNow = new Date(now);
    threeHoursFromNow.setHours(threeHoursFromNow.getHours() + 3);
    
    const threeHoursFromNowEnd = new Date(threeHoursFromNow);
    threeHoursFromNowEnd.setMinutes(threeHoursFromNowEnd.getMinutes() + 30);

    // Get bookings for tomorrow (24-hour reminders)
    const { data: tomorrowBookings, error: tomorrowError } = await supabase
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
      .eq("status", "confirmed")
      .gte("requested_date", tomorrow.toISOString().split('T')[0])
      .lte("requested_date", tomorrowEnd.toISOString().split('T')[0]);

    if (tomorrowError) {
      console.error("Error fetching tomorrow bookings:", tomorrowError);
    }

    // Get bookings for 3 hours from now
    const { data: threeHourBookings, error: threeHourError } = await supabase
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
      .eq("status", "confirmed")
      .gte("requested_date", now.toISOString().split('T')[0])
      .lte("requested_date", threeHoursFromNowEnd.toISOString().split('T')[0]);

    if (threeHourError) {
      console.error("Error fetching 3-hour bookings:", threeHourError);
    }

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
            }
          }

          // Send service provider 24-hour reminder
          if (provider?.phone) {
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
            }
          }

          // Send service provider 3-hour reminder
          if (provider?.phone) {
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
            }
          }
        } catch (error) {
          console.error("Error sending 3-hour reminder:", error);
          results.errors.push(`3-hour reminder error for booking ${(booking as any).id}: ${error}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Reminder notifications processed",
      results
    });

  } catch (error) {
    console.error("Error in reminder cron job:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
