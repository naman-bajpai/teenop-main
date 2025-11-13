import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';

// Helper function to normalize and get base URL
function getBaseUrl(): string {
  let baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').trim();
  
  // Normalize the URL - handle various formats
  // Remove any duplicate https:// prefixes
  baseUrl = baseUrl.replace(/^https?:\/\/https?:\/\//, 'https://');
  // Remove trailing slashes
  baseUrl = baseUrl.replace(/\/+$/, '');
  // Ensure it starts with a protocol
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = `https://${baseUrl}`;
  }
  
  return baseUrl;
}

export async function GET(request: NextRequest) {
  try {
    const baseUrl = getBaseUrl();
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // This is the user ID
    const error = searchParams.get('error');

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

    // Exchange authorization code for access token
    const response = await fetch('https://connect.stripe.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.STRIPE_CLIENT_ID,
        client_secret: process.env.STRIPE_SECRET_KEY,
        code: code,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Stripe OAuth token exchange failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
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
    console.log('Stripe Connect account created:', accountId);

    // Get account details from Stripe
    let account;
    try {
      account = await stripe.accounts.retrieve(accountId);
    } catch (stripeError: any) {
      console.error('Error retrieving Stripe account:', stripeError);
      return NextResponse.redirect(
        `${baseUrl}/earnings?stripe_error=account_retrieval_failed`
      );
    }

    // Update user profile with Stripe Connect account ID
    const supabase = await createServerClient();
    const { data: updatedProfile, error: updateError } = await (supabase as any)
      .from('profiles')
      .update({ stripe_connect_account_id: accountId })
      .eq('id', state)
      .select('stripe_connect_account_id')
      .single();

    if (updateError) {
      console.error('Error updating profile with Stripe account ID:', updateError);
      // Account was created in Stripe but failed to save to database
      // This is a critical error - the account exists but isn't linked
      return NextResponse.redirect(
        `${baseUrl}/earnings?stripe_error=profile_update_failed&account_id=${accountId}`
      );
    }

    // Verify the update was successful
    if (!updatedProfile || updatedProfile.stripe_connect_account_id !== accountId) {
      console.error('Profile update verification failed:', { updatedProfile, accountId });
      return NextResponse.redirect(
        `${baseUrl}/earnings?stripe_error=profile_verification_failed`
      );
    }

    console.log('Successfully linked Stripe Connect account to user:', {
      userId: state,
      accountId: accountId,
      verified: updatedProfile.stripe_connect_account_id === accountId
    });

    // Redirect back to earnings page with success
    return NextResponse.redirect(
      `${baseUrl}/earnings?stripe_success=true`
    );

  } catch (error) {
    console.error('Stripe Connect callback error:', error);
    const baseUrl = getBaseUrl();
    return NextResponse.redirect(
      `${baseUrl}/earnings?stripe_error=callback_failed`
    );
  }
}
