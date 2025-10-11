import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { email, password, firstName, lastName, age, role, parentEmail, parentPhone } = await request.json();
    
    console.log('Signup attempt for:', { email, firstName, lastName, age, role });

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !age) {
      console.log('Missing required fields');
      return NextResponse.json(
        { error: "All required fields must be provided" },
        { status: 400 }
      );
    }

    // Validate age for teen accounts
    if (age < 13 || age > 19) {
      return NextResponse.json(
        { error: 'Age must be between 13 and 19' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Check if Supabase environment variables are configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    
    console.log('Supabase URL configured:', !!supabaseUrl);
    console.log('Supabase Key configured:', !!supabaseKey);
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase environment variables not configured');
      return NextResponse.json(
        { error: 'Server configuration error - Supabase credentials missing' },
        { status: 500 }
      );
    }

    const supabase = createClient();
    console.log('Supabase client created successfully');

    // Check if user already exists in our database first
    console.log('Checking if user already exists...');
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('email', email)
      .single();

    if (existingUser) {
      console.log('User already exists in database:', existingUser);
      return NextResponse.json(
        { error: 'User with this email is already registered. Please try logging in instead.' },
        { status: 400 }
      );
    }

    // Create user account in Supabase Auth
    console.log('Attempting to create Supabase auth account...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          role: role || 'teen',
          age: age,
          parent_email: parentEmail,
          parent_phone: parentPhone,
        }
      }
    });

    if (authError) {
      console.error('Auth signup error:', authError);
      // Provide more specific error messages
      if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
        return NextResponse.json(
          { error: 'This email is already registered. Please try logging in instead, or use a different email address.' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: authError.message || 'Failed to create account' },
        { status: 400 }
      );
    }

    console.log('Auth account created:', { userId: authData.user?.id, email: authData.user?.email });

    if (!authData.user) {
      console.error('No user data returned from Supabase');
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 400 }
      );
    }

    // The profile will be automatically created by the database trigger
    console.log('Profile will be created automatically by database trigger');

    return NextResponse.json(
      { 
        message: "Account created successfully. Please check your email for verification.",
        user: {
          id: authData.user.id,
          email: authData.user.email,
          first_name: firstName,
          last_name: lastName,
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Signup error:', error);
    console.error('Error details:', {
      message: (error as Error).message,
      stack: (error as Error).stack,
    });
    return NextResponse.json(
      { error: "Error creating account: " + (error as Error).message },
      { status: 500 }
    );
  }
}
