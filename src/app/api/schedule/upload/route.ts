import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';

const BUCKET = 'schedules';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get user's profile to check if they're a teen
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, schedule_url')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    if ((profile as any).role !== 'teen') {
      return NextResponse.json(
        { error: "Only teen accounts can upload schedules" },
        { status: 403 }
      );
    }

    // Get form data
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type (PDF, images, etc.)
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload PDF, Word document, or image files only." },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${randomUUID()}.${fileExt}`;

    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from(BUCKET)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: `Failed to upload file: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(fileName);

    // Update profile with schedule URL
    const { error: updateError } = await (supabase as any)
      .from('profiles')
      .update({ schedule_url: publicUrl })
      .eq('id', user.id);

    if (updateError) {
      console.error('Update error:', updateError);
      // Try to delete the uploaded file if update fails
      await supabase.storage.from(BUCKET).remove([fileName]);
      return NextResponse.json(
        { error: `Failed to update profile: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      message: "Schedule uploaded successfully"
    });

  } catch (error: any) {
    console.error('Schedule upload error:', error);
    return NextResponse.json(
      { error: `Failed to upload schedule: ${error.message}` },
      { status: 500 }
    );
  }
}

