import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// Create a withdrawal request
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

    // Get user's profile to check for Stripe Connect account
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_connect_account_id, first_name, last_name, email')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: "User profile not found" },
        { status: 404 }
      );
    }

    // Note: Students don't need Stripe Connect account anymore since admin handles payments
    // But we'll keep this check for now in case it's needed for other purposes

    // Get pending earnings for withdrawal (only those with status 'pending', not 'requested' or 'withdrawn')
    const { data: pendingEarnings, error: earningsError } = await supabase
      .from('earnings')
      .select('id, amount, booking_id, status')
      .eq('user_id', user.id)
      .eq('status', 'pending'); // Only truly available earnings

    if (earningsError) {
      console.error('Error fetching pending earnings:', earningsError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch pending earnings" },
        { status: 500 }
      );
    }

    if (!pendingEarnings || pendingEarnings.length === 0) {
      return NextResponse.json(
        { success: false, error: "No pending earnings available for withdrawal" },
        { status: 400 }
      );
    }

    // Check if there's already a pending withdrawal request
    const { data: existingRequest, error: existingError } = await (supabase as any)
      .from('withdrawal_requests')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .single();

    if (existingRequest && !existingError) {
      return NextResponse.json(
        { success: false, error: "You already have a pending withdrawal request" },
        { status: 400 }
      );
    }

    const totalAmount = pendingEarnings.reduce((sum: number, earning: any) => sum + earning.amount, 0);
    const platformFee = totalAmount * 0.1; // 10% platform fee
    const payoutAmount = totalAmount - platformFee;

    if (payoutAmount < 0.50) { // Minimum $0.50 payout
      return NextResponse.json(
        { success: false, error: "Minimum withdrawal amount is $0.50" },
        { status: 400 }
      );
    }

    // Store earnings IDs for the withdrawal request
    const earningsIds = pendingEarnings.map((e: any) => e.id);

    // Create withdrawal request with earnings IDs in notes
    const { data: withdrawalRequest, error: requestError } = await (supabase as any)
      .from('withdrawal_requests')
      .insert({
        user_id: user.id,
        amount: payoutAmount,
        platform_fee: platformFee,
        total_earnings: totalAmount,
        status: 'pending',
        stripe_connect_account_id: (profile as any).stripe_connect_account_id || null,
        notes: JSON.stringify({ earnings_ids: earningsIds })
      })
      .select()
      .single();

    if (requestError) {
      console.error('Error creating withdrawal request:', requestError);
      return NextResponse.json(
        { success: false, error: "Failed to create withdrawal request" },
        { status: 500 }
      );
    }

    // Mark earnings as linked to withdrawal request by storing request ID in notes
    // This prevents them from showing in available balance
    // We can't change status to 'requested' due to DB constraint, so we track via notes
    const { error: updateEarningsError } = await (supabase as any)
      .from("earnings")
      .update({
        notes: JSON.stringify({ withdrawal_request_id: withdrawalRequest.id })
      })
      .in('id', earningsIds);

    if (updateEarningsError) {
      console.error('Error updating earnings notes:', updateEarningsError);
      // Don't fail the request, but log the error
    }

    return NextResponse.json({
      success: true,
      withdrawalRequest: withdrawalRequest,
      message: "Withdrawal request submitted successfully. An admin will process it shortly."
    });

  } catch (error) {
    console.error('Unexpected error in withdrawal request:', error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Get user's withdrawal requests
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

    // Get withdrawal requests for the user
    const { data: withdrawalRequests, error: requestsError } = await (supabase as any)
      .from('withdrawal_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (requestsError) {
      console.error('Error fetching withdrawal requests:', requestsError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch withdrawal requests" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      withdrawalRequests: withdrawalRequests || []
    });

  } catch (error) {
    console.error('Unexpected error fetching withdrawal requests:', error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

