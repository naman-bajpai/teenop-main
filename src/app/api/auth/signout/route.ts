import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    console.log('Signout attempt');

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

    // Sign out user
    console.log('Attempting to sign out user...');
    const { error: authError } = await supabase.auth.signOut();

    if (authError) {
      console.error('Auth signout error:', authError);
      return NextResponse.json(
        { error: authError.message || 'Failed to sign out' },
        { status: 400 }
      );
    }

    console.log('User signed out successfully');

    return NextResponse.json(
      { 
        message: "Signed out successfully"
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Signout error:', error);
    console.error('Error details:', {
      message: (error as Error).message,
      stack: (error as Error).stack,
    });
    return NextResponse.json(
      { error: "Error signing out: " + (error as Error).message },
      { status: 500 }
    );
  }
}
