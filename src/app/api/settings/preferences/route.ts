import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

type UserPreferencesUpdate = Database["public"]["Tables"]["user_preferences"]["Update"];

// GET - Get user preferences
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

    // Get user preferences or create default if doesn't exist
    let { data: preferences, error: prefError } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // If preferences don't exist, create default ones
    if (prefError && prefError.code === 'PGRST116') {
      const { data: newPrefs, error: createError } = await supabase
        .from("user_preferences")
        .insert({
          user_id: user.id,
          email_notifications_enabled: true,
          email_booking_confirmations: true,
          email_booking_reminders: true,
          email_quote_updates: true,
          email_messages: true,
          email_marketing: false,
          profile_visibility: 'public',
          show_email: false,
          show_phone: false,
          show_location: true,
          show_services: true,
          show_ratings: true,
        } as any)
        .select()
        .single();

      if (createError) {
        console.error("Error creating default preferences:", createError);
        return NextResponse.json(
          { success: false, error: "Failed to create preferences" },
          { status: 500 }
        );
      }

      preferences = newPrefs;
    } else if (prefError) {
      console.error("Error fetching preferences:", prefError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch preferences" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      preferences
    });

  } catch (error) {
    console.error("Unexpected error in fetching preferences:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH - Update user preferences
export async function PATCH(request: NextRequest) {
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

    const body = await request.json() as Partial<UserPreferencesUpdate>;

    // Check if preferences exist
    const { data: existing } = await supabase
      .from("user_preferences")
      .select("id")
      .eq("user_id", user.id)
      .single();

    let preferences;

    if (existing) {
      // Update existing preferences
      const updatePayload: UserPreferencesUpdate = {
        ...body,
        updated_at: new Date().toISOString() 
      };
      
      // Type assertion needed due to Supabase type inference limitation
      const query = supabase.from("user_preferences");
      const { data: updated, error: updateError } = await (query as any)
        .update(updatePayload)
        .eq("user_id", user.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating preferences:", updateError);
        return NextResponse.json(
          { success: false, error: "Failed to update preferences" },
          { status: 500 }
        );
      }

      preferences = updated;
    } else {
      // Create new preferences with provided values and defaults
      const { data: created, error: createError } = await supabase
        .from("user_preferences")
        .insert({
          user_id: user.id,
          email_notifications_enabled: body.email_notifications_enabled ?? true,
          email_booking_confirmations: body.email_booking_confirmations ?? true,
          email_booking_reminders: body.email_booking_reminders ?? true,
          email_quote_updates: body.email_quote_updates ?? true,
          email_messages: body.email_messages ?? true,
          email_marketing: body.email_marketing ?? false,
          profile_visibility: body.profile_visibility ?? 'public',
          show_email: body.show_email ?? false,
          show_phone: body.show_phone ?? false,
          show_location: body.show_location ?? true,
          show_services: body.show_services ?? true,
          show_ratings: body.show_ratings ?? true,
        } as any)
        .select()
        .single();

      if (createError) {
        console.error("Error creating preferences:", createError);
        return NextResponse.json(
          { success: false, error: "Failed to create preferences" },
          { status: 500 }
        );
      }

      preferences = created;
    }

    return NextResponse.json({
      success: true,
      preferences
    });

  } catch (error) {
    console.error("Unexpected error in updating preferences:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

