// app/api/services/[id]/images/init/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createClient } from '@/lib/supabase/client';

const BUCKET = 'service-images';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { fileExt, contentType, isPrimary } = await req.json();
    const { id: serviceId } = await params;

    if (!fileExt || !contentType) {
      return NextResponse.json({ error: 'Missing fileExt or contentType' }, { status: 400 });
    }

    // Get requester
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify ownership
    const { data: svc, error: svcErr } = await supabase
      .from('services')
      .select('id,user_id')
      .eq('id', serviceId)
      .single();

    if (svcErr || !svc) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }
    
    // Type assertion to help TypeScript understand the structure
    const service = svc as { id: string; user_id: string };
    if (service.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build object path
    const objectName = `${serviceId}/${randomUUID()}.${fileExt.replace('.', '')}`;

    // Create a **signed upload URL**
    const { data: signed, error: signedErr } = await supabase
      .storage.from(BUCKET)
      .createSignedUploadUrl(objectName);

    if (signedErr || !signed) {
      return NextResponse.json({ error: signedErr?.message || 'Failed to init upload' }, { status: 500 });
    }

    // Stash isPrimary in a short-lived token if you want; or return it and send back on finalize
    return NextResponse.json({
      path: objectName,
      uploadUrl: signed.signedUrl,
      isPrimary: !!isPrimary
    });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
