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
    // ⚠️ Stripe requires HTTPS for redirect URIs (even in test mode)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const clientId = process.env.STRIPE_CLIENT_ID;
    
    // Validate that we're using HTTPS for Stripe Connect
    if (baseUrl.startsWith('http://')) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Stripe Connect requires HTTPS. For local development, deploy to a staging environment or use a deployment URL (e.g., Vercel preview).",
          details: {
            currentUrl: baseUrl,
            instructions: [
              "1. Deploy your app to Vercel/Netlify and use the preview URL",
              "2. Copy the HTTPS deployment URL (e.g., https://your-app.vercel.app)",
              "3. Update NEXT_PUBLIC_APP_URL in .env.local to the deployment URL",
              "4. Add the callback URL to Stripe Dashboard: {deployment_url}/api/stripe/connect/callback"
            ]
          }
        },
        { status: 400 }
      );
    }
    
    const redirectUri = `${baseUrl}/api/stripe/connect/callback`;
    
    if (!clientId) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Stripe Connect not properly configured. Missing STRIPE_CLIENT_ID environment variable.",
          debug: {
            hasClientId: false,
            redirectUri: redirectUri
          }
        },
        { status: 500 }
      );
    }

    // Log redirect URI for debugging
    console.log('Stripe Connect OAuth setup:', {
      redirectUri,
      clientId: clientId ? `${clientId.substring(0, 10)}...` : 'MISSING',
      userId: user.id,
      baseUrl
    });
    console.log('Make sure this exact URI is added to Stripe Dashboard → Connect → Settings → OAuth settings');

    // Create OAuth authorization URL
    const authUrl = new URL('https://connect.stripe.com/oauth/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('scope', 'read_write');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', user.id); // Pass user ID as state

    const authUrlString = authUrl.toString();
    console.log('Generated OAuth URL:', authUrlString.substring(0, 100) + '...');

    return NextResponse.json({
      success: true,
      authUrl: authUrlString,
      message: "Redirect to Stripe Connect authorization",
      redirectUri // Include for debugging
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
