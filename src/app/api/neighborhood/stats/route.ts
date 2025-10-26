// app/api/neighborhood/stats/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerClient();

    // Get all active services with their ratings
    const { data: services, error: servicesError } = await supabase
      .from("services")
      .select("rating, location, user_id")
      .eq("status", "active");

    if (servicesError) {
      console.error("Error fetching services for stats:", servicesError);
      return NextResponse.json({ error: "Failed to fetch service statistics" }, { status: 500 });
    }

    const servicesList = services || [];

    // Calculate average rating
    const ratings = servicesList.filter((s: any) => s.rating !== null).map((s: any) => s.rating);
    const averageRating = ratings.length > 0 
      ? ratings.reduce((sum: number, rating: number) => sum + rating, 0) / ratings.length 
      : 0;

    // Count unique active providers
    const uniqueProviders = new Set(servicesList.map((s: any) => s.user_id));
    const activeProviders = uniqueProviders.size;

    // Count unique service areas (locations)
    const uniqueLocations = new Set(servicesList.map((s: any) => s.location).filter(Boolean));
    const serviceAreas = uniqueLocations.size;

    return NextResponse.json({
      success: true,
      stats: {
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
        activeProviders,
        serviceAreas,
        totalServices: servicesList.length
      }
    });
  } catch (error) {
    console.error("Unexpected error in GET /api/neighborhood/stats:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
