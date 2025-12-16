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

    // Get earnings stats for the user
    const { data: earningsStats, error: statsError } = await supabase
      .rpc('get_user_earnings_stats', { p_user_id: user.id } as any);

    if (statsError) {
      console.error('Error fetching earnings stats:', statsError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch earnings stats" },
        { status: 500 }
      );
    }

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

    const stats = earningsStats?.[0] as any || {
      total_earned: 0,
      this_week_earned: 0,
      this_month_earned: 0,
      pending_earnings: 0
    };

    // Calculate available balance: only earnings with status "pending" that are not in a withdrawal request
    // Earnings in withdrawal requests have their withdrawal_request_id stored in notes
    const { data: allPendingEarnings, error: availableEarningsError } = await supabase
      .from('earnings')
      .select('amount, notes, withdrawal_id')
      .eq('user_id', user.id)
      .eq('status', 'pending'); // Only count pending earnings

    // Filter out earnings that are in withdrawal requests
    // Withdrawal requests store the request ID in notes as JSON: { withdrawal_request_id: "..." }
    let availablePendingEarnings = 0;
    if (allPendingEarnings && !availableEarningsError) {
      availablePendingEarnings = allPendingEarnings
        .filter((earning: any) => {
          // Exclude if it has a withdrawal_id (already processed)
          if (earning.withdrawal_id) return false;
          // Exclude if notes contains withdrawal_request_id (in pending withdrawal request)
          if (earning.notes) {
            try {
              const notesData = JSON.parse(earning.notes);
              if (notesData.withdrawal_request_id) return false;
            } catch (e) {
              // If notes is not JSON, ignore
            }
          }
          return true;
        })
        .reduce((sum: number, earning: any) => {
          return sum + (parseFloat(earning.amount.toString()) || 0);
        }, 0);
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalEarned: parseFloat(stats.total_earned) || 0,
        thisWeekEarned: parseFloat(stats.this_week_earned) || 0,
        thisMonthEarned: parseFloat(stats.this_month_earned) || 0,
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
