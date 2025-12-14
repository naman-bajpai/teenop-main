import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) return NextResponse.json({ error: "No active session" }, { status: 401 });

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id as any)  
    .single();

  if (error || !profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  return NextResponse.json({ user: profile }, { status: 200 });
}
