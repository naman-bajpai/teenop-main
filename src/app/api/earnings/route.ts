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

    // Get recent earnings for the user
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

    // Get pending withdrawal requests for this user to exclude their earnings from available pending
    const { data: pendingWithdrawalRequests, error: withdrawalRequestsError } = await (supabase as any)
      .from('withdrawal_requests')
      .select('notes, total_earnings')
      .eq('user_id', user.id)
      .eq('status', 'pending');

    let earningsInPendingRequests = 0;
    if (pendingWithdrawalRequests && !withdrawalRequestsError) {
      // Sum up the total_earnings from all pending withdrawal requests
      earningsInPendingRequests = pendingWithdrawalRequests.reduce((sum: number, req: any) => {
        return sum + (parseFloat(req.total_earnings) || 0);
      }, 0);
    }

    // Calculate available pending earnings (total pending minus earnings in pending withdrawal requests)
    const totalPendingEarnings = parseFloat(stats.pending_earnings) || 0;
    const availablePendingEarnings = Math.max(0, totalPendingEarnings - earningsInPendingRequests);

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
