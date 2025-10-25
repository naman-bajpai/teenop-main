-- Add platform fee tracking to bookings table
-- This migration adds columns to track platform fees and service provider earnings separately

-- Add platform fee columns to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10,2) DEFAULT 3.00,
ADD COLUMN IF NOT EXISTS service_price DECIMAL(10,2);

-- Update existing bookings to have platform fee and service price
UPDATE bookings 
SET 
  platform_fee = 3.00,
  service_price = total_price - 3.00
WHERE platform_fee IS NULL OR service_price IS NULL;

-- Make the columns NOT NULL after updating existing data
ALTER TABLE bookings 
ALTER COLUMN platform_fee SET NOT NULL,
ALTER COLUMN service_price SET NOT NULL;

-- Add a check constraint to ensure platform fee is always $3.00
ALTER TABLE bookings 
ADD CONSTRAINT check_platform_fee CHECK (platform_fee = 3.00);

-- Update the earnings trigger to use service_price instead of total_price - 3.00
CREATE OR REPLACE FUNCTION create_earnings_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create earnings if the booking status changed to 'paid'
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    -- Get the service provider's user_id from the service
    INSERT INTO earnings (
      user_id,
      booking_id,
      amount,
      status,
      earned_at
    )
    SELECT 
      s.user_id,
      NEW.id,
      NEW.service_price, -- Use service_price instead of total_price - 3.00
      'completed',
      NEW.payment_completed_at
    FROM services s
    WHERE s.id = NEW.service_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a function to calculate platform revenue
CREATE OR REPLACE FUNCTION get_platform_revenue()
RETURNS DECIMAL(10,2) AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(platform_fee) 
     FROM bookings 
     WHERE status = 'paid'), 
    0.00
  );
END;
$$ LANGUAGE plpgsql;

-- Create a view for platform analytics
CREATE OR REPLACE VIEW platform_analytics AS
SELECT 
  COUNT(*) as total_paid_bookings,
  SUM(platform_fee) as total_platform_revenue,
  SUM(service_price) as total_service_provider_earnings,
  SUM(total_price) as total_gross_revenue,
  AVG(platform_fee) as avg_platform_fee,
  AVG(service_price) as avg_service_price,
  AVG(total_price) as avg_booking_value
FROM bookings 
WHERE status = 'paid';

-- Add comments for documentation
COMMENT ON COLUMN bookings.platform_fee IS 'Platform fee charged to customer (always $3.00)';
COMMENT ON COLUMN bookings.service_price IS 'Amount paid to service provider (total_price - platform_fee)';
COMMENT ON FUNCTION get_platform_revenue() IS 'Returns total platform revenue from all paid bookings';
COMMENT ON VIEW platform_analytics IS 'Analytics view for platform revenue and service provider earnings';
