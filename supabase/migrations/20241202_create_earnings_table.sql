-- Create earnings table to track individual earnings
-- This table will track earnings for service providers

CREATE TABLE IF NOT EXISTS earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  earned_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_earnings_user_id ON earnings(user_id);
CREATE INDEX IF NOT EXISTS idx_earnings_status ON earnings(status);
CREATE INDEX IF NOT EXISTS idx_earnings_earned_at ON earnings(earned_at);
CREATE INDEX IF NOT EXISTS idx_earnings_booking_id ON earnings(booking_id);

-- Create a function to automatically create earnings when a booking is paid
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
      NEW.total_price - 3.00, -- Subtract $3 platform fee
      'completed',
      NEW.payment_completed_at
    FROM services s
    WHERE s.id = NEW.service_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create earnings when booking is paid
DROP TRIGGER IF EXISTS trigger_create_earnings ON bookings;
CREATE TRIGGER trigger_create_earnings
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION create_earnings_on_payment();

-- Enable RLS on earnings table
ALTER TABLE earnings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for earnings
-- Users can only see their own earnings
CREATE POLICY "Users can view their own earnings" ON earnings
  FOR SELECT USING (auth.uid() = user_id);

-- Only system can insert earnings (via trigger)
CREATE POLICY "System can insert earnings" ON earnings
  FOR INSERT WITH CHECK (true);

-- Only system can update earnings
CREATE POLICY "System can update earnings" ON earnings
  FOR UPDATE USING (true);

-- Create a view for earnings summary by user
CREATE OR REPLACE VIEW user_earnings_summary AS
SELECT 
  user_id,
  COUNT(*) as total_earnings_count,
  SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_earned,
  SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_earnings,
  SUM(CASE WHEN status = 'completed' AND earned_at >= date_trunc('week', NOW()) THEN amount ELSE 0 END) as this_week_earnings,
  SUM(CASE WHEN status = 'completed' AND earned_at >= date_trunc('month', NOW()) THEN amount ELSE 0 END) as this_month_earnings,
  MAX(earned_at) as last_earned_at
FROM earnings
GROUP BY user_id;

-- Grant access to the view
GRANT SELECT ON user_earnings_summary TO authenticated;

-- Create a function to get user earnings stats
CREATE OR REPLACE FUNCTION get_user_earnings_stats(p_user_id UUID)
RETURNS TABLE (
  total_earned DECIMAL(10,2),
  this_week_earned DECIMAL(10,2),
  this_month_earned DECIMAL(10,2),
  pending_earnings DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as total_earned,
    COALESCE(SUM(CASE WHEN status = 'completed' AND earned_at >= date_trunc('week', NOW()) THEN amount ELSE 0 END), 0) as this_week_earned,
    COALESCE(SUM(CASE WHEN status = 'completed' AND earned_at >= date_trunc('month', NOW()) THEN amount ELSE 0 END), 0) as this_month_earned,
    COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_earnings
  FROM earnings
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_user_earnings_stats(UUID) TO authenticated;
