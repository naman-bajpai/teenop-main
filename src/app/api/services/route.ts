// app/api/services/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if this is a request for all services or user's own services
    const url = new URL(request.url);
    const allServices = url.searchParams.get('all') === 'true';

    let query = (supabase as any)
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
        total_bookings,
        availability
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
    const userIds = [...new Set(services?.map((service: any) => service.user_id) || [])];
    
    // Fetch profile names for all users
    const { data: profiles } = await (supabase as any)
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", userIds);

    // Create map of user_id to profile name
    const profileMap = new Map();
    profiles?.forEach((profile: any) => {
      profileMap.set(profile.id, `${profile.first_name} ${profile.last_name}`);
    });

    // Get service IDs to fetch images
    const serviceIds = services?.map((service: any) => service.id) || [];
    
    // Fetch service images
    const { data: serviceImages } = await (supabase as any)
      .from("service_images")
      .select("id, service_id, url, is_primary, created_at")
      .in("service_id", serviceIds)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });

    // Create map of service_id to images array
    const imagesMap = new Map();
    serviceImages?.forEach((image: any) => {
      if (!imagesMap.has(image.service_id)) {
        imagesMap.set(image.service_id, []);
      }
      imagesMap.get(image.service_id).push(image);
    });

    // Compute rating from reviews table (parent/customer reviews) so teens see ratings on their services
    const { data: reviewRows } = await (supabase as any)
      .from("reviews")
      .select("service_id, rating")
      .in("service_id", serviceIds);
    const ratingByService = new Map<string, { avg: number; count: number }>();
    (reviewRows || []).forEach((r: any) => {
      if (!r.service_id) return;
      const numRating = typeof r.rating === "number" ? r.rating : parseFloat(r.rating);
      if (typeof numRating !== "number" || isNaN(numRating)) return;
      const existing = ratingByService.get(r.service_id);
      if (existing) {
        existing.avg = (existing.avg * existing.count + numRating) / (existing.count + 1);
        existing.count += 1;
      } else {
        ratingByService.set(r.service_id, { avg: numRating, count: 1 });
      }
    });

    // Transform the data to match the expected format; use computed rating from reviews when available
    const transformedServices = services?.map((service: any) => {
      const computed = ratingByService.get(service.id);
      const rating = computed ? Math.round(computed.avg * 10) / 10 : (service.rating ?? null);
      return {
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
        rating,
        total_bookings: service.total_bookings || 0,
        provider_name: profileMap.get(service.user_id) || null,
        images: imagesMap.get(service.id) || []
      };
    }) || [];

    console.log(`[GET /api/services] Returning ${transformedServices.length} services for user ${user.id} (allServices: ${allServices})`);

    // Add cache headers based on request type
    const cacheMaxAge = allServices ? 30 : 10; // Public services cache longer
    return NextResponse.json({ 
      success: true,
      services: transformedServices 
    }, {
      headers: {
        'Cache-Control': `public, s-maxage=${cacheMaxAge}, stale-while-revalidate=60`
      }
    });
  } catch (error) {
    console.error("Unexpected error in GET /api/services:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check user role - only teens can create services
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, stripe_connect_account_id")
      .eq("id", user.id)
      .single();

    if (!profile || (profile as any).role !== "teen") {
      return NextResponse.json({ 
        error: "Only teens can create services. Parents can request services through quote requests." 
      }, { status: 403 });
    }

    // Check if user has connected their payment account
    if (!profile.stripe_connect_account_id) {
      return NextResponse.json({ 
        error: "You must connect your payment account before adding a service. Please set up payments first." 
      }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { title, description, price, location, category, status, duration, education, qualifications, address, pricing_model, delivery_method, location_type, banner_url, availability } = body;

    // Validate required fields
    if (!title || !description || price === undefined || !location || !category || !status) {
      return NextResponse.json({ 
        error: "Missing required fields: title, description, price, location, category, status" 
      }, { status: 400 });
    }

    // Validate pricing model if provided (check this before price validation)
    if (pricing_model && !["per_job", "per_hour", "quote"].includes(pricing_model)) {
      return NextResponse.json({ 
        error: "Pricing model must be either 'per_job', 'per_hour', or 'quote'" 
      }, { status: 400 });
    }

    // Validate price - must be positive, except for quote-based services (which must be 0)
    const isQuoteBased = pricing_model === "quote";
    if (isQuoteBased) {
      // For quote-based services, price must be exactly 0
      if (typeof price !== "number" || price !== 0) {
        return NextResponse.json({ 
          error: "Quote-based services must have a price of 0" 
        }, { status: 400 });
      }
    } else {
      // For non-quote services, price must be greater than 0
      if (typeof price !== "number" || price <= 0) {
        return NextResponse.json({ 
          error: "Price must be greater than 0" 
        }, { status: 400 });
      }
    }

    // Validate status
    if (!["active", "paused"].includes(status)) {
      return NextResponse.json({ 
        error: "Status must be either 'active' or 'paused'" 
      }, { status: 400 });
    }

    // Validate category
    const validCategories = ["tutoring", "pet_care", "lawn_care", "cleaning", "tech_support", "delivery", "art_commissions", "beauty", "photography", "graphic_design", "other"];
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

    // Create the service
    const { data: service, error } = await (supabase as any)
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
        delivery_method: delivery_method || "in_person",
        location_type: location_type || "public_address",
        banner_url: banner_url || null,
        availability: availability || null
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
        delivery_method,
        location_type,
        banner_url,
        availability,
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
      total_bookings: 0,
      images: []
    };

    return NextResponse.json({ service: responseService }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error in POST /api/services:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check user role - only teens can update services
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile as any).role !== "teen") {
      return NextResponse.json({ 
        error: "Only teens can update services." 
      }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { id, status } = body;

    if (!id) {
      return NextResponse.json({ 
        error: "Missing required field: id" 
      }, { status: 400 });
    }

    // Get existing service to ensure ownership and get current values for validation if needed
    const { data: existingService, error: fetchError } = await supabase
      .from("services")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existingService) {
      return NextResponse.json({ error: "Service not found or you don't have permission" }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};
    
    // List of all possible fields that can be updated
    const fields = [
      'title', 'description', 'price', 'location', 'category', 'status', 
      'duration', 'education', 'qualifications', 'address', 'pricing_model', 
      'delivery_method', 'location_type', 'banner_url', 'availability'
    ];

    fields.forEach(field => {
      if (body[field] !== undefined) {
        if (field === 'title' || field === 'description' || field === 'location') {
          updateData[field] = body[field].trim();
        } else {
          updateData[field] = body[field];
        }
      }
    });

    // Validation for fields if they are being updated
    if (updateData.status && !["active", "paused"].includes(updateData.status)) {
      return NextResponse.json({ error: "Status must be either 'active' or 'paused'" }, { status: 400 });
    }

    if (updateData.pricing_model && !["per_job", "per_hour", "quote"].includes(updateData.pricing_model)) {
      return NextResponse.json({ error: "Pricing model must be 'per_job', 'per_hour', or 'quote'" }, { status: 400 });
    }

    if (updateData.price !== undefined) {
      const price = Number(updateData.price);
      const pricingModel = updateData.pricing_model || existingService.pricing_model;
      if (pricingModel === "quote") {
        if (price !== 0) return NextResponse.json({ error: "Quote-based services must have price 0" }, { status: 400 });
      } else if (price <= 0) {
        return NextResponse.json({ error: "Price must be greater than 0" }, { status: 400 });
      }
      updateData.price = price;
    }

    if (updateData.category) {
      const validCategories = ["tutoring", "pet_care", "lawn_care", "cleaning", "tech_support", "delivery", "art_commissions", "beauty", "photography", "graphic_design", "other"];
      if (!validCategories.includes(updateData.category)) {
        return NextResponse.json({ error: "Invalid category" }, { status: 400 });
      }
    }

    // Update the service
    const { data: service, error } = await (supabase as any)
      .from("services")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
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
        delivery_method,
        location_type,
        banner_url,
        availability,
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
    const supabase = await createServerClient();
    
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
    const { error } = await (supabase as any)
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
