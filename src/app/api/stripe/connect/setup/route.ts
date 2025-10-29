import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';
import { Database } from '@/lib/database.types';

export async function POST(request: NextRequest) {
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

    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('first_name, last_name, email, stripe_connect_account_id')
      .eq('id', user.id)
      .single() as { data: { first_name: string; last_name: string; email: string; stripe_connect_account_id: string | null } | null; error: any };

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: "User profile not found" },
        { status: 404 }
      );
    }

    // Check if user already has a Stripe Connect account
    if (profile.stripe_connect_account_id) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Stripe Connect account already exists",
          accountId: profile.stripe_connect_account_id
        },
        { status: 400 }
      );
    }

    // Create OAuth link for Stripe Connect
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const clientId = process.env.STRIPE_CLIENT_ID; // You'll need to add this to your .env
    
    if (!clientId) {
      return NextResponse.json(
        { success: false, error: "Stripe Connect not properly configured" },
        { status: 500 }
      );
    }

    // Create OAuth authorization URL
    const authUrl = new URL('https://connect.stripe.com/oauth/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('scope', 'read_write');
    authUrl.searchParams.set('redirect_uri', `${baseUrl}/api/stripe/connect/callback`);
    authUrl.searchParams.set('state', user.id); // Pass user ID as state

    return NextResponse.json({
      success: true,
      authUrl: authUrl.toString(),
      message: "Redirect to Stripe Connect authorization"
    });

  } catch (error: any) {
    console.error('Error creating Stripe Connect account:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to create payment account: ${error.message}` 
      },
      { status: 500 }
    );
  }
}

// Get account status
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

    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_connect_account_id')
      .eq('id', user.id)
      .single() as { data: { stripe_connect_account_id: string | null } | null; error: any };

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: "User profile not found" },
        { status: 404 }
      );
    }

    if (!profile.stripe_connect_account_id) {
      return NextResponse.json({
        success: true,
        hasAccount: false,
        accountStatus: null
      });
    }

    // Get account details from Stripe
    const account = await stripe.accounts.retrieve(profile.stripe_connect_account_id);
    
    // Create login link if account is complete
    let loginUrl = null;
    if (account.details_submitted && account.charges_enabled) {
      const loginLink = await stripe.accounts.createLoginLink(profile.stripe_connect_account_id);
      loginUrl = loginLink.url;
    }

    return NextResponse.json({
      success: true,
      hasAccount: true,
      accountStatus: {
        id: account.id,
        detailsSubmitted: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        requirements: account.requirements,
        loginUrl
      }
    });

  } catch (error: any) {
    console.error('Error fetching Stripe Connect account status:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to fetch account status: ${error.message}` 
      },
      { status: 500 }
    );
  }
}
