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
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch user profile" },
        { status: 500 }
      );
    }

    if (!profile) {
      console.error('User profile not found for user:', user.id);
      return NextResponse.json(
        { success: false, error: "User profile not found. Please complete your profile setup." },
        { status: 404 }
      );
    }

    // Stripe Connect is required because admin approval now triggers an automatic
    // Stripe transfer instead of a manual payout from the Stripe Dashboard.
    if (!(profile as any).stripe_connect_account_id) {
      return NextResponse.json(
        {
          success: false,
          error: "Please connect your Stripe account before requesting a withdrawal.",
          requiresStripeSetup: true
        },
        { status: 400 }
      );
    }

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

    // Check if there's already a processing withdrawal request
    const { data: existingRequest, error: existingError } = await (supabase as any)
      .from('withdrawal_requests')
      .select('id, status')
      .eq('user_id', user.id)
      .in('status', ['pending', 'processing'])
      .maybeSingle();

    // If there's an existing pending/processing request (and no error), reject
    if (existingRequest && !existingError) {
      return NextResponse.json(
        { success: false, error: "You already have a withdrawal request being processed" },
        { status: 400 }
      );
    }

    const totalAmount = pendingEarnings.reduce((sum: number, earning: any) => sum + earning.amount, 0);
    const platformFee = totalAmount * 0; // 0% platform fee
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
    // Note: Manual requests also use 'processing' status to match automatic creation
    const withdrawalRequestData = {
      user_id: user.id,
      amount: payoutAmount,
      platform_fee: platformFee,
      total_earnings: totalAmount,
      status: 'processing',
      stripe_connect_account_id: (profile as any).stripe_connect_account_id || null,
      notes: JSON.stringify({ earnings_ids: earningsIds })
    };

    console.log('Creating withdrawal request with data:', {
      user_id: user.id,
      amount: payoutAmount,
      total_earnings: totalAmount,
      earnings_count: earningsIds.length
    });

    const { data: withdrawalRequest, error: requestError } = await (supabase as any)
      .from('withdrawal_requests')
      .insert(withdrawalRequestData)
      .select()
      .single();

    if (requestError) {
      console.error('Error creating withdrawal request:', requestError);
      console.error('Request data:', withdrawalRequestData);
      return NextResponse.json(
        { 
          success: false, 
          error: requestError.message || "Failed to create withdrawal request",
          details: requestError
        },
        { status: 500 }
      );
    }

    if (!withdrawalRequest) {
      console.error('Withdrawal request created but no data returned');
      return NextResponse.json(
        { success: false, error: "Withdrawal request created but failed to retrieve data" },
        { status: 500 }
      );
    }

    // Earnings are tracked via withdrawal_requests.notes field (earnings_ids array)
    // The earnings API will exclude these earnings from pending balance calculations
    // When admin approves the withdrawal, earnings will be updated to 'completed' status

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

