import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

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

    // Find all paid bookings for services owned by this user that don't have earnings records
    const { data: paidBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        total_price,
        service_price,
        payment_completed_at,
        services!inner (
          user_id
        )
      `)
      .eq('status', 'paid')
      .eq('services.user_id', user.id)
      .not('payment_completed_at', 'is', null);

    if (bookingsError) {
      console.error('Error fetching paid bookings:', bookingsError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch paid bookings" },
        { status: 500 }
      );
    }

    // Check which bookings already have earnings
    const bookingIds = paidBookings?.map((b: any) => b.id) || [];
    if (bookingIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No paid bookings found",
        created: 0
      });
    }

    const { data: existingEarnings, error: earningsError } = await supabase
      .from('earnings')
      .select('booking_id')
      .in('booking_id', bookingIds);

    if (earningsError) {
      console.error('Error checking existing earnings:', earningsError);
      return NextResponse.json(
        { success: false, error: "Failed to check existing earnings" },
        { status: 500 }
      );
    }

    const existingBookingIds = new Set(existingEarnings?.map((e: any) => e.booking_id) || []);
    const bookingsToProcess = paidBookings?.filter((b: any) => !existingBookingIds.has(b.id)) || [];

    if (bookingsToProcess.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All paid bookings already have earnings records",
        created: 0
      });
    }

    // Create earnings records for bookings that don't have them
    // Earnings should be 'pending' until withdrawn, not 'completed'
    const earningsToInsert = bookingsToProcess.map((booking: any) => ({
      user_id: user.id,
      booking_id: booking.id,
      amount: booking.service_price, // Use service_price directly
      status: 'pending', // Changed from 'completed' to 'pending' - earnings should be pending until withdrawn
      earned_at: booking.payment_completed_at
    }));

    const { data: insertedEarnings, error: insertError } = await (supabase as any)
      .from('earnings')
      .insert(earningsToInsert)
      .select();

    if (insertError) {
      console.error('Error creating earnings:', insertError);
      return NextResponse.json(
        { success: false, error: "Failed to create earnings records" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Created ${insertedEarnings?.length || 0} earnings records`,
      created: insertedEarnings?.length || 0
    });

  } catch (error) {
    console.error('Unexpected error in earnings sync:', error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
