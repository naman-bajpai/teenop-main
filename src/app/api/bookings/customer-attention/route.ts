import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

function isBookingExpired(booking: {
  status: string;
  requested_date: string;
  requested_time: string;
  alternative_date?: string | null;
  alternative_time?: string | null;
}): boolean {
  try {
    if (
      booking.status === "alternative_proposed" &&
      booking.alternative_date &&
      booking.alternative_time
    ) {
      return new Date(`${booking.alternative_date}T${booking.alternative_time}`) < new Date();
    }
    return new Date(`${booking.requested_date}T${booking.requested_time}`) < new Date();
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    const { data: bookings, error: bookingError } = await supabase
      .from("bookings")
      .select("id, status, requested_date, requested_time, alternative_date, alternative_time")
      .eq("user_id" as any, user.id as any);

    if (bookingError) {
      return NextResponse.json({ success: false, error: "Failed to load bookings" }, { status: 500 });
    }

    const bookingEvents = (bookings || []).filter((b: any) => {
      // Parent attention is only for requests that currently need a customer decision/action.
      if (b.status === "confirmed") return !isBookingExpired(b);
      if (b.status === "alternative_proposed") {
        if (!b.alternative_date || !b.alternative_time) return false;
        return !isBookingExpired(b);
      }
      return false;
    }).length;

    const { data: quoteRequests, error: quoteError } = await supabase
      .from("quote_requests")
      .select("status")
      .eq("customer_id" as any, user.id as any)
      .in("status" as any, ["quoted"] as any);

    const quoteEvents = quoteError ? 0 : (quoteRequests || []).length;

    const completedBookingIdsNeedingReview = (bookings || [])
      .filter((b: any) => b.status === "completed")
      .map((b: any) => b.id);

    let reviewEvents = 0;
    if (completedBookingIdsNeedingReview.length > 0) {
      const { data: existingReviews, error: reviewError } = await supabase
        .from("reviews")
        .select("booking_id")
        .in("booking_id" as any, completedBookingIdsNeedingReview as any);

      if (!reviewError) {
        const reviewedBookingIds = new Set((existingReviews || []).map((r: any) => r.booking_id));
        reviewEvents = completedBookingIdsNeedingReview.filter((id: string) => !reviewedBookingIds.has(id)).length;
      }
    }

    return NextResponse.json({
      success: true,
      count: bookingEvents + quoteEvents + reviewEvents,
    });
  } catch (e) {
    console.error("customer-attention:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
