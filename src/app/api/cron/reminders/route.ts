import { NextRequest, NextResponse } from "next/server";
import { emailService } from "@/lib/email";
import { createServiceRoleClient } from "@/lib/supabase/server";

const BOOKING_TIME_ZONE = process.env.BOOKING_TIME_ZONE || "America/New_York";
const CRON_INTERVAL_MINUTES = Number(process.env.REMINDER_CRON_INTERVAL_MINUTES || "30");

type ReminderProfile = {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone?: string | null;
};

type ReminderService = {
  id: string;
  title: string | null;
  location: string | null;
  user_id: string;
  profiles: ReminderProfile | null;
};

type ReminderBooking = {
  id: string;
  requested_date: string;
  requested_time: string;
  services: ReminderService | null;
  profiles?: ReminderProfile | null;
};

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    hour12: false,
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second)
  );

  return asUtc - date.getTime();
}

function bookingDateTimeToDate(dateString: string, timeString: string, timeZone = BOOKING_TIME_ZONE) {
  const [year, month, day] = dateString.split("-").map(Number);
  const [hour, minute = 0, second = 0] = timeString.split(":").map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const offsetMs = getTimeZoneOffsetMs(utcGuess, timeZone);

  return new Date(utcGuess.getTime() - offsetMs);
}

function isInWindow(date: Date, start: Date, end: Date) {
  return date >= start && date < end;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function addHours(date: Date, hours: number) {
  return addMinutes(date, hours * 60);
}

function formatDate(dateString: string) {
  return bookingDateTimeToDate(dateString, "12:00").toLocaleDateString("en-US", {
    timeZone: BOOKING_TIME_ZONE,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(timeString: string) {
  const [hours, minutes] = timeString.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

function getTimeZoneLabel(date: Date) {
  const timeZoneName = new Intl.DateTimeFormat("en-US", {
    timeZone: BOOKING_TIME_ZONE,
    timeZoneName: "short",
  })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;

  return timeZoneName || "ET";
}

function displayName(profile: ReminderProfile | null | undefined, fallback: string) {
  const name = `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim();
  return name || fallback;
}

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

    const supabase = createServiceRoleClient();
    const now = new Date();
    const intervalMinutes = Number.isFinite(CRON_INTERVAL_MINUTES) && CRON_INTERVAL_MINUTES > 0
      ? CRON_INTERVAL_MINUTES
      : 30;

    // Vercel runs this every 30 minutes. Each run owns the next 30-minute
    // slice for the 24-hour and 3-hour targets, preventing repeat sends.
    const twentyFourHoursStart = addHours(now, 24);
    const twentyFourHoursEnd = addMinutes(twentyFourHoursStart, intervalMinutes);
    const threeHoursStart = addHours(now, 3);
    const threeHoursEnd = addMinutes(threeHoursStart, intervalMinutes);

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
    const bookings = (allBookings || []) as ReminderBooking[];

    const tomorrowBookings = bookings.filter((booking) => {
      try {
        const bookingDateTime = bookingDateTimeToDate(booking.requested_date, booking.requested_time);
        const isInRange = isInWindow(bookingDateTime, twentyFourHoursStart, twentyFourHoursEnd);
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
    const threeHourBookings = bookings.filter((booking) => {
      try {
        const bookingDateTime = bookingDateTimeToDate(booking.requested_date, booking.requested_time);
        const isInRange = isInWindow(bookingDateTime, threeHoursStart, threeHoursEnd);
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
          const bookingData = booking;
          const service = bookingData.services;
          const customer = bookingData.profiles;
          const provider = service?.profiles;
          const bookingDateTime = bookingDateTimeToDate(bookingData.requested_date, bookingData.requested_time);
          const date = formatDate(bookingData.requested_date);
          const time = formatTime(bookingData.requested_time);
          const timeZone = getTimeZoneLabel(bookingDateTime);

          // Send buyer 24-hour reminder
          if (customer?.email) {
            try {
              const buyerResult = await emailService.sendBuyer24HourReminder({
                buyerName: displayName(customer, "there"),
                buyerEmail: customer.email,
                serviceName: service?.title || "Service",
                teenName: displayName(provider, "Teen Provider"),
                date,
                time,
                timeZone,
                location: service?.location || "Online",
                bookingId: bookingData.id,
              });

              if (buyerResult.success) {
                results.tomorrowReminders++;
                console.log(`Sent 24-hour reminder to buyer for booking ${bookingData.id}`);
              } else {
                results.errors.push(`Buyer 24h reminder failed for booking ${bookingData.id}: ${buyerResult.error || 'Unknown error'}`);
              }
            } catch (emailError) {
              results.errors.push(`Buyer 24h reminder email error for booking ${bookingData.id}: ${emailError}`);
            }
          }

          // Send service provider 24-hour reminder (email)
          if (provider?.email) {
            try {
              const providerResult = await emailService.sendServiceProvider24HourReminder({
                providerName: displayName(provider, "Provider"),
                providerEmail: provider.email,
                serviceName: service?.title || "Service",
                buyerName: displayName(customer, "Customer"),
                date,
                time,
                timeZone,
                location: service?.location || "Online",
                bookingId: bookingData.id,
              });

              if (providerResult.success) {
                results.tomorrowReminders++;
                console.log(`Sent 24-hour reminder email to provider for booking ${bookingData.id}`);
              } else {
                results.errors.push(`Provider 24h reminder failed for booking ${bookingData.id}: ${providerResult.error || 'Unknown error'}`);
              }
            } catch (emailError) {
              results.errors.push(`Provider 24h reminder email error for booking ${bookingData.id}: ${emailError}`);
            }
          }
        } catch (error) {
          console.error("Error sending 24-hour reminder:", error);
          results.errors.push(`24-hour reminder error for booking ${booking.id}: ${error}`);
        }
      }
    }

    // Send 3-hour reminders
    if (threeHourBookings && threeHourBookings.length > 0) {
      for (const booking of threeHourBookings) {
        try {
          const bookingData = booking;
          const service = bookingData.services;
          const customer = bookingData.profiles;
          const provider = service?.profiles;
          const bookingDateTime = bookingDateTimeToDate(bookingData.requested_date, bookingData.requested_time);
          const time = formatTime(bookingData.requested_time);
          const timeZone = getTimeZoneLabel(bookingDateTime);

          // Send buyer 3-hour reminder
          if (customer?.email) {
            try {
              const buyerResult = await emailService.sendBuyer3HourReminder({
                buyerName: displayName(customer, "there"),
                buyerEmail: customer.email,
                serviceName: service?.title || "Service",
                teenName: displayName(provider, "Teen Provider"),
                time,
                timeZone,
                location: service?.location || "Online",
                bookingId: bookingData.id,
              });

              if (buyerResult.success) {
                results.threeHourReminders++;
                console.log(`Sent 3-hour reminder to buyer for booking ${bookingData.id}`);
              } else {
                results.errors.push(`Buyer 3h reminder failed for booking ${bookingData.id}: ${buyerResult.error || 'Unknown error'}`);
              }
            } catch (emailError) {
              results.errors.push(`Buyer 3h reminder email error for booking ${bookingData.id}: ${emailError}`);
            }
          }

          // Send service provider 3-hour reminder (email)
          if (provider?.email) {
            try {
              const providerResult = await emailService.sendServiceProvider3HourReminder({
                providerName: displayName(provider, "Provider"),
                providerEmail: provider.email,
                serviceName: service?.title || "Service",
                buyerName: displayName(customer, "Customer"),
                time,
                timeZone,
                location: service?.location || "Online",
                bookingId: bookingData.id,
              });

              if (providerResult.success) {
                results.threeHourReminders++;
                console.log(`Sent 3-hour reminder email to provider for booking ${bookingData.id}`);
              } else {
                results.errors.push(`Provider 3h reminder failed for booking ${bookingData.id}: ${providerResult.error || 'Unknown error'}`);
              }
            } catch (emailError) {
              results.errors.push(`Provider 3h reminder email error for booking ${bookingData.id}: ${emailError}`);
            }
          }
        } catch (error) {
          console.error("Error sending 3-hour reminder:", error);
          results.errors.push(`3-hour reminder error for booking ${booking.id}: ${error}`);
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
      const pastDueBookings = (paidBookings as ReminderBooking[]).filter((booking) => {
        try {
          const bookingDateTime = bookingDateTimeToDate(booking.requested_date, booking.requested_time);
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
          const bookingData = booking;
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
          results.errors.push(`Completion reminder error for booking ${booking.id}: ${error}`);
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
