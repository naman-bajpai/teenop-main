import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';

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
      .single() as { data: { stripe_connect_account_id: string | null; first_name: string; last_name: string; email: string } | null; error: any };

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: "User profile not found" },
        { status: 404 }
      );
    }

    // Check if user has a Stripe Connect account
    if (!profile.stripe_connect_account_id) {
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
      .eq('status', 'pending') as { data: { id: string; amount: number; booking_id: string; status: string }[] | null; error: any };

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

    const totalAmount = pendingEarnings.reduce((sum, earning) => sum + earning.amount, 0);
    const platformFee = totalAmount * 0.1; // 10% platform fee
    const payoutAmount = Math.round((totalAmount - platformFee) * 100); // Convert to cents

    if (payoutAmount < 50) { // Minimum $0.50 payout
      return NextResponse.json(
        { success: false, error: "Minimum withdrawal amount is $0.50" },
        { status: 400 }
      );
    }

    try {
      // Create a transfer to the user's Stripe Connect account
      const transfer = await stripe.transfers.create({
        amount: payoutAmount,
        currency: 'usd',
        destination: profile.stripe_connect_account_id,
        transfer_group: `withdrawal_${user.id}_${Date.now()}`,
        metadata: {
          user_id: user.id,
          withdrawal_type: 'earnings',
          platform_fee: platformFee.toString(),
          total_earnings: totalAmount.toString()
        }
      });

      // Create withdrawal record
      const { data: withdrawal, error: withdrawalError } = await supabase
        .from('withdrawals')
        .insert({
          user_id: user.id,
          amount: payoutAmount / 100, // Convert back to dollars
          platform_fee: platformFee,
          total_earnings: totalAmount,
          stripe_transfer_id: transfer.id,
          status: 'processing',
          stripe_connect_account_id: profile.stripe_connect_account_id
        } as any)
        .select()
        .single();

      if (withdrawalError) {
        console.error('Error creating withdrawal record:', withdrawalError);
        return NextResponse.json(
          { success: false, error: "Failed to create withdrawal record" },
          { status: 500 }
        );
      }

      // Update earnings status to 'withdrawn'
      const earningIds = pendingEarnings.map(e => e.id);
      const { error: updateError } = await (supabase as any)
        .from('earnings')
        .update({ 
          status: 'withdrawn',
          withdrawal_id: (withdrawal as any)?.id,
          withdrawn_at: new Date().toISOString()
        })
        .in('id', earningIds);

      if (updateError) {
        console.error('Error updating earnings status:', updateError);
        // Note: Transfer was already created, so we should still return success
        // but log the error for manual reconciliation
      }

      return NextResponse.json({
        success: true,
        amount: payoutAmount / 100,
        platformFee: platformFee,
        totalEarnings: totalAmount,
        transferId: transfer.id,
        withdrawalId: (withdrawal as any)?.id,
        message: `$${(payoutAmount / 100).toFixed(2)} has been transferred to your account. Platform fee: $${platformFee.toFixed(2)}`
      });

    } catch (stripeError: any) {
      console.error('Stripe error during withdrawal:', stripeError);
      return NextResponse.json(
        { 
          success: false, 
          error: `Payment processing failed: ${stripeError.message}` 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Unexpected error in withdrawal:', error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Get withdrawal history
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

    // Get withdrawal history
    const { data: withdrawals, error: withdrawalsError } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (withdrawalsError) {
      console.error('Error fetching withdrawals:', withdrawalsError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch withdrawal history" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      withdrawals: withdrawals || []
    });

  } catch (error) {
    console.error('Unexpected error fetching withdrawals:', error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
