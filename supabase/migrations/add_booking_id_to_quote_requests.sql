-- Add booking_id column to quote_requests table for messaging
ALTER TABLE quote_requests 
ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id);

-- Add comment to document the column
COMMENT ON COLUMN quote_requests.booking_id IS 'Reference to the booking created for messaging purposes';

