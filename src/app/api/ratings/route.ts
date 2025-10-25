import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { service_id, rating, comment } = body;

    // Validate input
    if (!service_id || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ 
        error: "Invalid input. Rating must be between 1 and 5." 
      }, { status: 400 });
    }

    // Check if user has already rated this service
    const { data: existingReview } = await supabase
      .from("service_reviews")
      .select("id")
      .eq("service_id", service_id)
      .eq("reviewer_id", user.id)
      .single();

    if (existingReview) {
      return NextResponse.json({ 
        error: "You have already rated this service." 
      }, { status: 400 });
    }

    // Insert the review
    const { data: review, error: reviewError } = await supabase
      .from("service_reviews")
      .insert({
        service_id,
        reviewer_id: user.id,
        rating,
        comment: comment || null,
      } as any)
      .select()
      .single();

    if (reviewError) {
      console.error("Error creating review:", reviewError);
      return NextResponse.json({ 
        error: "Failed to create review" 
      }, { status: 500 });
    }

    // Update the service's average rating
    const { data: reviews } = await supabase
      .from("service_reviews")
      .select("rating")
      .eq("service_id", service_id);

    if (reviews && reviews.length > 0) {
      const averageRating = reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length;
      
      // Update service rating - we'll handle this in the frontend for now
      console.log(`Service ${service_id} average rating: ${Math.round(averageRating * 10) / 10}`);
    }

    return NextResponse.json({ 
      success: true, 
      review 
    });

  } catch (error) {
    console.error("Error in ratings POST:", error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { searchParams } = new URL(request.url);
    const service_id = searchParams.get("service_id");

    if (!service_id) {
      return NextResponse.json({ 
        error: "Service ID is required" 
      }, { status: 400 });
    }

    // Get reviews for the service
    const { data: reviews, error: reviewsError } = await supabase
      .from("service_reviews")
      .select(`
        id,
        rating,
        comment,
        created_at,
        reviewer_id
      `)
      .eq("service_id", service_id)
      .order("created_at", { ascending: false });

    if (reviewsError) {
      console.error("Error fetching reviews:", reviewsError);
      return NextResponse.json({ 
        error: "Failed to fetch reviews" 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      reviews: reviews || [] 
    });

  } catch (error) {
    console.error("Error in ratings GET:", error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}
