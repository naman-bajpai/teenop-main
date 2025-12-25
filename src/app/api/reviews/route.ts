import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// POST - Create a review
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { booking_id, rating, review_text, tip_amount } = body;

    // Validate required fields
    if (!booking_id || !rating) {
      return NextResponse.json(
        { success: false, error: "Booking ID and rating are required" },
        { status: 400 }
      );
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    // Validate tip amount
    if (tip_amount !== undefined && (tip_amount < 0 || typeof tip_amount !== 'number')) {
      return NextResponse.json(
        { success: false, error: "Tip amount must be a positive number" },
        { status: 400 }
      );
    }

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        services (
          id,
          user_id
        ),
        profiles:profiles!bookings_user_id_fkey (
          id
        )
      `)
      .eq("id" as any, booking_id as any)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    const bookingData = booking as any;

    // Verify user is the customer (reviewer) and booking is completed
    if (bookingData.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "Only the customer can review this booking" },
        { status: 403 }
      );
    }

    if (bookingData.status !== "completed" && bookingData.status !== "paid") {
      return NextResponse.json(
        { success: false, error: "Booking must be completed before reviewing" },
        { status: 400 }
      );
    }

    // Check if review already exists
    const { data: existingReview } = await (supabase as any)
      .from("reviews")
      .select("id")
      .eq("booking_id", booking_id)
      .eq("reviewer_id", user.id)
      .single();

    if (existingReview) {
      return NextResponse.json(
        { success: false, error: "Review already exists for this booking" },
        { status: 400 }
      );
    }

    // Get the service provider (reviewee)
    const revieweeId = bookingData.services?.user_id;
    if (!revieweeId) {
      return NextResponse.json(
        { success: false, error: "Service provider not found" },
        { status: 404 }
      );
    }

    // Create the review
    const { data: review, error: reviewError } = await (supabase as any)
      .from("reviews")
      .insert({
        booking_id: booking_id,
        reviewer_id: user.id,
        reviewee_id: revieweeId,
        service_id: bookingData.services.id,
        rating: rating,
        review_text: review_text || null,
        tip_amount: tip_amount || 0,
      })
      .select()
      .single();

    if (reviewError) {
      console.error("Error creating review:", reviewError);
      return NextResponse.json(
        { success: false, error: "Failed to create review" },
        { status: 500 }
      );
    }

    // If tip amount > 0, process the tip payment
    if (tip_amount > 0) {
      // TODO: Process tip payment via Stripe
      // For now, we'll just record it in the review
      // You may want to create a separate tip payment flow
    }

    return NextResponse.json({
      success: true,
      review: review
    });

  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET - Get reviews
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const service_id = searchParams.get("service_id");
    const booking_id = searchParams.get("booking_id");
    const reviewee_id = searchParams.get("reviewee_id");

    let query = (supabase as any)
      .from("reviews")
      .select(`
        *,
        reviewer:profiles!reviews_reviewer_id_fkey (
          id,
          first_name,
          last_name,
          avatar_url
        ),
        reviewee:profiles!reviews_reviewee_id_fkey (
          id,
          first_name,
          last_name
        ),
        services (
          id,
          title
        ),
        bookings (
          id,
          status
        )
      `);

    // Filter by service_id
    if (service_id) {
      query = query.eq("service_id", service_id);
    }

    // Filter by booking_id
    if (booking_id) {
      query = query.eq("booking_id", booking_id);
    }

    // Filter by reviewee_id
    if (reviewee_id) {
      query = query.eq("reviewee_id", reviewee_id);
    }

    // Order by created_at descending
    query = query.order("created_at", { ascending: false });

    const { data: reviews, error } = await query;

    if (error) {
      console.error("Error fetching reviews:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch reviews" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      reviews: reviews || []
    });

  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

