import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';
import { Database } from '@/lib/database.types';
import { getStripeConnectRedirectUri, getStripeConnectBaseUrl } from '@/lib/stripe-connect';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Stripe Connect setup: Authentication error', authError);
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    console.log('Stripe Connect setup: User authenticated', { userId: user.id });

    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('first_name, last_name, email, stripe_connect_account_id')
      .eq('id', user.id)
      .single() as { data: { first_name: string; last_name: string; email: string; stripe_connect_account_id: string | null } | null; error: any };

    if (profileError || !profile) {
      console.error('Stripe Connect setup: Profile error', profileError);
      return NextResponse.json(
        { success: false, error: "User profile not found" },
        { status: 404 }
      );
    }

    console.log('Stripe Connect setup: Profile found', { 
      hasAccount: !!profile.stripe_connect_account_id,
      accountId: profile.stripe_connect_account_id 
    });

    // Check if user already has a Stripe Connect account
    if (profile.stripe_connect_account_id) {
      console.log('Stripe Connect setup: Account already exists', { accountId: profile.stripe_connect_account_id });
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
    const baseUrl = getStripeConnectBaseUrl();
    const originalBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    const clientId = process.env.STRIPE_CLIENT_ID;
    
    console.log('Stripe Connect setup: Environment check', {
      originalBaseUrl,
      normalizedBaseUrl: baseUrl,
      hasClientId: !!clientId,
      clientIdPrefix: clientId ? clientId.substring(0, 10) + '...' : 'MISSING'
    });
    
    // Validate that we're using HTTPS for Stripe Connect
    if (baseUrl.startsWith('http://')) {
      console.error('Stripe Connect setup: HTTP URL detected (HTTPS required)', { baseUrl });
      return NextResponse.json(
        { 
          success: false, 
          error: "Stripe Connect requires HTTPS. For local development, deploy to a staging environment or use a deployment URL (e.g., Vercel preview).",
          details: {
            currentUrl: baseUrl,
            originalUrl: originalBaseUrl,
            instructions: [
              "1. Deploy your app to Vercel/Netlify and use the preview URL",
              "2. Copy the HTTPS deployment URL (e.g., https://your-app.vercel.app)",
              "3. Update NEXT_PUBLIC_APP_URL in .env.local to the deployment URL (without trailing slash)",
              "4. Add the callback URL to Stripe Dashboard: {deployment_url}/api/stripe/connect/callback"
            ]
          }
        },
        { status: 400 }
      );
    }
    
    // Use shared function to ensure consistency with callback route
    const redirectUri = getStripeConnectRedirectUri();
    
    // Log for debugging - CRITICAL for debugging redirect URI mismatches
    console.log('🔗 Stripe Connect SETUP - Redirect URI:', redirectUri);
    console.log('🔗 This EXACT URI must be in Stripe Dashboard → Connect → Settings → OAuth → Redirect URIs');
    
    if (!clientId) {
      console.error('Stripe Connect setup: Missing STRIPE_CLIENT_ID', {
        redirectUri,
        baseUrl,
        envKeys: Object.keys(process.env).filter(k => k.includes('STRIPE'))
      });
      return NextResponse.json(
        { 
          success: false, 
          error: "Stripe Connect not properly configured. Missing STRIPE_CLIENT_ID environment variable.",
          debug: {
            hasClientId: false,
            redirectUri: redirectUri,
            instructions: [
              "1. Go to Stripe Dashboard → Connect → Settings → OAuth settings",
              "2. Copy your Client ID (starts with 'ca_')",
              "3. Add STRIPE_CLIENT_ID=ca_... to your .env.local file",
              "4. Restart your development server"
            ]
          }
        },
        { status: 500 }
      );
    }

    // Log redirect URI for debugging - CRITICAL for debugging redirect URI mismatches
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔗 Stripe Connect SETUP - Redirect URI:', redirectUri);
    console.log('🔗 This EXACT URI must be in Stripe Dashboard → Connect → Settings → OAuth → Redirect URIs');
    console.log('Stripe Connect OAuth setup:', {
      redirectUri,
      clientId: clientId ? `${clientId.substring(0, 10)}...` : 'MISSING',
      userId: user.id,
      baseUrl,
      envAppUrl: process.env.NEXT_PUBLIC_APP_URL
    });

    // Create OAuth authorization URL
    const authUrl = new URL('https://connect.stripe.com/oauth/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('scope', 'read_write');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', user.id); // Pass user ID as state

    const authUrlString = authUrl.toString();
    
    // Extract and verify the redirect_uri from the generated URL
    const generatedUrl = new URL(authUrlString);
    const redirectUriFromUrl = generatedUrl.searchParams.get('redirect_uri');
    
    // Log the full OAuth URL to verify redirect_uri parameter
    console.log('Generated OAuth URL (first 200 chars):', authUrlString.substring(0, 200));
    console.log('🔍 Redirect URI verification:', {
      original: redirectUri,
      inUrl: redirectUriFromUrl,
      match: redirectUri === redirectUriFromUrl,
      encoded: encodeURIComponent(redirectUri)
    });
    console.log('🔍 Full OAuth URL redirect_uri param:', redirectUriFromUrl);
    console.log('═══════════════════════════════════════════════════════');

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
    try {
      const account = await stripe.accounts.retrieve(profile.stripe_connect_account_id);
      
      // Create login link if account is complete and is an Express account
      // Note: Login links only work for Express accounts, not Standard accounts
      let loginUrl = null;
      if (account.details_submitted && account.charges_enabled) {
        // Only create login link for Express accounts
        // Standard accounts require users to log in directly to Stripe
        if (account.type === 'express') {
          try {
            const loginLink = await stripe.accounts.createLoginLink(profile.stripe_connect_account_id);
            loginUrl = loginLink.url;
          } catch (loginLinkError: any) {
            // If login link creation fails (e.g., account doesn't have Express Dashboard access),
            // log the error but don't fail the entire request
            console.warn('Could not create login link for account:', {
              accountId: profile.stripe_connect_account_id,
              accountType: account.type,
              error: loginLinkError.message
            });
            // loginUrl remains null, which is fine - user can still access their account via Stripe directly
          }
        } else {
          // For Standard accounts, provide a link to Stripe Dashboard
          // Users with Standard accounts need to log in directly to Stripe
          console.log('Account is Standard type, login link not available:', {
            accountId: profile.stripe_connect_account_id,
            accountType: account.type
          });
        }
      }

      return NextResponse.json({
        success: true,
        hasAccount: true,
        accountStatus: {
          id: account.id,
          type: account.type, // 'express' or 'standard'
          detailsSubmitted: account.details_submitted,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          requirements: account.requirements,
          loginUrl // Only available for Express accounts
        }
      });
    } catch (stripeError: any) {
      // Check if the error is due to invalid account (disconnected, doesn't exist, or access revoked)
      const isInvalidAccount = 
        stripeError.code === 'account_invalid' ||
        stripeError.type === 'StripePermissionError' ||
        (stripeError.message && stripeError.message.includes('does not have access to account'));

      if (isInvalidAccount) {
        console.warn('Stripe Connect account is invalid, clearing from profile:', {
          accountId: profile.stripe_connect_account_id,
          error: stripeError.message,
          code: stripeError.code
        });

        // Clear the invalid account ID from the user's profile
        try {
          const supabaseService = createServiceRoleClient();
          const { error: updateError } = await supabaseService
            .from('profiles')
            .update({ stripe_connect_account_id: null })
            .eq('id', user.id);

          if (updateError) {
            console.error('Failed to clear invalid Stripe account ID:', updateError);
          } else {
            console.log('Cleared invalid Stripe account ID from profile');
          }
        } catch (clearError) {
          console.error('Error clearing invalid Stripe account ID:', clearError);
        }

        // Return response indicating account needs to be reconnected
        return NextResponse.json({
          success: true,
          hasAccount: false,
          accountStatus: null,
          message: 'Your Stripe Connect account was disconnected or is no longer accessible. Please reconnect your account.'
        });
      }

      // Re-throw if it's a different error
      throw stripeError;
    }

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
