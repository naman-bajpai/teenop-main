"use client";

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';

export interface ServiceImage {
  id?: string;
  url: string;
  is_primary?: boolean;
}

interface MultiImageUploadProps {
  serviceId: string;
  currentImages?: ServiceImage[];
  onImagesChange: (images: ServiceImage[]) => void;
  maxImages?: number;
  className?: string;
}

export default function MultiImageUpload({
  serviceId,
  currentImages = [],
  onImagesChange,
  maxImages = 10,
  className = ""
}: MultiImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<ServiceImage[]>(currentImages);

  React.useEffect(() => {
    setImages(currentImages);
  }, [currentImages]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Check if adding these files would exceed max
    if (images.length + files.length > maxImages) {
      setError(`Maximum ${maxImages} images allowed. You can add ${maxImages - images.length} more.`);
      return;
    }

    // Validate file types
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const invalidFiles = files.filter(file => !allowedTypes.includes(file.type));
    if (invalidFiles.length > 0) {
      setError(`Invalid file type(s). Only JPEG, PNG, and WebP are allowed.`);
      return;
    }

    // Validate file sizes (5MB limit)
    const maxSize = 5 * 1024 * 1024;
    const oversizedFiles = files.filter(file => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      setError(`Some files exceed 5MB limit: ${oversizedFiles.map(f => f.name).join(', ')}`);
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // If serviceId is "new" or empty, we'll store images temporarily
      // They'll be uploaded after service creation
      if (!serviceId || serviceId === "new") {
        // Create preview URLs for temporary display
        const previewImages: ServiceImage[] = files.map(file => ({
          url: URL.createObjectURL(file),
          is_primary: images.length === 0 && file === files[0]
        }));
        
        // Store the actual files for later upload
        const newImages = [...images, ...previewImages];
        setImages(newImages);
        onImagesChange(newImages);
        setIsUploading(false);
        return;
      }

      // Upload to server
      const formData = new FormData();
      formData.append('service_id', serviceId);
      files.forEach(file => {
        formData.append('images', file);
      });

      const response = await fetch('/api/services/images', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload images');
      }

      // Add uploaded images to the list
      const newImages = [...images, ...result.images];
      setImages(newImages);
      onImagesChange(newImages);
      
      if (result.errors && result.errors.length > 0) {
        setError(`Some images failed to upload: ${result.errors.map((e: any) => e.error).join(', ')}`);
      }
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = async (index: number) => {
    const imageToRemove = images[index];
    const newImages = images.filter((_, i) => i !== index);
    
    // If removing primary image, make the first remaining image primary
    if (imageToRemove.is_primary && newImages.length > 0) {
      newImages[0].is_primary = true;
    }
    
    setImages(newImages);
    onImagesChange(newImages);

    // If image has an ID, delete it from server
    if (imageToRemove.id && serviceId && serviceId !== "new") {
      try {
        await fetch('/api/services/images', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageId: imageToRemove.id,
            serviceId: serviceId
          }),
        });
      } catch (err) {
        console.error('Failed to delete image from server:', err);
      }
    } else if (imageToRemove.url.startsWith('blob:')) {
      // Revoke object URL for preview images
      URL.revokeObjectURL(imageToRemove.url);
    }
  };

  const handleSetPrimary = (index: number) => {
    const newImages = images.map((img, i) => ({
      ...img,
      is_primary: i === index
    }));
    setImages(newImages);
    onImagesChange(newImages);
  };

  const handleUploadClick = () => {
    if (images.length >= maxImages) {
      setError(`Maximum ${maxImages} images allowed.`);
      return;
    }
    fileInputRef.current?.click();
  };

  const remainingSlots = maxImages - images.length;

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Service Images {images.length > 0 && `(${images.length}/${maxImages})`}
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Upload up to {maxImages} images. The first image will be set as primary.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div key={index} className="relative group">
              <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                <img
                  src={image.url}
                  alt={`Service image ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {image.is_primary && (
                  <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                    Primary
                  </div>
                )}
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                  onClick={() => handleRemoveImage(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              {!image.is_primary && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full text-xs"
                  onClick={() => handleSetPrimary(index)}
                >
                  Set as Primary
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Area */}
      {images.length < maxImages && (
        <div
          className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
            isUploading
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 cursor-pointer'
          }`}
          onClick={handleUploadClick}
        >
          {isUploading ? (
            <div className="flex flex-col items-center space-y-2">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-sm text-gray-600">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <ImageIcon className="w-8 h-8 text-gray-400" />
              <p className="text-sm text-gray-600">
                Click to upload images
              </p>
              <p className="text-xs text-gray-500">
                PNG, JPG, WebP up to 5MB each ({remainingSlots} slot{remainingSlots !== 1 ? 's' : ''} remaining)
              </p>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}

