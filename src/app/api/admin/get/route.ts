import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Get admin user(s) - typically there should be one admin
    const { data: admins, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email")
      .eq("role", "admin")
      .limit(1);

    if (error) {
      console.error("Error fetching admin:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch admin" },
        { status: 500 }
      );
    }

    if (!admins || admins.length === 0) {
      return NextResponse.json(
        { success: false, error: "No admin found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      admin: {
        id: admins[0].id,
        name: `${admins[0].first_name || ""} ${admins[0].last_name || ""}`.trim() || "Admin",
        email: admins[0].email
      }
    });
  } catch (error) {
    console.error("Unexpected error in GET /api/admin/get:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
