import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase';
import { emailService } from '@/lib/email';
import { smsService } from '@/lib/sms';
import { randomBytes } from 'crypto';

export async function POST(request: Request) {
  try {
    const { email, password, firstName, lastName, age, role, phone, parentEmail, parentPhone, parentPermission } = await request.json();
    
    console.log('Signup attempt for:', { email, firstName, lastName, age, role });

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      console.log('Missing required fields');
      return NextResponse.json(
        { error: "All required fields must be provided" },
        { status: 400 }
      );
    }

    // Validate age and parent contact for teen accounts
    if (role === 'teen') {
      if (!age) {
        return NextResponse.json(
          { error: 'Age is required for teen accounts' },
          { status: 400 }
        );
      }
      if (age < 13 || age > 19) {
        return NextResponse.json(
          { error: 'Age must be between 13 and 19' },
          { status: 400 }
        );
      }
      const hasParentEmail = parentEmail && String(parentEmail).trim().length > 0;
      const hasParentPhone = parentPhone && String(parentPhone).trim().length > 0;
      if (!hasParentEmail || !hasParentPhone) {
        return NextResponse.json(
          { error: 'Parent/guardian email and phone are required so we can request approval.' },
          { status: 400 }
        );
      }
      if (!parentPermission) {
        return NextResponse.json(
          { error: 'You must confirm that you have your parent or guardian permission to sign up.' },
          { status: 400 }
        );
      }
      if (hasParentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(parentEmail).trim())) {
        return NextResponse.json(
          { error: 'Please enter a valid parent/guardian email address.' },
          { status: 400 }
        );
      }
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
            phone: phone,
            parent_email: parentEmail,
            parent_phone: parentPhone,
          }
      }
    });

    if (authError) {
      console.error('Auth signup error:', authError);
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

    // Wait a moment for the trigger to run, then check if profile exists
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if profile was created by trigger
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', authData.user.id)
      .maybeSingle();

    const nextStatus = role === 'teen' ? 'pending_verification' : 'active';
    if (!existingProfile) {
      console.log('Profile not found, creating manually...');
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: authData.user.email || email,
          first_name: firstName,
          last_name: lastName,
          age: age || null,
          phone: phone || null,
          role: (role || 'teen') as any,
          parent_email: parentEmail || null,
          parent_phone: parentPhone || null,
          status: nextStatus as any,
        });

      if (profileError) {
        console.error('Error creating profile manually:', profileError);
      } else {
        console.log('Profile created manually');
      }
    } else {
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          age: age || null,
          phone: phone || null,
          role: (role || 'teen') as any,
          parent_email: parentEmail || null,
          parent_phone: parentPhone || null,
          status: nextStatus as any,
        })
        .eq('id', authData.user.id);
      if (profileUpdateError) {
        console.error('Error updating trigger-created profile:', profileUpdateError);
      } else {
        console.log('Profile updated after trigger creation');
      }
    }

    // For teen accounts: create parent verification token and send email to parent
    if (role === 'teen' && (parentEmail?.trim() || parentPhone?.trim())) {
      const sendToEmail = parentEmail?.trim();
      const sendToPhone = parentPhone?.trim();
      if (sendToEmail) {
        try {
          const admin = createAdminClient();
          const token = randomBytes(32).toString('hex');
          const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
          const { error: tokenError } = await admin
            .from('parent_verification_tokens')
            .insert({
              profile_id: authData.user.id,
              token,
              expires_at: expiresAt,
            });
          if (tokenError) {
            console.error('Failed to create parent verification token:', tokenError);
          } else {
            // Use origin only so the link is always https://yourdomain.com/parent/verify?token=...
            let origin = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || '';
            try {
              if (origin) {
                origin = new URL(origin).origin;
              } else if (request.url) {
                origin = new URL(request.url).origin;
              }
            } catch {
              origin = origin.replace(/\/.*$/, '').replace(/\/+$/, '');
            }
            const verifyLink = origin ? `${origin}/parent/verify?token=${token}` : `/parent/verify?token=${token}`;
            await emailService.sendParentVerificationEmail({
              parentEmail: sendToEmail,
              childFirstName: firstName,
              childLastName: lastName,
              verifyLink,
            });
            if (sendToPhone) {
              await smsService.sendParentVerificationSMS({
                parentPhone: sendToPhone,
                verifyLink,
              });
            }
          }
        } catch (e) {
          console.error('Failed to send parent verification notifications:', e);
        }
      }
    }

    return NextResponse.json(
      { 
        message: role === 'teen'
          ? "Account created. A verification email has been sent to your parent/guardian. They must confirm before you can log in."
          : "Account created successfully. Please check your email for verification.",
        user: {
          id: authData.user.id,
          email: authData.user.email,
          first_name: firstName,
          last_name: lastName,
        },
        requiresParentVerification: role === 'teen',
        pendingApproval: role === 'teen',
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
