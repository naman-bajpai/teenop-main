import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch services for the current user
    const { data: services, error } = await supabase
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
        banner_url,
        created_at,
        rating:services_rating(avg_rating),
        total_bookings:bookings(count)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching services:", error);
      return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 });
    }

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
      banner_url: service.banner_url,
      created_at: service.created_at,
      rating: service.rating?.[0]?.avg_rating || null,
      total_bookings: service.total_bookings?.[0]?.count || 0
    })) || [];

    return NextResponse.json({ services: transformedServices });
  } catch (error) {
    console.error("Unexpected error in GET /api/services:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { title, description, price, location, category, status } = body;

    // Validate required fields
    if (!title || !description || price === undefined || !location || !category || !status) {
      return NextResponse.json({ 
        error: "Missing required fields: title, description, price, location, category, status" 
      }, { status: 400 });
    }

    // Validate price is a positive number
    if (typeof price !== "number" || price < 0) {
      return NextResponse.json({ 
        error: "Price must be a positive number" 
      }, { status: 400 });
    }

    // Validate status
    if (!["active", "paused"].includes(status)) {
      return NextResponse.json({ 
        error: "Status must be either 'active' or 'paused'" 
      }, { status: 400 });
    }

    // Validate category
    const validCategories = ["tutoring", "pet_care", "delivery", "yard_work", "tech_help", "cleaning", "other"];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ 
        error: `Invalid category. Must be one of: ${validCategories.join(", ")}` 
      }, { status: 400 });
    }

    // Create the service
    const { data: service, error } = await supabase
      .from("services")
      .insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        location: location.trim(),
        category,
        status,
        banner_url: null // No image upload for now
      })
      .select(`
        id,
        user_id,
        title,
        description,
        price,
        location,
        category,
        status,
        banner_url,
        created_at
      `)
      .single();

    if (error) {
      console.error("Error creating service:", error);
      return NextResponse.json({ error: "Failed to create service" }, { status: 500 });
    }

    // Return the created service with default values for rating and bookings
    const responseService = {
      ...service,
      rating: null,
      total_bookings: 0
    };

    return NextResponse.json({ service: responseService }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error in POST /api/services:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
