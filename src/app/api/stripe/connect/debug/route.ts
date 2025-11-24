import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Debug endpoint to check Stripe Connect status
 * GET /api/stripe/connect/debug?userId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId parameter" },
        { status: 400 }
      );
    }

    // Use service role to check profile
    const supabaseService = createServiceRoleClient();
    
    // Get profile
    const { data: profile, error: profileError } = await supabaseService
      .from('profiles')
      .select('id, email, stripe_connect_account_id')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { 
          error: "Profile not found",
          profileError: profileError as any
        },
        { status: 404 }
      );
    }

    // Check environment variables
    const envCheck = {
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasStripeClientId: !!process.env.STRIPE_CLIENT_ID,
      hasStripeSecretKey: !!process.env.STRIPE_SECRET_KEY,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
      expectedCallbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/stripe/connect/callback`
    };

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        email: profile.email,
        stripe_connect_account_id: profile.stripe_connect_account_id,
        hasAccount: !!profile.stripe_connect_account_id
      },
      environment: envCheck
    });

  } catch (error: any) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      { 
        error: error.message || "Unknown error",
        stack: error.stack
      },
      { status: 500 }
    );
  }
}

