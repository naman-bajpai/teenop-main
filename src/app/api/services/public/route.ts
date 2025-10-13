import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get query parameters
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const limit = url.searchParams.get('limit');
    const search = url.searchParams.get('search');

    // Build the query
    let query = supabase
      .from("services")
      .select(`
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
      `)
      .eq("status", "active") // Only show active services
      .order("created_at", { ascending: false });

    // Apply category filter if provided
    if (category && category !== "all") {
      query = query.eq("category", category);
    }

    // Apply search filter if provided
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,location.ilike.%${search}%`);
    }

    // Apply limit if provided
    if (limit) {
      const limitNum = parseInt(limit);
      if (limitNum > 0 && limitNum <= 100) {
        query = query.limit(limitNum);
      }
    }

    const { data: services, error } = await query;

    if (error) {
      console.error("Error fetching public services:", error);
      return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 });
    }

    // Get unique user IDs to fetch profile names
    const userIds = [...new Set(services?.map(service => service.user_id) || [])];
    
    // Fetch profile names for all users
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", userIds);

    // Create a map of user_id to profile name
    const profileMap = new Map();
    profiles?.forEach(profile => {
      profileMap.set(profile.id, `${profile.first_name} ${profile.last_name}`);
    });

    // Transform the data to match the expected format
    const transformedServices = services?.map(service => ({
      id: service.id,
      user_id: service.user_id,
      title: service.title,
      description: service.description,
      price: service.price,
      location: service.location,
      category: service.category,
      status: service.status,
      duration: service.duration || 60,
      education: service.education || null,
      qualifications: service.qualifications || null,
      address: service.address || null,
      pricing_model: service.pricing_model || "per_hour",
      banner_url: service.banner_url,
      created_at: service.created_at,
      rating: service.rating || null,
      total_bookings: service.total_bookings || 0,
      provider_name: profileMap.get(service.user_id) || null
    })) || [];

    return NextResponse.json({ 
      services: transformedServices,
      total: transformedServices.length,
      filters: {
        category: category || "all",
        search: search || "",
        limit: limit || "unlimited"
      }
    });
  } catch (error) {
    console.error("Unexpected error in GET /api/services/public:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
