import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    
    console.log('Password reset request for:', { email });

    // Validate required fields
    if (!email) {
      console.log('Missing email field');
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Check if Supabase environment variables are configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase environment variables not configured');
      return NextResponse.json(
        { error: 'Server configuration error - Supabase credentials missing' },
        { status: 500 }
      );
    }

    const supabase = createClient();
    console.log('Supabase client created successfully');

    // Request password reset
    console.log('Attempting to send password reset email...');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reset-password`,
    });

    if (resetError) {
      console.error('Password reset error:', resetError);
      return NextResponse.json(
        { error: resetError.message || 'Failed to send password reset email' },
        { status: 400 }
      );
    }

    console.log('Password reset email sent successfully');

    return NextResponse.json(
      { 
        message: "Password reset email sent"
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Password reset error:', error);
    console.error('Error details:', {
      message: (error as Error).message,
      stack: (error as Error).stack,
    });
    return NextResponse.json(
      { error: "Error sending password reset: " + (error as Error).message },
      { status: 500 }
    );
  }
}
