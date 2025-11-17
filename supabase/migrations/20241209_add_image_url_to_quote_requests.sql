-- Add image_url column to quote_requests table
ALTER TABLE public.quote_requests
ADD COLUMN IF NOT EXISTS image_url TEXT NULL;

COMMENT ON COLUMN public.quote_requests.image_url IS 'URL of image uploaded by customer with quote request';

