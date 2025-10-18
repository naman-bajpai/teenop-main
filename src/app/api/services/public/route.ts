// app/api/services/public/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

type ServiceRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  price: number | null;
  location: string | null;
  category: string;
  status: "active" | "paused" | string;
  duration: number | null;
  education: string | null;
  qualifications: string | null;
  address: string | null;
  pricing_model: "per_hour" | "per_service" | string | null;
  banner_url: string | null;
  created_at: string;
  rating: number | null;
  total_bookings: number | null;
};

export async function GET(request: Request) {
  try {
    const supabase = await createServerClient();

    // Query params
    const url = new URL(request.url);
    const category = url.searchParams.get("category");
    const limit = url.searchParams.get("limit");
    const rawSearch = url.searchParams.get("search");

    const search = (rawSearch ?? "").trim();

    // Build base query
    let query = (supabase as any)
      .from("services")
      .select(
        `
        id,
        user_id,
        title,
        description,
        price,
        location,
        category,
        status,
        duration,
        education,
        qualifications,
        address,
        pricing_model,
        banner_url,
        created_at,
        rating,
        total_bookings
      `
      )
      .eq("status", "active")
      .order("created_at", { ascending: false });

    // Category filter
    if (category && category !== "all") {
      query = query.eq("category", category);
    }

    // Search filter
    if (search.length > 0) {
      const like = `%${search}%`;
      query = query.or(
        `title.ilike.${like},description.ilike.${like},location.ilike.${like}`
      );
    }

    if (limit) {
      const limitNum = Number(limit);
      if (Number.isFinite(limitNum) && limitNum > 0 && limitNum <= 100) {
        query = query.limit(limitNum);
      }
    }

    const { data: services, error } = await query;

    if (error) {
      console.error("Error fetching public services:", error);
      return NextResponse.json(
        { error: "Failed to fetch services" },
        { status: 500 }
      );
    }

    const svc = (services ?? []) as ServiceRow[];

    const userIds = Array.from(new Set(svc.map((s) => s.user_id))).filter(
      Boolean
    );

    // Fetch profiles only if we have user IDs
    let profileMap = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profiles, error: profErr } = await (supabase as any)
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", userIds);

      if (profErr) {
        // Don't fail the whole request—just log and continue without names
        console.warn("Warning: failed to fetch profiles:", profErr);
      } else {
        for (const p of profiles ?? []) {
          const fullName = [p.first_name, p.last_name]
            .filter(Boolean)
            .join(" ")
            .trim();
          profileMap.set(p.id, fullName || "");
        }
      }
    }

    // Transform
    const transformedServices = svc.map((service) => ({
      id: service.id,
      user_id: service.user_id,
      title: service.title,
      description: service.description ?? "",
      price: service.price ?? 0,
      location: service.location ?? "",
      category: service.category,
      status: service.status,
      duration: service.duration ?? 60,
      education: service.education ?? null,
      qualifications: service.qualifications ?? null,
      address: service.address ?? null,
      pricing_model: (service.pricing_model as "per_hour" | "per_service") ?? "per_hour",
      banner_url: service.banner_url ?? null,
      created_at: service.created_at,
      rating: service.rating ?? null,
      total_bookings: service.total_bookings ?? 0,
      provider_name: profileMap.get(service.user_id) || null,
    }));

    return NextResponse.json({
      services: transformedServices,
      total: transformedServices.length,
      filters: {
        category: category || "all",
        search: search || "",
        limit: limit || "unlimited",
      },
    });
  } catch (err) {
    console.error("Unexpected error in GET /api/services/public:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
