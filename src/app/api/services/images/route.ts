import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';

const BUCKET = 'service-images';

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

    // Get form data
    const formData = await req.formData();
    const serviceId = formData.get('service_id') as string;
    const files = formData.getAll('images') as File[];

    if (!serviceId) {
      return NextResponse.json(
        { error: "Service ID is required" },
        { status: 400 }
      );
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No images provided" },
        { status: 400 }
      );
    }

    // Verify the service belongs to the user
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, user_id')
      .eq('id', serviceId)
      .eq('user_id', user.id)
      .single();

    if (serviceError || !service) {
      return NextResponse.json(
        { error: "Service not found or access denied" },
        { status: 404 }
      );
    }

    // Validate file types and sizes
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: `Invalid file type: ${file.name}. Only JPEG, PNG, and WebP are allowed.` },
          { status: 400 }
        );
      }
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: `File too large: ${file.name}. Maximum size is 5MB.` },
          { status: 400 }
        );
      }
    }

    // Check whether this service already has a primary image.
    const { data: existingPrimary } = await (supabase as any)
      .from('service_images')
      .select('id')
      .eq('service_id', serviceId)
      .eq('is_primary', true)
      .limit(1);
    const hasExistingPrimary = Array.isArray(existingPrimary) && existingPrimary.length > 0;

    // Upload files and save to database
    const uploadedImages: any[] = [];
    const errors: Array<{ file: string; error: string }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${serviceId}/${randomUUID()}.${fileExt}`;

        // Upload file to storage
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from(BUCKET)
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          errors.push({ file: file.name, error: uploadError.message });
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(fileName);

        // Save to service_images table.
        // Only set a new primary when the service currently has none.
        const isPrimary = !hasExistingPrimary && i === 0;
        const { data: imageRecord, error: dbError } = await (supabase as any)
          .from('service_images')
          .insert({
            service_id: serviceId,
            url: publicUrl,
            is_primary: isPrimary
          } as any)
          .select()
          .single();

        if (dbError) {
          // Try to delete the uploaded file if database insert fails
          await supabase.storage.from(BUCKET).remove([fileName]);
          errors.push({ file: file.name, error: dbError.message });
          continue;
        }

        uploadedImages.push(imageRecord);
      } catch (error: any) {
        errors.push({ file: file.name, error: error.message });
      }
    }

    if (uploadedImages.length === 0) {
      return NextResponse.json(
        { error: "Failed to upload any images", errors },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      images: uploadedImages,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully uploaded ${uploadedImages.length} image(s)`
    });

  } catch (error: any) {
    console.error('Service images upload error:', error);
    return NextResponse.json(
      { error: `Failed to upload images: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
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

    const { imageId, serviceId } = await req.json();

    if (!imageId || !serviceId) {
      return NextResponse.json(
        { error: "Image ID and Service ID are required" },
        { status: 400 }
      );
    }

    // Verify the service belongs to the user
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, user_id')
      .eq('id', serviceId)
      .eq('user_id', user.id)
      .single();

    if (serviceError || !service) {
      return NextResponse.json(
        { error: "Service not found or access denied" },
        { status: 404 }
      );
    }

    // Get image record
    const { data: image, error: imageError } = await (supabase as any)
      .from('service_images')
      .select('id, url, service_id')
      .eq('id', imageId)
      .eq('service_id', serviceId)
      .single();

    if (imageError || !image) {
      return NextResponse.json(
        { error: "Image not found" },
        { status: 404 }
      );
    }

    // Extract file path from URL
    const imageData = image as any;
    const urlParts = imageData.url.split('/');
    const fileName = urlParts.slice(urlParts.indexOf(BUCKET) + 1).join('/');

    // Delete from storage
    const { error: storageError } = await supabase
      .storage
      .from(BUCKET)
      .remove([fileName]);

    // Delete from database
    const { error: dbError } = await supabase
      .from('service_images')
      .delete()
      .eq('id', imageId);

    if (dbError) {
      return NextResponse.json(
        { error: `Failed to delete image: ${dbError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Image deleted successfully"
    });

  } catch (error: any) {
    console.error('Service image delete error:', error);
    return NextResponse.json(
      { error: `Failed to delete image: ${error.message}` },
      { status: 500 }
    );
  }
}

