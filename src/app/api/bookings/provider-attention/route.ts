import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

/** Match my-requests / my-teen-hustle: proposed alternative uses alternative_* for expiry. */
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
      const alt = new Date(`${booking.alternative_date}T${booking.alternative_time}`);
      return alt < new Date();
    }
    const bookingDateTime = new Date(`${booking.requested_date}T${booking.requested_time}`);
    return bookingDateTime < new Date();
  } catch {
    return false;
  }
}

/**
 * Count of items needing a teen provider's attention:
 * incoming bookings that need provider attention.
 * Plus pending quote requests for their services.
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
        alternative_date,
        alternative_time,
        special_instructions,
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
      alternative_date?: string | null;
      alternative_time?: string | null;
      special_instructions?: string | null;
    }>) || [];

    let bookingCount = 0;
    for (const b of incoming) {
      // Skip placeholder bookings that exist purely as conversation threads for quote requests.
      if (typeof b.special_instructions === "string" && b.special_instructions.includes("[QUOTE_REQUEST]")) continue;
      if (!["pending", "awaiting_payment", "confirmed", "paid", "cancelled", "rejected"].includes(b.status)) continue;
      if ((b.status === "pending" || b.status === "awaiting_payment" || b.status === "confirmed") && isBookingExpired(b)) continue;
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
