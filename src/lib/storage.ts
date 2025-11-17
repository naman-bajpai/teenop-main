import { createClient } from '@/lib/supabase/client';

export const uploadServiceImage = async (
  file: File,
  serviceId: string,
  userId: string
): Promise<{ url: string; error: string | null }> => {
  try {
    const supabase = createClient();
    
    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${userId}/${serviceId}/${fileName}`;

    // Upload file to storage
    const { error } = await supabase.storage
      .from('service-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      return { url: '', error: error.message };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('service-images')
      .getPublicUrl(filePath);

    return { url: publicUrl, error: null };
  } catch (error) {
    return { 
      url: '', 
      error: error instanceof Error ? error.message : 'Upload failed' 
    };
  }
};

export const deleteServiceImage = async (filePath: string): Promise<{ error: string | null }> => {
  try {
    const supabase = createClient();
    
    const { error } = await supabase.storage
      .from('service-images')
      .remove([filePath]);

    return { error: error?.message || null };
  } catch (error) {
    return { 
      error: error instanceof Error ? error.message : 'Delete failed' 
    };
  }
};

export const getServiceImageUrl = (filePath: string): string => {
  const supabase = createClient();
  const { data: { publicUrl } } = supabase.storage
    .from('service-images')
    .getPublicUrl(filePath);
  
  return publicUrl;
};

export const uploadMessageImage = async (
  file: File,
  bookingId: string,
  userId: string
): Promise<{ url: string; error: string | null }> => {
  try {
    const supabase = createClient();
    
    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    // Use same pattern as service images: userId/folder/filename
    const filePath = `${userId}/messages/${bookingId}/${fileName}`;

    // Upload file to storage (using service-images bucket)
    const { error } = await supabase.storage
      .from('service-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      return { url: '', error: error.message };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('service-images')
      .getPublicUrl(filePath);

    return { url: publicUrl, error: null };
  } catch (error) {
    return { 
      url: '', 
      error: error instanceof Error ? error.message : 'Upload failed' 
    };
  }
};

export const uploadQuoteRequestImage = async (
  file: File,
  quoteRequestId: string,
  userId: string
): Promise<{ url: string; error: string | null }> => {
  try {
    const supabase = createClient();
    
    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    // Use same pattern as service images: userId/folder/filename
    const filePath = `${userId}/quote-requests/${quoteRequestId}/${fileName}`;

    // Upload file to storage (using service-images bucket)
    const { error } = await supabase.storage
      .from('service-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      return { url: '', error: error.message };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('service-images')
      .getPublicUrl(filePath);

    return { url: publicUrl, error: null };
  } catch (error) {
    return { 
      url: '', 
      error: error instanceof Error ? error.message : 'Upload failed' 
    };
  }
};
