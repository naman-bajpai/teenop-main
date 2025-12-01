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

    // Check if user has a Stripe Connect account
    if (!profile || !(profile as any).stripe_connect_account_id) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Stripe Connect account not set up. Please complete your payment setup first.",
          requiresStripeSetup: true
        },
        { status: 400 }
      );
    }

    // Get pending earnings for withdrawal
    const { data: pendingEarnings, error: earningsError } = await supabase
      .from('earnings')
      .select('id, amount, booking_id, status')
      .eq('user_id', user.id)
      .eq('status', 'pending');

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

    // Create withdrawal request
    const { data: withdrawalRequest, error: requestError } = await (supabase as any)
      .from('withdrawal_requests')
      .insert({
        user_id: user.id,
        amount: payoutAmount,
        platform_fee: platformFee,
        total_earnings: totalAmount,
        status: 'pending',
        stripe_connect_account_id: (profile as any).stripe_connect_account_id
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

    // Mark earnings as linked to this withdrawal request by updating their withdrawal_id
    // We'll use a temporary marker - store the withdrawal_request id in notes or use withdrawal_id
    // For now, we'll update earnings to have a status that indicates they're in a withdrawal request
    // Actually, we need to link them properly. Let's update earnings to reference the withdrawal_request
    // Since we don't have withdrawal_request_id in earnings, we'll use the notes field temporarily
    // OR better: update earnings to have withdrawal_id pointing to a special marker
    // Actually, the best approach: store earnings IDs in withdrawal_requests table or update earnings status
    
    // For now, let's update the earnings to have a status that prevents them from being counted as pending
    // We'll use a custom approach: update earnings to have withdrawal_id set to a special value
    // But actually, we should add a field to track this. For now, let's use the notes field in earnings
    // OR we can create a junction table, but that's complex
    
    // Simpler: Update earnings status to 'requested' (we'll need to add this to the enum or use a different approach)
    // Actually, let's just ensure the earnings are properly linked when processing
    
    // For now, we'll store the earnings IDs in the withdrawal request notes field as JSON
    const earningsIds = pendingEarnings.map((e: any) => e.id);
    const { error: updateEarningsForRequest } = await (supabase as any)
      .from('withdrawal_requests')
      .update({
        notes: JSON.stringify({ earnings_ids: earningsIds })
      })
      .eq('id', withdrawalRequest.id);

    if (updateEarningsForRequest) {
      console.warn('Could not store earnings IDs in withdrawal request:', updateEarningsForRequest);
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

