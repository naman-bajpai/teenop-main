-- Add image_url column to quote_requests table
ALTER TABLE quote_requests 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add comment to document the column
COMMENT ON COLUMN quote_requests.image_url IS 'URL of image attached to the quote request';

