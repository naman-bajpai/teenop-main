import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// Toggle user verification status (admin only)
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

    const { id: userId } = await params;

    // Get current user's verification status
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('is_verified')
      .eq('id', userId)
      .single();

    if (userError || !userProfile) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Toggle verification status
    const newVerificationStatus = !(userProfile as any).is_verified;

    // Update user verification status
    const { error: updateError } = await (supabase as any)
      .from('profiles')
      .update({ is_verified: newVerificationStatus })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating verification status:', updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update verification status" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      is_verified: newVerificationStatus,
      message: `User ${newVerificationStatus ? 'verified' : 'unverified'} successfully`
    });

  } catch (error) {
    console.error('Unexpected error in verify/unverify user:', error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

