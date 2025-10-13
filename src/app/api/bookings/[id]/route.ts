// app/api/bookings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(_req: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    // INCOMING: bookings where current user is the SERVICE PROVIDER
    // First get services owned by the user
    const { data: userServices, error: servicesErr } = await supabase
      .from("services")
      .select("id")
      .eq("user_id" as any, user.id as any);

    if (servicesErr) throw servicesErr;

    const serviceIds = (userServices as any)?.map((s: any) => s.id) || [];

    // Then get bookings for those services
    let incomingData: any[] = [];
    if (serviceIds.length > 0) {
      const { data: incoming, error: incErr } = await supabase
        .from("bookings")
        .select(
          `
          id,
          service_id,
          user_id,
          status,
          requested_date,
          requested_time,
          duration,
          total_price,
          special_instructions,
          created_at,
          updated_at,
          services(
            id,
            title,
            user_id,
            price,
            pricing_model,
            location,
            category
          ),
          profiles:profiles!bookings_user_id_fkey(
            id,
            first_name,
            last_name
          )
        `
        )
        .in("service_id", serviceIds)
        .order("created_at", { ascending: false });

      if (incErr) throw incErr;
      incomingData = incoming as any;
    }

    // MY REQUESTS: bookings created by me (as a customer)
    const { data: mine, error: mineErr } = await supabase
      .from("bookings")
      .select(
        `
        id,
        service_id,
        user_id,
        status,
        requested_date,
        requested_time,
        duration,
        total_price,
        special_instructions,
        created_at,
        updated_at,
        services(
          id,
          title,
          user_id,
          price,
          pricing_model,
          location,
          category
        )
      `
      )
      .eq("user_id", user.id as any)
      .order("created_at", { ascending: false });

    if (mineErr) throw mineErr;

    // Type assertion for the joined query result
    const mineData = mine as any;

    // Normalize a light, UI-ready shape (you can tweak)
    const mkName = (p?: { first_name?: string | null; last_name?: string | null }) =>
      [p?.first_name, p?.last_name].filter(Boolean).join(" ").trim() || "Customer";

    const incomingNormalized = (incomingData ?? []).map((b: any) => ({
      id: b.id,
      service_id: b.service_id,
      status: b.status,
      requested_date: b.requested_date,
      requested_time: b.requested_time,
      duration: b.duration,
      total_price: b.total_price,
      special_instructions: b.special_instructions ?? "",
      created_at: b.created_at,
      updated_at: b.updated_at,
      service: {
        id: b.services?.id,
        title: b.services?.title,
        pricing_model: b.services?.pricing_model,
        location: b.services?.location,
        category: b.services?.category,
      },
      customer_name: mkName(b.profiles),
    }));

    const myRequestsNormalized = (mineData ?? []).map((b: any) => ({
      id: b.id,
      service_id: b.service_id,
      status: b.status,
      requested_date: b.requested_date,
      requested_time: b.requested_time,
      duration: b.duration,
      total_price: b.total_price,
      special_instructions: b.special_instructions ?? "",
      created_at: b.created_at,
      updated_at: b.updated_at,
      service: {
        id: b.services?.id,
        title: b.services?.title,
        provider_id: b.services?.user_id,
        pricing_model: b.services?.pricing_model,
      },
    }));

    return NextResponse.json({
      success: true,
      incoming: incomingNormalized,
      myRequests: myRequestsNormalized,
    });
  } catch (e) {
    console.error("GET /api/bookings error:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
