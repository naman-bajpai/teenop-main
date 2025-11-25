import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';
import { getStripeConnectRedirectUri, getStripeConnectBaseUrl } from '@/lib/stripe-connect';

export async function GET(request: NextRequest) {
  try {
    const baseUrl = getStripeConnectBaseUrl();
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // This is the user ID
    const error = searchParams.get('error');

    console.log('═══════════════════════════════════════════════════════');
    console.log('🔔 Stripe Connect callback received:', {
      hasCode: !!code,
      hasState: !!state,
      hasError: !!error,
      baseUrl,
      fullUrl: request.url,
      code: code ? code.substring(0, 20) + '...' : null,
      state: state,
      timestamp: new Date().toISOString()
    });
    console.log('═══════════════════════════════════════════════════════');

    // Handle OAuth errors
    if (error) {
      console.error('Stripe Connect OAuth error:', error);
      let errorMessage = error;
      
      // Provide more helpful error messages
      if (error === 'access_denied') {
        errorMessage = 'Authorization was denied. Please try again.';
      } else if (error.includes('redirect_uri')) {
        errorMessage = 'Redirect URI mismatch. Please add the callback URL to Stripe Dashboard → Connect → Settings → OAuth settings.';
      }
      
      // Redirect to earnings page (where users typically initiate the connection)
      return NextResponse.redirect(
        `${baseUrl}/earnings?stripe_error=${encodeURIComponent(errorMessage)}`
      );
    }

    if (!code || !state) {
      console.error('Stripe Connect callback: Missing parameters', { code: !!code, state: !!state });
      return NextResponse.redirect(
        `${baseUrl}/earnings?stripe_error=missing_parameters`
      );
    }

    // Validate environment variables
    if (!process.env.STRIPE_CLIENT_ID) {
      console.error('STRIPE_CLIENT_ID is not set');
      return NextResponse.redirect(
        `${baseUrl}/earnings?stripe_error=configuration_error`
      );
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY is not set');
      return NextResponse.redirect(
        `${baseUrl}/earnings?stripe_error=configuration_error`
      );
    }

    // Use shared function to ensure EXACT match with setup route
    const redirectUri = getStripeConnectRedirectUri();
    
    // Also check what Stripe sent us in the callback URL
    const callbackUrl = new URL(request.url);
    const receivedRedirectUri = `${callbackUrl.protocol}//${callbackUrl.host}${callbackUrl.pathname}`;
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔗 Stripe Connect CALLBACK - Redirect URI:', redirectUri);
    console.log('🔗 Received callback URL:', receivedRedirectUri);
    console.log('🔍 Comparison:', {
      calculated: redirectUri,
      received: receivedRedirectUri,
      match: redirectUri === receivedRedirectUri
    });
    console.log('Exchanging authorization code for token:', {
      redirectUri,
      hasCode: !!code,
      hasClientId: !!process.env.STRIPE_CLIENT_ID,
      envAppUrl: process.env.NEXT_PUBLIC_APP_URL,
      codePrefix: code ? code.substring(0, 20) : null
    });
    console.log('═══════════════════════════════════════════════════════');

    // Exchange authorization code for access token
    // IMPORTANT: Stripe requires the redirect_uri to match the one used in authorization
    const tokenExchangeParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.STRIPE_CLIENT_ID,
      client_secret: process.env.STRIPE_SECRET_KEY,
      code: code,
      redirect_uri: redirectUri, // Required by Stripe - must match authorization request
    });
    
    console.log('📤 Token exchange request params:', {
      grant_type: 'authorization_code',
      hasClientId: !!process.env.STRIPE_CLIENT_ID,
      hasClientSecret: !!process.env.STRIPE_SECRET_KEY,
      hasCode: !!code,
      redirect_uri: redirectUri,
      redirect_uri_encoded: encodeURIComponent(redirectUri)
    });
    
    const response = await fetch('https://connect.stripe.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenExchangeParams,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌❌❌ Stripe OAuth token exchange failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        redirectUriUsed: redirectUri,
        envAppUrl: process.env.NEXT_PUBLIC_APP_URL
      });
      console.error('🔍 TROUBLESHOOTING:');
      console.error('1. Check that redirect_uri in token exchange matches authorization request');
      console.error('2. Check that redirect_uri is in Stripe Dashboard → Connect → Settings → OAuth → Redirect URIs');
      console.error('3. Verify NEXT_PUBLIC_APP_URL in Vercel matches your actual domain');
      console.error('4. The redirect_uri must match EXACTLY (including protocol, domain, path, no trailing slash)');
      
      let errorMessage = 'token_exchange_failed';
      if (errorData.error) {
        if (errorData.error === 'invalid_grant') {
          errorMessage = 'Authorization code expired or invalid. Please try again.';
        } else if (errorData.error === 'invalid_client') {
          errorMessage = 'Invalid Stripe credentials. Please check your configuration.';
        } else {
          errorMessage = errorData.error_description || errorData.error;
        }
      }
      
      // Redirect to earnings page (where users typically initiate the connection)
      return NextResponse.redirect(
        `${baseUrl}/earnings?stripe_error=${encodeURIComponent(errorMessage)}`
      );
    }

    const tokenData = await response.json().catch(() => null);
    
    if (!tokenData || !tokenData.stripe_user_id) {
      console.error('Invalid token response from Stripe:', tokenData);
      return NextResponse.redirect(
        `${baseUrl}/earnings?stripe_error=invalid_token_response`
      );
    }

    const accountId = tokenData.stripe_user_id;
    console.log('Stripe Connect account created:', {
      accountId,
      userId: state,
      accessToken: tokenData.access_token ? 'present' : 'missing'
    });

    // Get account details from Stripe
    let account;
    try {
      account = await stripe.accounts.retrieve(accountId);
      console.log('Stripe account retrieved:', {
        accountId,
        detailsSubmitted: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled
      });
    } catch (stripeError: any) {
      console.error('Error retrieving Stripe account:', stripeError);
      return NextResponse.redirect(
        `${baseUrl}/earnings?stripe_error=account_retrieval_failed`
      );
    }

    // Update user profile with Stripe Connect account ID
    // Use service role client to bypass RLS since this is a server-side OAuth callback
    // The user ID is from the state parameter which we control, so it's safe
    let supabaseService;
    try {
      supabaseService = createServiceRoleClient();
      console.log('Service role client created successfully');
    } catch (serviceError: any) {
      console.error('Failed to create service role client:', serviceError);
      return NextResponse.redirect(
        `${baseUrl}/earnings?stripe_error=service_client_failed&error=${encodeURIComponent(serviceError.message || 'Failed to create service client')}`
      );
    }
    
    console.log('Updating profile with Stripe account ID:', { userId: state, accountId });
    
    // First, check if profile exists
    const { data: existingProfile, error: checkError } = await supabaseService
      .from('profiles')
      .select('id, stripe_connect_account_id')
      .eq('id', state)
      .single();
    
    if (checkError) {
      const errorDetails = checkError as any;
      console.error('Error checking profile before update:', {
        error: checkError,
        errorCode: errorDetails.code,
        errorMessage: errorDetails.message,
        errorDetails: errorDetails.details,
        errorHint: errorDetails.hint,
        userId: state
      });
      return NextResponse.redirect(
        `${baseUrl}/earnings?stripe_error=profile_check_failed&account_id=${accountId}&error=${encodeURIComponent(errorDetails.message || 'Unknown error')}`
      );
    }
    
    if (!existingProfile) {
      console.error('Profile not found:', { userId: state });
      return NextResponse.redirect(
        `${baseUrl}/earnings?stripe_error=profile_not_found&account_id=${accountId}`
      );
    }
    
    console.log('Profile found before update:', {
      userId: state,
      existingAccountId: existingProfile.stripe_connect_account_id,
      newAccountId: accountId
    });
    
    // Update the profile using service role (bypasses RLS)
    console.log('Attempting to update profile...');
    const updateResult = await supabaseService
      .from('profiles')
      .update({ stripe_connect_account_id: accountId })
      .eq('id', state)
      .select('stripe_connect_account_id')
      .single();
    
    const { data: updatedProfile, error: updateError } = updateResult;
    
    console.log('Update result:', {
      hasData: !!updatedProfile,
      hasError: !!updateError,
      updatedAccountId: updatedProfile?.stripe_connect_account_id,
      error: updateError,
      rawResult: JSON.stringify(updateResult, null, 2)
    });

    // Check for update errors
    if (updateError) {
      const errorDetails = updateError as any;
      console.error('Error updating profile with Stripe account ID:', {
        error: updateError,
        errorCode: errorDetails.code,
        errorMessage: errorDetails.message,
        errorDetails: errorDetails.details,
        errorHint: errorDetails.hint,
        userId: state,
        accountId,
        fullError: JSON.stringify(updateError, null, 2)
      });
      // Account was created in Stripe but failed to save to database
      // This is a critical error - the account exists but isn't linked
      return NextResponse.redirect(
        `${baseUrl}/earnings?stripe_error=profile_update_failed&account_id=${accountId}&error=${encodeURIComponent(errorDetails.message || 'Unknown error')}`
      );
    }
    
    if (!updatedProfile) {
      console.error('Update returned no data:', { userId: state, accountId });
      // Try to fetch the profile again to see what's actually in the database
      const { data: verifyProfile, error: verifyError } = await supabaseService
        .from('profiles')
        .select('stripe_connect_account_id')
        .eq('id', state)
        .single();
      
      console.error('Profile verification fetch after null update:', {
        verifyProfile,
        verifyError: verifyError as any,
        expected: accountId
      });
      
      return NextResponse.redirect(
        `${baseUrl}/earnings?stripe_error=profile_update_no_data&account_id=${accountId}`
      );
    }
    
    if (updatedProfile.stripe_connect_account_id !== accountId) {
      console.error('Profile update verification failed - ID mismatch:', { 
        updatedProfile, 
        accountId,
        expectedAccountId: accountId,
        actualAccountId: updatedProfile.stripe_connect_account_id
      });
      
      // Try to fetch the profile again to see what's actually in the database
      const { data: verifyProfile, error: verifyError } = await supabaseService
        .from('profiles')
        .select('stripe_connect_account_id')
        .eq('id', state)
        .single();
      
      console.error('Profile verification fetch after mismatch:', {
        verifyProfile,
        verifyError: verifyError as any,
        expected: accountId,
        actual: verifyProfile?.stripe_connect_account_id
      });
      
      return NextResponse.redirect(
        `${baseUrl}/earnings?stripe_error=profile_verification_failed&account_id=${accountId}&actual=${verifyProfile?.stripe_connect_account_id || 'null'}`
      );
    }

    console.log('✅✅✅ SUCCESS - Stripe Connect account linked:', {
      userId: state,
      accountId: accountId,
      verified: updatedProfile.stripe_connect_account_id === accountId,
      profileData: updatedProfile,
      timestamp: new Date().toISOString()
    });
    console.log('═══════════════════════════════════════════════════════');

    // Redirect back to earnings page with success
    return NextResponse.redirect(
      `${baseUrl}/earnings?stripe_success=true`
    );

  } catch (error) {
    console.error('Stripe Connect callback error:', error);
    const baseUrl = getStripeConnectBaseUrl();
    return NextResponse.redirect(
      `${baseUrl}/earnings?stripe_error=callback_failed`
    );
  }
}
