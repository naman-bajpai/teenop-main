import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';

// Process a withdrawal request (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || (profile as any).role !== 'admin') {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    const { id: requestId } = await params;

    // Get the withdrawal request
    const { data: withdrawalRequest, error: requestError } = await (supabase as any)
      .from('withdrawal_requests')
      .select(`
        *,
        profiles!withdrawal_requests_user_id_fkey (
          id,
          first_name,
          last_name,
          email,
          stripe_connect_account_id
        )
      `)
      .eq('id', requestId)
      .single();

    if (requestError || !withdrawalRequest) {
      return NextResponse.json(
        { success: false, error: "Withdrawal request not found" },
        { status: 404 }
      );
    }

    // Check if already processed
    if ((withdrawalRequest as any).status !== 'pending') {
      return NextResponse.json(
        { success: false, error: `Withdrawal request is already ${(withdrawalRequest as any).status}` },
        { status: 400 }
      );
    }

    const userProfile = (withdrawalRequest as any).profiles;
    if (!userProfile || !userProfile.stripe_connect_account_id) {
      return NextResponse.json(
        { success: false, error: "User does not have a Stripe Connect account" },
        { status: 400 }
      );
    }

    // Get the earnings IDs that were included in this withdrawal request
    // They should be stored in the notes field as JSON
    let earningsIds: string[] = [];
    try {
      if ((withdrawalRequest as any).notes) {
        const notesData = JSON.parse((withdrawalRequest as any).notes);
        if (notesData.earnings_ids && Array.isArray(notesData.earnings_ids)) {
          earningsIds = notesData.earnings_ids;
        }
      }
    } catch (e) {
      console.warn('Could not parse earnings IDs from withdrawal request notes:', e);
    }

    // If we don't have earnings IDs stored, get all pending earnings for this user
    // (fallback for old withdrawal requests)
    let pendingEarnings: any[] = [];
    if (earningsIds.length > 0) {
      const { data: earnings, error: earningsError } = await supabase
        .from('earnings')
        .select('id, amount, booking_id, status')
        .eq('user_id', (withdrawalRequest as any).user_id)
        .in('id', earningsIds)
        .eq('status', 'pending');

      if (earningsError) {
        console.error('Error fetching earnings for withdrawal request:', earningsError);
        return NextResponse.json(
          { success: false, error: "Failed to fetch earnings for this withdrawal request" },
          { status: 500 }
        );
      }

      pendingEarnings = earnings || [];
    } else {
      // Fallback: get all pending earnings (for backward compatibility)
      const { data: earnings, error: earningsError } = await supabase
        .from('earnings')
        .select('id, amount, booking_id, status')
        .eq('user_id', (withdrawalRequest as any).user_id)
        .eq('status', 'pending');

      if (earningsError) {
        console.error('Error fetching pending earnings:', earningsError);
        return NextResponse.json(
          { success: false, error: "Failed to fetch pending earnings" },
          { status: 500 }
        );
      }

      pendingEarnings = earnings || [];
      
      // Limit to the amount specified in the withdrawal request
      let totalAmount = 0;
      const selectedEarnings: any[] = [];
      for (const earning of pendingEarnings) {
        if (totalAmount + earning.amount <= (withdrawalRequest as any).total_earnings) {
          selectedEarnings.push(earning);
          totalAmount += earning.amount;
        } else {
          break;
        }
      }
      pendingEarnings = selectedEarnings;
    }

    if (pendingEarnings.length === 0) {
      return NextResponse.json(
        { success: false, error: "No pending earnings found for this withdrawal request" },
        { status: 400 }
      );
    }

    const payoutAmount = Math.round((withdrawalRequest as any).amount * 100); // Convert to cents

    try {
      // Create a transfer to the user's Stripe Connect account
      const transfer = await stripe.transfers.create({
        amount: payoutAmount,
        currency: 'usd',
        destination: userProfile.stripe_connect_account_id,
        transfer_group: `withdrawal_${(withdrawalRequest as any).user_id}_${Date.now()}`,
        metadata: {
          user_id: (withdrawalRequest as any).user_id,
          withdrawal_request_id: requestId,
          withdrawal_type: 'earnings',
          platform_fee: (withdrawalRequest as any).platform_fee.toString(),
          total_earnings: (withdrawalRequest as any).total_earnings.toString()
        }
      });

      // Use service role client to update withdrawal request and earnings
      const supabaseService = createServiceRoleClient();

      // Update withdrawal request status
      const { error: updateRequestError } = await (supabaseService as any)
        .from('withdrawal_requests')
        .update({
          status: 'processed',
          processed_at: new Date().toISOString(),
          processed_by: user.id,
          stripe_transfer_id: transfer.id
        })
        .eq('id', requestId);

      if (updateRequestError) {
        console.error('Error updating withdrawal request:', updateRequestError);
        // Note: Transfer was already created, so we should still return success
      }

      // Create withdrawal record in withdrawals table
      const { data: withdrawal, error: withdrawalError } = await (supabaseService as any)
        .from('withdrawals')
        .insert({
          user_id: (withdrawalRequest as any).user_id,
          amount: (withdrawalRequest as any).amount,
          platform_fee: (withdrawalRequest as any).platform_fee,
          total_earnings: (withdrawalRequest as any).total_earnings,
          stripe_transfer_id: transfer.id,
          status: 'processing',
          stripe_connect_account_id: userProfile.stripe_connect_account_id
        })
        .select()
        .single();

      if (withdrawalError) {
        console.error('Error creating withdrawal record:', withdrawalError);
        // Note: Transfer was already created, so we should still return success
      }

      // Update earnings status to 'withdrawn'
      const earningIds = pendingEarnings.map((e: any) => e.id);
      const { error: updateEarningsError } = await (supabaseService as any)
        .from('earnings')
        .update({ 
          status: 'withdrawn',
          withdrawal_id: (withdrawal as any)?.id || null,
          withdrawn_at: new Date().toISOString()
        })
        .in('id', earningIds);

      if (updateEarningsError) {
        console.error('Error updating earnings status:', updateEarningsError);
        // Note: Transfer was already created, so we should still return success
        // but log the error for manual reconciliation
      } else {
        console.log(`Successfully marked ${earningIds.length} earnings as withdrawn. Pending earnings should now be reduced.`);
      }

      return NextResponse.json({
        success: true,
        transferId: transfer.id,
        withdrawalId: (withdrawal as any)?.id,
        message: `Withdrawal processed successfully. $${((withdrawalRequest as any).amount).toFixed(2)} transferred to user's account.`
      });

    } catch (stripeError: any) {
      console.error('Stripe error during withdrawal processing:', stripeError);
      
      // Update withdrawal request status to failed
      try {
        const supabaseService = createServiceRoleClient();
        await (supabaseService as any)
          .from('withdrawal_requests')
          .update({
            status: 'failed',
            processed_at: new Date().toISOString(),
            processed_by: user.id,
          })
          .eq('id', requestId);
      } catch (updateError) {
        console.error('Error updating withdrawal request status:', updateError);
      }

      return NextResponse.json(
        { 
          success: false, 
          error: `Payment processing failed: ${stripeError.message}` 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Unexpected error processing withdrawal request:', error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

