import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

/** Match my-teen-hustle: expiry uses requested date/time only. */
function isBookingExpired(booking: {
  requested_date: string;
  requested_time: string;
}): boolean {
  try {
    const bookingDateTime = new Date(`${booking.requested_date}T${booking.requested_time}`);
    return bookingDateTime < new Date();
  } catch {
    return false;
  }
}

/**
 * Count of items needing a teen provider's attention:
 * incoming bookings (pending / confirmed / alternative_proposed, not expired)
 * plus pending quote requests for their services.
 */
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

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();

    if ((profile as { role?: string } | null)?.role !== "teen") {
      return NextResponse.json({ success: true, count: 0 });
    }

    const { data: incomingBookingsData, error: incomingError } = await supabase
      .from("bookings")
      .select(
        `
        id,
        status,
        requested_date,
        requested_time,
        services!inner (
          user_id
        )
      `
      )
      .eq("services.user_id" as any, user.id as any);

    if (incomingError) {
      console.warn("provider-attention bookings:", incomingError);
    }

    const incoming = (incomingBookingsData as Array<{
      status: string;
      requested_date: string;
      requested_time: string;
    }>) || [];

    let bookingCount = 0;
    for (const b of incoming) {
      if (b.status !== "pending" && b.status !== "confirmed" && b.status !== "alternative_proposed") continue;
      if (isBookingExpired(b)) continue;
      bookingCount++;
    }

    const { data: userServices } = await supabase.from("services").select("id").eq("user_id" as any, user.id as any);

    const serviceIds = (userServices as { id: string }[] | null)?.map((s) => s.id) ?? [];
    let quoteCount = 0;
    if (serviceIds.length > 0) {
      const { count, error: qErr } = await supabase
        .from("quote_requests")
        .select("id", { count: "exact", head: true })
        .in("service_id" as any, serviceIds as any)
        .eq("status" as any, "pending" as any);
      if (!qErr && count != null) quoteCount = count;
    }

    return NextResponse.json({
      success: true,
      count: bookingCount + quoteCount,
    });
  } catch (e) {
    console.error("provider-attention:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
