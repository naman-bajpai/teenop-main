import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

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
      .select('*')
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

    // Get user profile separately
    const { data: userProfile, error: userProfileError } = await supabase 
      .from('profiles')
      .select('id, first_name, last_name, email')
      .eq('id', (withdrawalRequest as any).user_id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { success: false, error: "User profile not found" },
        { status: 400 }
      );
    }
    
    // Note: Admin will manually pay the student, so Stripe Connect account is not required

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

    // Get earnings that are in this withdrawal request (using earnings IDs from notes)
    let pendingEarnings: any[] = [];
    if (earningsIds.length > 0) {
      const { data: earnings, error: earningsError } = await supabase
        .from('earnings')
        .select('id, amount, booking_id, status')
        .eq('user_id', (withdrawalRequest as any).user_id)
        .in('id', earningsIds)
        .eq('status', 'completed'); // Should still be pending

      if (earningsError) {
        console.error('Error fetching earnings for withdrawal request:', earningsError);
        return NextResponse.json(
          { success: false, error: "Failed to fetch earnings for this withdrawal request" },
          { status: 500 }
        );
      }

      pendingEarnings = earnings || [];
    } else {
      // Fallback: get all pending earnings for this user (for backward compatibility)
      const { data: earnings, error: earningsError } = await supabase
        .from('earnings')
        .select('id, amount, booking_id, status')
        .eq('user_id', (withdrawalRequest as any).user_id)
        .eq('status', 'pending')
        .limit(100);

      if (earningsError) {
        console.error('Error fetching earnings:', earningsError);
        return NextResponse.json(
          { success: false, error: "Failed to fetch earnings" },
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

    // Use service role client to update withdrawal request and earnings
    const supabaseService = createServiceRoleClient();

    try {
      // Update withdrawal request status to 'processed' (admin has approved)
      // Admin will manually pay the student via Stripe, so we don't create automatic transfer
      const { error: updateRequestError } = await (supabaseService as any)
        .from('withdrawal_requests')
        .update({
          status: 'processed',
          processed_at: new Date().toISOString(),
          processed_by: user.id,
          notes: (withdrawalRequest as any).notes // Keep existing notes with earnings IDs
        })
        .eq('id', requestId);

      if (updateRequestError) {
        console.error('Error updating withdrawal request:', updateRequestError);
        return NextResponse.json(
          { success: false, error: "Failed to update withdrawal request" },
          { status: 500 }
        );
      }

      // Update earnings status to 'completed' (withdrawn)
      // We use 'completed' instead of 'withdrawn' because DB constraint doesn't allow 'withdrawn'
      const earningIds = pendingEarnings.map((e: any) => e.id);
      const { error: updateEarningsError } = await (supabaseService as any)
        .from('earnings')
        .update({ 
          status: 'completed', // Use 'completed' instead of 'withdrawn' due to DB constraint
          withdrawn_at: new Date().toISOString()
        })
        .in('id', earningIds);

      if (updateEarningsError) {
        console.error('Error updating earnings status:', updateEarningsError);
        return NextResponse.json(
          { success: false, error: "Failed to update earnings status" },
          { status: 500 }
        );
      }

      console.log(`Successfully processed withdrawal request. ${earningIds.length} earnings marked as withdrawn. Admin should manually pay $${((withdrawalRequest as any).amount).toFixed(2)} to the student via Stripe.`);

      return NextResponse.json({
        success: true,
        message: `Withdrawal request approved. Please manually pay $${((withdrawalRequest as any).amount).toFixed(2)} to the student via Stripe.`,
        withdrawalRequest: {
          id: requestId,
          amount: (withdrawalRequest as any).amount,
          user_id: (withdrawalRequest as any).user_id,
          user_name: `${userProfile.first_name} ${userProfile.last_name}`,
          user_email: userProfile.email
        }
      });

    } catch (error: any) {
      console.error('Error processing withdrawal request:', error);
      
      // Update withdrawal request status to failed
      try {
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
          error: `Failed to process withdrawal request: ${error.message}` 
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

