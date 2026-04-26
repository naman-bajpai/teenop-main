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
    if ((withdrawalRequest as any).status !== 'processing') {
      return NextResponse.json(
        { success: false, error: `Withdrawal request is already ${(withdrawalRequest as any).status}` },
        { status: 400 }
      );
    }

    // Get user profile separately
    const { data: userProfile, error: userProfileError } = await supabase 
      .from('profiles')
      .select('id, first_name, last_name, email, stripe_connect_account_id')
      .eq('id', (withdrawalRequest as any).user_id)
      .single();

    if (userProfileError || !userProfile) {
      return NextResponse.json(
        { success: false, error: "User profile not found" },
        { status: 400 }
      );
    }

    const connectedAccountId =
      (withdrawalRequest as any).stripe_connect_account_id ||
      (userProfile as any).stripe_connect_account_id;

    if (!connectedAccountId) {
      return NextResponse.json(
        {
          success: false,
          error: "This teen has not connected Stripe yet. They need to connect a payout account before this withdrawal can be approved."
        },
        { status: 400 }
      );
    }

    if ((withdrawalRequest as any).stripe_transfer_id) {
      return NextResponse.json(
        {
          success: false,
          error: "This withdrawal request already has a Stripe transfer attached."
        },
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

    // Use service role client to fetch earnings (bypasses RLS)
    const supabaseService = createServiceRoleClient();
    
    // Get earnings that are in this withdrawal request (using earnings IDs from notes)
    let pendingEarnings: any[] = [];
    if (earningsIds.length > 0) {
      // First, find all earnings regardless of status to see what we're working with
      // Use service role client to bypass RLS
      const { data: allEarnings, error: allEarningsError } = await (supabaseService as any)
        .from('earnings')
        .select('id, amount, booking_id, status')
        .eq('user_id', (withdrawalRequest as any).user_id)
        .in('id', earningsIds);

      if (allEarningsError) {
        console.error('Error fetching earnings for withdrawal request:', allEarningsError);
        return NextResponse.json(
          { success: false, error: "Failed to fetch earnings for this withdrawal request" },
          { status: 500 }
        );
      }

      if (!allEarnings || allEarnings.length === 0) {
        console.error(`No earnings found with IDs: ${earningsIds.join(', ')}`);
        return NextResponse.json(
          { 
            success: false, 
            error: `No earnings found for this withdrawal request. Expected ${earningsIds.length} earnings, but none were found in the database.` 
          },
          { status: 400 }
        );
      }

      console.log(`Found ${allEarnings.length} earnings with statuses:`, allEarnings.map((e: any) => ({ id: e.id, status: e.status, amount: e.amount })));

      // Check if any earnings are already in an approved/processed withdrawal request
      const completedEarnings = allEarnings.filter((e: any) => e.status === 'completed');
      if (completedEarnings.length > 0) {
        // Check if these completed earnings are in an approved withdrawal request
        const { data: approvedRequests } = await (supabaseService as any)
          .from('withdrawal_requests')
          .select('id, status, notes')
          .eq('user_id', (withdrawalRequest as any).user_id)
          .in('status', ['approved', 'processed'])
          .neq('id', requestId); // Exclude the current request

        let alreadyProcessed = false;
        if (approvedRequests && Array.isArray(approvedRequests)) {
          for (const wr of approvedRequests) {
            if (wr.notes) {
              try {
                const notes = JSON.parse(wr.notes);
                if (notes.earnings_ids && Array.isArray(notes.earnings_ids)) {
                  for (const completedEarning of completedEarnings) {
                    if (notes.earnings_ids.includes(completedEarning.id)) {
                      alreadyProcessed = true;
                      console.warn(`Earning ${completedEarning.id} is already in approved withdrawal request ${wr.id}`);
                      break;
                    }
                  }
                  if (alreadyProcessed) break;
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }

        if (alreadyProcessed) {
          return NextResponse.json(
            { 
              success: false, 
              error: `Some earnings have already been processed in another withdrawal request. Cannot process this withdrawal request.` 
            },
            { status: 400 }
          );
        } else {
          // Earnings are 'completed' but not in an approved withdrawal request
          // This likely means they were incorrectly marked as completed (e.g., from sync route)
          // Update them to 'pending' so we can process them
          console.log(`Earnings are 'completed' but not in an approved withdrawal request. Updating to 'pending' status.`);
          const completedEarningIds = completedEarnings.map((e: any) => e.id);
          const { error: updateError } = await (supabaseService as any)
            .from('earnings')
            .update({ 
              status: 'pending',
              updated_at: new Date().toISOString()
            })
            .in('id', completedEarningIds);

          if (updateError) {
            console.error('Error updating earnings from completed to pending:', updateError);
            return NextResponse.json(
              { 
                success: false, 
                error: `Earnings are in 'completed' status but failed to update to 'pending'. Please try again.` 
              },
              { status: 500 }
            );
          } else {
            console.log(`Updated ${completedEarningIds.length} earnings from 'completed' to 'pending' status`);
            // Update the earnings in our array
            completedEarnings.forEach((e: any) => e.status = 'pending');
          }
        }
      }

      // Filter for earnings that can be processed (pending status)
      const validStatuses = ['pending']; // Only process pending earnings
      pendingEarnings = allEarnings.filter((e: any) => validStatuses.includes(e.status));

      if (pendingEarnings.length === 0) {
        // Earnings exist but are not in pending status
        const statuses = [...new Set(allEarnings.map((e: any) => e.status))];
        return NextResponse.json(
          { 
            success: false, 
            error: `Earnings found but are not in 'pending' status. Current statuses: ${statuses.join(', ')}. The earnings may have already been processed or the withdrawal request may be invalid.` 
          },
          { status: 400 }
        );
      }

      console.log(`Processing ${pendingEarnings.length} pending earnings for withdrawal request ${requestId}`);
    } else {
      // Fallback: get all pending earnings for this user (for backward compatibility)
      // Use service role client to bypass RLS
      const { data: earnings, error: earningsError } = await (supabaseService as any)
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
      // Provide more detailed error message
      let errorMessage = "No pending earnings found for this withdrawal request.";
      if (earningsIds.length > 0) {
        errorMessage += ` Expected ${earningsIds.length} earnings, but none were found with status 'pending'.`;
        errorMessage += " The earnings may have already been processed or the withdrawal request may be invalid.";
      } else {
        errorMessage += " No earnings were associated with this withdrawal request.";
      }
      
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      );
    }
    
    // Verify the total amount matches
    const totalEarningsAmount = pendingEarnings.reduce((sum: number, e: any) => sum + parseFloat(e.amount || 0), 0);
    const expectedAmount = parseFloat((withdrawalRequest as any).total_earnings || 0);
    
    // Allow small difference due to rounding (within $0.01)
    if (Math.abs(totalEarningsAmount - expectedAmount) > 0.01) {
      console.warn(`Amount mismatch: Expected ${expectedAmount}, Found ${totalEarningsAmount}`);
      // Still proceed, but log the warning
    }

    // Continue using service role client for updates (already created above)

    try {
      const transferAmountCents = Math.round(parseFloat((withdrawalRequest as any).amount || 0) * 100);

      if (transferAmountCents < 50) {
        return NextResponse.json(
          { success: false, error: "Transfer amount must be at least $0.50" },
          { status: 400 }
        );
      }

      const transfer = await stripe.transfers.create(
        {
          amount: transferAmountCents,
          currency: 'usd',
          destination: connectedAccountId,
          transfer_group: `withdrawal_request_${requestId}`,
          metadata: {
            withdrawal_request_id: requestId,
            user_id: (withdrawalRequest as any).user_id,
            approved_by: user.id,
            earnings_count: String(pendingEarnings.length),
            total_earnings: String(totalEarningsAmount)
          }
        },
        {
          idempotencyKey: `withdrawal-request-${requestId}`
        }
      );

      // Move funds from the connected Stripe balance to the connected bank account.
      // A transfer alone only credits the teen's Stripe balance.
      const payout = await stripe.payouts.create(
        {
          amount: transferAmountCents,
          currency: 'usd',
          metadata: {
            withdrawal_request_id: requestId,
            transfer_id: transfer.id,
            user_id: (withdrawalRequest as any).user_id
          }
        },
        {
          stripeAccount: connectedAccountId,
          idempotencyKey: `withdrawal-request-payout-${requestId}`
        }
      );

      // Update withdrawal request status to 'approved' after the Stripe transfer succeeds
      const { error: updateRequestError } = await (supabaseService as any)
        .from('withdrawal_requests')
        .update({
          status: 'approved',
          stripe_connect_account_id: connectedAccountId,
          stripe_transfer_id: transfer.id,
          processed_at: new Date().toISOString(),
          processed_by: user.id,
          notes: JSON.stringify({
            ...(withdrawalRequest as any).notes ? (() => {
              try { return JSON.parse((withdrawalRequest as any).notes); }
              catch { return {}; }
            })() : {},
            payout_id: payout.id
          })
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

      console.log(
        `Successfully processed withdrawal request ${requestId}. Created transfer ${transfer.id} and payout ${payout.id} for $${((withdrawalRequest as any).amount).toFixed(2)}.`
      );

      return NextResponse.json({
        success: true,
        message: `Withdrawal request approved and $${((withdrawalRequest as any).amount).toFixed(2)} was sent to the teen's connected bank via Stripe payout.`,
        withdrawalRequest: {
          id: requestId,
          amount: (withdrawalRequest as any).amount,
          user_id: (withdrawalRequest as any).user_id,
          user_name: `${userProfile.first_name} ${userProfile.last_name}`,
          user_email: userProfile.email,
          stripe_transfer_id: transfer.id,
          stripe_payout_id: payout.id
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

