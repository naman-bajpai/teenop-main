import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

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

    // Calculate total_earned: only count earnings with status "completed" (after withdrawal approval)
    // This ensures pending earnings are NOT counted in total_earned
    const { data: completedEarnings, error: completedError } = await supabase
      .from('earnings')
      .select('amount, earned_at')
      .eq('user_id', user.id)
      .eq('status', 'completed'); // Only count completed (withdrawn) earnings

    if (completedError) {
      console.error('Error fetching completed earnings:', completedError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch earnings stats" },
        { status: 500 }
      );
    }

    // Calculate total earned (only completed earnings)
    const totalEarned = (completedEarnings || []).reduce((sum: number, earning: any) => {
      return sum + (parseFloat(earning.amount.toString()) || 0);
    }, 0);
    
    console.log(`[EARNINGS API] Total earned (completed only): $${totalEarned.toFixed(2)} from ${completedEarnings?.length || 0} earnings`);

    // Calculate this week's earnings (only completed)
    const now = new Date();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const thisWeekEarned = (completedEarnings || []).reduce((sum: number, earning: any) => {
      const earnedDate = new Date(earning.earned_at);
      if (earnedDate >= weekStart) {
        return sum + (parseFloat(earning.amount.toString()) || 0);
      }
      return sum;
    }, 0);

    // Calculate this month's earnings (only completed)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthEarned = (completedEarnings || []).reduce((sum: number, earning: any) => {
      const earnedDate = new Date(earning.earned_at);
      if (earnedDate >= monthStart) {
        return sum + (parseFloat(earning.amount.toString()) || 0);
      }
      return sum;
    }, 0);

    // Get recent earnings for the user (all statuses for history)
    const { data: recentEarnings, error: earningsError } = await supabase
      .from('earnings')
      .select(`
        *,
        bookings (
          id,
          requested_date,
          requested_time,
          total_price,
          services (
            title,
            category
          )
        )
      `)
      .eq('user_id', user.id)
      .order('earned_at', { ascending: false })
      .limit(10);

    if (earningsError) {
      console.error('Error fetching recent earnings:', earningsError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch recent earnings" },
        { status: 500 }
      );
    }

    // Calculate available balance: only earnings with status "pending" that are not in a withdrawal request
    // Get all pending earnings
    const { data: allPendingEarnings, error: availableEarningsError } = await supabase
      .from('earnings')
      .select('id, amount, withdrawal_id, booking_id, status')
      .eq('user_id', user.id)
      .eq('status', 'pending'); // Only count pending earnings
    
    console.log(`[EARNINGS API] Found ${allPendingEarnings?.length || 0} pending earnings for user ${user.id}`);

    // Lock earnings that are already in an open withdrawal (same statuses as POST /api/withdrawal-requests)
    const { data: pendingWithdrawalRequests, error: withdrawalRequestsError } = await (supabase as any)
      .from('withdrawal_requests')
      .select('notes')
      .eq('user_id', user.id)
      .in('status', ['pending', 'processing']);

    // Extract all earnings IDs that are in pending withdrawal requests
    const earningsInPendingRequests = new Set<string>();
    if (pendingWithdrawalRequests && !withdrawalRequestsError) {
      pendingWithdrawalRequests.forEach((req: any) => {
        if (req.notes) {
          try {
            const notesData = JSON.parse(req.notes);
            if (notesData.earnings_ids && Array.isArray(notesData.earnings_ids)) {
              notesData.earnings_ids.forEach((id: string) => earningsInPendingRequests.add(id));
            }
          } catch (e) {
            // If notes is not JSON, ignore
          }
        }
      });
    }

    // Filter out earnings that are in withdrawal requests or already withdrawn
    let availablePendingEarnings = 0;
    if (allPendingEarnings && !availableEarningsError) {
      const filteredEarnings = allPendingEarnings.filter((earning: any) => {
        // Exclude if it has a withdrawal_id (already processed/withdrawn)
        if (earning.withdrawal_id) {
          console.log(`[EARNINGS API] Excluding earning ${earning.id} - has withdrawal_id`);
          return false;
        }
        // Exclude if it's in a pending withdrawal request
        if (earningsInPendingRequests.has(earning.id)) {
          console.log(`[EARNINGS API] Excluding earning ${earning.id} - in pending withdrawal request`);
          return false;
        }
        return true;
      });
      
      availablePendingEarnings = filteredEarnings.reduce((sum: number, earning: any) => {
        return sum + (parseFloat(earning.amount.toString()) || 0);
      }, 0);
      
      console.log(`[EARNINGS API] Available pending earnings: $${availablePendingEarnings.toFixed(2)} from ${filteredEarnings.length} earnings`);
    } else if (availableEarningsError) {
      console.error('[EARNINGS API] Error fetching pending earnings:', availableEarningsError);
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalEarned: totalEarned, // Only completed (withdrawn) earnings
        thisWeekEarned: thisWeekEarned, // Only completed earnings from this week
        thisMonthEarned: thisMonthEarned, // Only completed earnings from this month
        pendingEarnings: availablePendingEarnings // Use available pending (excludes earnings in pending withdrawal requests)
      },
      recentEarnings: recentEarnings || []
    });

  } catch (error) {
    console.error('Unexpected error in earnings fetch:', error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
