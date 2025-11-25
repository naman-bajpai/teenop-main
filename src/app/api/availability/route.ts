import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET - Get provider availability
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "user_id is required" },
        { status: 400 }
      );
    }

    const { data: availability, error } = await supabase
      .from("provider_availability")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "not found" - that's okay, return empty
      console.error("Error fetching availability:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch availability" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      availability: availability || null,
    });
  } catch (error: any) {
    console.error("Unexpected error in GET availability:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST/PUT - Save provider availability
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
    const { availability, timezone } = body;

    if (!availability || typeof availability !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid availability data" },
        { status: 400 }
      );
    }

    // Check if availability record exists
    const { data: existing } = await supabase
      .from("provider_availability")
      .select("id")
      .eq("user_id", user.id)
      .single();

    let result;

    if (existing) {
      // Update existing
      const { data: updated, error: updateError } = await supabase
        .from("provider_availability")
        .update({
          availability,
          timezone: timezone || "America/New_York",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating availability:", updateError);
        return NextResponse.json(
          { success: false, error: "Failed to update availability" },
          { status: 500 }
        );
      }

      result = updated;
    } else {
      // Create new
      const { data: created, error: createError } = await supabase
        .from("provider_availability")
        .insert({
          user_id: user.id,
          availability,
          timezone: timezone || "America/New_York",
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating availability:", createError);
        return NextResponse.json(
          { success: false, error: "Failed to create availability" },
          { status: 500 }
        );
      }

      result = created;
    }

    return NextResponse.json({
      success: true,
      availability: result,
    });
  } catch (error: any) {
    console.error("Unexpected error in POST availability:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

