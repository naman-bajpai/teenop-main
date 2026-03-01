import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { emailService } from '@/lib/email';
import { smsService } from '@/lib/sms';

// GET: Fetch child info by token (for parent confirmation page)
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    if (!token?.trim()) {
      return NextResponse.json({ error: 'Verification token is required' }, { status: 400 });
    }

    let admin;
    try {
      admin = createAdminClient();
    } catch (e) {
      console.error('Parent verify: createAdminClient failed (missing SUPABASE_SERVICE_ROLE_KEY?)', e);
      return NextResponse.json(
        { error: 'Server configuration error. Please try again later.' },
        { status: 500 }
      );
    }

    const { data: row, error: tokenError } = await admin
      .from('parent_verification_tokens')
      .select('profile_id, expires_at')
      .eq('token', token.trim())
      .single();

    if (tokenError) {
      const msg = String(tokenError.message || '');
      if (msg.includes('does not exist') || msg.includes('relation') || tokenError.code === '42P01') {
        console.error('Parent verify: table missing? Run migration parent_verification_tokens.', tokenError);
        return NextResponse.json(
          { error: 'Service temporarily unavailable. Please try again later.' },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: 'Invalid or expired verification link' }, { status: 404 });
    }
    if (!row) {
      return NextResponse.json({ error: 'Invalid or expired verification link' }, { status: 404 });
    }

    const expiresAt = new Date(row.expires_at);
    if (expiresAt < new Date()) {
      return NextResponse.json({ error: 'This verification link has expired' }, { status: 404 });
    }

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id, first_name, last_name, email, age, role, status')
      .eq('id', row.profile_id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if ((profile as { role: string }).role !== 'teen') {
      return NextResponse.json({ error: 'This link is not for a teen account' }, { status: 400 });
    }

    return NextResponse.json({
      child: {
        first_name: (profile as { first_name: string }).first_name,
        last_name: (profile as { last_name: string }).last_name,
        email: (profile as { email: string }).email,
        age: (profile as { age: number | null }).age ?? null,
      },
    });
  } catch (error) {
    console.error('Parent verify GET error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

// POST: Confirm and optionally update child info, activate account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, first_name, last_name, age } = body as {
      token?: string;
      first_name?: string;
      last_name?: string;
      age?: number;
    };

    if (!token?.trim()) {
      return NextResponse.json({ error: 'Verification token is required' }, { status: 400 });
    }

    let admin;
    try {
      admin = createAdminClient();
    } catch (e) {
      console.error('Parent verify POST: createAdminClient failed', e);
      return NextResponse.json(
        { error: 'Server configuration error. Please try again later.' },
        { status: 500 }
      );
    }

    const { data: row, error: tokenError } = await admin
      .from('parent_verification_tokens')
      .select('profile_id, expires_at')
      .eq('token', token.trim())
      .single();

    if (tokenError || !row) {
      return NextResponse.json({ error: 'Invalid or expired verification link' }, { status: 404 });
    }

    const expiresAt = new Date(row.expires_at);
    if (expiresAt < new Date()) {
      return NextResponse.json({ error: 'This verification link has expired' }, { status: 404 });
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('email, first_name, phone')
      .eq('id', row.profile_id)
      .single();

    const updates: { status: 'active'; first_name?: string; last_name?: string; age?: number } = {
      status: 'active',
    };
    if (typeof first_name === 'string' && first_name.trim().length > 0) {
      updates.first_name = first_name.trim();
    }
    if (typeof last_name === 'string' && last_name.trim().length > 0) {
      updates.last_name = last_name.trim();
    }
    if (typeof age === 'number' && age >= 13 && age <= 19) {
      updates.age = age;
    }

    const { error: updateError } = await admin
      .from('profiles')
      .update(updates)
      .eq('id', row.profile_id);

    if (updateError) {
      console.error('Profile update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to activate account. Please try again.' },
        { status: 500 }
      );
    }

    const { error: deleteError } = await admin
      .from('parent_verification_tokens')
      .delete()
      .eq('token', token.trim());

    if (deleteError) {
      console.error('Token delete error (non-fatal):', deleteError);
    }

    try {
      let origin = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || '';
      if (origin) origin = new URL(origin).origin;
      const loginLink = origin ? `${origin}/login` : '/login';

      if (profile?.email && profile?.first_name) {
        await emailService.sendTeenApprovalEmail({
          teenEmail: profile.email,
          teenFirstName: profile.first_name,
          loginLink,
        });
      }
      if (profile?.phone) {
        await smsService.sendTeenApprovalSMS({
          teenPhone: profile.phone,
        });
      }
    } catch (notificationError) {
      console.error('Teen approval notifications failed:', notificationError);
    }

    return NextResponse.json({
      message: "Your child's account has been verified and is now active. They can log in to TeenOp.",
    });
  } catch (error) {
    console.error('Parent verify POST error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
