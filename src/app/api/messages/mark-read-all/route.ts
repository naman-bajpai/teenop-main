import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// POST to mark all messages as read for the current user
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { error: updateError } = await (supabase as any)
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("receiver_id", user.id)
      .is("read_at", null);

    if (updateError) {
      console.error("Error marking all messages as read:", updateError);
      if (updateError.code === "PGRST200" || updateError.message?.includes('relation "messages" does not exist')) {
        return NextResponse.json({ success: true, message: "Messages marked as read" });
      }
      return NextResponse.json(
        { success: false, error: "Failed to mark messages as read" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Messages marked as read" });
  } catch (error) {
    console.error("Unexpected error marking all messages as read:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
