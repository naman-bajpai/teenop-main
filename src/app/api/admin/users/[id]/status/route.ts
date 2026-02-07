import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createServiceRoleClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

type UserStatus = Database["public"]["Enums"]["user_status"];

const ALLOWED_STATUSES: UserStatus[] = [
  "active",
  "inactive",
  "suspended",
  "pending_verification",
];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const profileRole = (profile as { role?: string } | null)?.role;
    if (profileError || !profile || profileRole !== "admin") {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    const { status } = (await request.json()) as { status?: UserStatus };
    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid status value" },
        { status: 400 }
      );
    }

    const { id: userId } = await params;
    const supabaseAdmin = createServiceRoleClient();

    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ status })
      .eq("id", userId);

    if (updateError) {
      console.error("Error updating user status:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update user status" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      status,
      message: `User status updated to ${status.replace("_", " ")}`,
    });
  } catch (error) {
    console.error("Unexpected error in update user status:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
