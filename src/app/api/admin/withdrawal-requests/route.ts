import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// Get all withdrawal requests (admin only)
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

    // Get query parameters for filtering
    const url = new URL(request.url);
    const status = url.searchParams.get('status');

    // First, get withdrawal requests
    let query = (supabase as any)
      .from('withdrawal_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: withdrawalRequests, error: requestsError } = await query;

    if (requestsError) {
      console.error('Error fetching withdrawal requests:', requestsError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch withdrawal requests" },
        { status: 500 }
      );
    }

    // If no requests, return empty array
    if (!withdrawalRequests || withdrawalRequests.length === 0) {
      return NextResponse.json({
        success: true,
        withdrawalRequests: []
      });
    }

    // Get user IDs from withdrawal requests
    const userIds = withdrawalRequests.map((req: any) => req.user_id).filter(Boolean);

    // Fetch profiles separately if needed
    let profilesMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, stripe_connect_account_id')
        .in('id', userIds);

      if (!profilesError && profiles) {
        profiles.forEach((profile: any) => {
          profilesMap[profile.id] = profile;
        });
      }
    }

    // Attach profiles to withdrawal requests
    const withdrawalRequestsWithProfiles = withdrawalRequests.map((request: any) => ({
      ...request,
      profiles: profilesMap[request.user_id] || null
    }));

    return NextResponse.json({
      success: true,
      withdrawalRequests: withdrawalRequestsWithProfiles || []
    });

  } catch (error) {
    console.error('Unexpected error fetching withdrawal requests:', error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

