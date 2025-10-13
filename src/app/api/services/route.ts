// app/api/services/route.ts

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

    // Check if this is a request for all services or user's own services
    const url = new URL(request.url);
    const allServices = url.searchParams.get('all') === 'true';

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
      `);

    // If requesting all services, don't filter by user_id
    if (!allServices) {
      query = query.eq("user_id", user.id);
    }

    // Only show active services when fetching all services
    if (allServices) {
      query = query.eq("status", "active");
    }

    const { data: services, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching services:", error);
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
    const { title, description, price, location, category, status, duration, education, qualifications, address, pricing_model } = body;

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
    const validCategories = ["tutoring", "pet_care", "lawn_care", "cleaning", "tech_support", "delivery", "other"];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ 
        error: `Invalid category. Must be one of: ${validCategories.join(", ")}` 
      }, { status: 400 });
    }

    // Validate duration if provided
    if (duration !== undefined && (typeof duration !== "number" || duration < 15)) {
      return NextResponse.json({ 
        error: "Duration must be a number greater than or equal to 15 minutes" 
      }, { status: 400 });
    }

    // Validate pricing model if provided
    if (pricing_model && !["per_job", "per_hour"].includes(pricing_model)) {
      return NextResponse.json({ 
        error: "Pricing model must be either 'per_job' or 'per_hour'" 
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
        duration: duration || 60,
        education: education || null,
        qualifications: qualifications || null,
        address: address || null,
        pricing_model: pricing_model || "per_hour",
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
        duration,
        education,
        qualifications,
        address,
        pricing_model,
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

export async function PUT(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { id, title, description, price, location, category, status, duration, education, qualifications, address, pricing_model } = body;

    // Validate required fields
    if (!id || !title || !description || price === undefined || !location || !category || !status) {
      return NextResponse.json({ 
        error: "Missing required fields: id, title, description, price, location, category, status" 
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
    const validCategories = ["tutoring", "pet_care", "lawn_care", "cleaning", "tech_support", "delivery", "other"];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ 
        error: `Invalid category. Must be one of: ${validCategories.join(", ")}` 
      }, { status: 400 });
    }

    // Validate duration if provided
    if (duration !== undefined && (typeof duration !== "number" || duration < 15)) {
      return NextResponse.json({ 
        error: "Duration must be a number greater than or equal to 15 minutes" 
      }, { status: 400 });
    }

    // Validate pricing model if provided
    if (pricing_model && !["per_job", "per_hour"].includes(pricing_model)) {
      return NextResponse.json({ 
        error: "Pricing model must be either 'per_job' or 'per_hour'" 
      }, { status: 400 });
    }

    // Update the service
    const { data: service, error } = await supabase
      .from("services")
      .update({
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        location: location.trim(),
        category,
        status,
        duration: duration || 60,
        education: education || null,
        qualifications: qualifications || null,
        address: address || null,
        pricing_model: pricing_model || "per_hour",
      })
      .eq("id", id)
      .eq("user_id", user.id) // Ensure user can only update their own services
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
      .single();

    if (error) {
      console.error("Error updating service:", error);
      return NextResponse.json({ error: "Failed to update service" }, { status: 500 });
    }

    if (!service) {
      return NextResponse.json({ error: "Service not found or you don't have permission to update it" }, { status: 404 });
    }
    const responseService = {
      ...service,
      rating: service.rating || null,
      total_bookings: service.total_bookings || 0
    };

    return NextResponse.json({ service: responseService });
  } catch (error) {
    console.error("Unexpected error in PUT /api/services:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ 
        error: "Missing required field: id" 
      }, { status: 400 });
    }

    // Delete the service
    const { error } = await supabase
      .from("services")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting service:", error);
      return NextResponse.json({ error: "Failed to delete service" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error in DELETE /api/services:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
