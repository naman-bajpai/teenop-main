import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';

export async function GET(request: NextRequest) {
  try {
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
      
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/my-teen-hustle?stripe_error=${encodeURIComponent(errorMessage)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/my-teen-hustle?stripe_error=missing_parameters`
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
        client_id: process.env.STRIPE_CLIENT_ID!,
        client_secret: process.env.STRIPE_SECRET_KEY!,
        code: code,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Stripe OAuth token exchange failed:', errorData);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/my-teen-hustle?stripe_error=token_exchange_failed`
      );
    }

    const tokenData = await response.json();
    const accountId = tokenData.stripe_user_id;

    // Get account details from Stripe
    const account = await stripe.accounts.retrieve(accountId);

    // Update user profile with Stripe Connect account ID
    const supabase = await createServerClient();
    const { error: updateError } = await (supabase as any)
      .from('profiles')
      .update({ stripe_connect_account_id: accountId })
      .eq('id', state);

    if (updateError) {
      console.error('Error updating profile with Stripe account ID:', updateError);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/my-teen-hustle?stripe_error=profile_update_failed`
      );
    }

    // Redirect back to the app with success
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/my-teen-hustle?stripe_success=true`
    );

  } catch (error) {
    console.error('Stripe Connect callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/my-teen-hustle?stripe_error=callback_failed`
    );
  }
}
