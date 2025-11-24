import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Test endpoint to manually update a profile with a Stripe Connect account ID
 * This is for debugging purposes only
 * 
 * Usage: POST /api/stripe/connect/test-update
 * Body: { userId: "user-uuid", accountId: "acct_xxx" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, accountId } = body;

    if (!userId || !accountId) {
      return NextResponse.json(
        { success: false, error: "Missing userId or accountId" },
        { status: 400 }
      );
    }

    const supabaseService = createServiceRoleClient();
    
    // Check if profile exists
    const { data: existingProfile, error: checkError } = await supabaseService
      .from('profiles')
      .select('id, stripe_connect_account_id')
      .eq('id', userId)
      .single();

    if (checkError || !existingProfile) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Profile not found",
          checkError: checkError as any
        },
        { status: 404 }
      );
    }

    console.log('Profile before update:', existingProfile);

    // Update the profile
    const { data: updatedProfile, error: updateError } = await supabaseService
      .from('profiles')
      .update({ stripe_connect_account_id: accountId })
      .eq('id', userId)
      .select('stripe_connect_account_id')
      .single();

    if (updateError) {
      const errorDetails = updateError as any;
      return NextResponse.json(
        {
          success: false,
          error: "Update failed",
          errorDetails: {
            code: errorDetails.code,
            message: errorDetails.message,
            details: errorDetails.details,
            hint: errorDetails.hint
          }
        },
        { status: 500 }
      );
    }

    // Verify the update
    const { data: verifyProfile, error: verifyError } = await supabaseService
      .from('profiles')
      .select('stripe_connect_account_id')
      .eq('id', userId)
      .single();

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        before: existingProfile.stripe_connect_account_id,
        after: updatedProfile?.stripe_connect_account_id,
        verified: verifyProfile?.stripe_connect_account_id,
        verificationError: verifyError as any
      }
    });

  } catch (error: any) {
    console.error('Test update error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Unknown error" 
      },
      { status: 500 }
    );
  }
}

