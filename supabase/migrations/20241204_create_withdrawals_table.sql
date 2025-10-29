-- Create withdrawals table
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_earnings DECIMAL(10,2) NOT NULL,
  stripe_transfer_id TEXT UNIQUE,
  stripe_connect_account_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed', 'cancelled')),
  failure_reason TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON withdrawals(created_at);

-- Add withdrawal_id and withdrawn_at columns to earnings table
ALTER TABLE earnings 
ADD COLUMN IF NOT EXISTS withdrawal_id UUID REFERENCES withdrawals(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMP WITH TIME ZONE;

-- Add stripe_connect_account_id to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT;

-- Create index for stripe_connect_account_id
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_connect_account_id ON profiles(stripe_connect_account_id);

-- Update the get_user_earnings_stats function to exclude withdrawn earnings
CREATE OR REPLACE FUNCTION get_user_earnings_stats(p_user_id UUID)
RETURNS TABLE(
  total_earned DECIMAL(10,2),
  this_week_earned DECIMAL(10,2),
  this_month_earned DECIMAL(10,2),
  pending_earnings DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN e.status = 'completed' THEN e.amount ELSE 0 END), 0) as total_earned,
    COALESCE(SUM(CASE 
      WHEN e.status = 'completed' 
      AND e.earned_at >= date_trunc('week', CURRENT_DATE) 
      THEN e.amount 
      ELSE 0 
    END), 0) as this_week_earned,
    COALESCE(SUM(CASE 
      WHEN e.status = 'completed' 
      AND e.earned_at >= date_trunc('month', CURRENT_DATE) 
      THEN e.amount 
      ELSE 0 
    END), 0) as this_month_earned,
    COALESCE(SUM(CASE WHEN e.status = 'pending' THEN e.amount ELSE 0 END), 0) as pending_earnings
  FROM earnings e
  WHERE e.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Create a function to handle withdrawal processing
CREATE OR REPLACE FUNCTION process_withdrawal(
  p_user_id UUID,
  p_amount DECIMAL(10,2),
  p_platform_fee DECIMAL(10,2),
  p_total_earnings DECIMAL(10,2),
  p_stripe_transfer_id TEXT,
  p_stripe_connect_account_id TEXT
)
RETURNS UUID AS $$
DECLARE
  withdrawal_id UUID;
BEGIN
  -- Create withdrawal record
  INSERT INTO withdrawals (
    user_id, 
    amount, 
    platform_fee, 
    total_earnings, 
    stripe_transfer_id, 
    stripe_connect_account_id,
    status
  ) VALUES (
    p_user_id, 
    p_amount, 
    p_platform_fee, 
    p_total_earnings, 
    p_stripe_transfer_id, 
    p_stripe_connect_account_id,
    'processing'
  ) RETURNING id INTO withdrawal_id;

  -- Update pending earnings to withdrawn
  UPDATE earnings 
  SET 
    status = 'withdrawn',
    withdrawal_id = withdrawal_id,
    withdrawn_at = NOW()
  WHERE user_id = p_user_id 
    AND status = 'pending';

  RETURN withdrawal_id;
END;
$$ LANGUAGE plpgsql;

-- Create a view for withdrawal history with user details
CREATE OR REPLACE VIEW withdrawal_history AS
SELECT 
  w.id,
  w.user_id,
  w.amount,
  w.platform_fee,
  w.total_earnings,
  w.stripe_transfer_id,
  w.status,
  w.failure_reason,
  w.processed_at,
  w.created_at,
  p.first_name,
  p.last_name,
  p.email
FROM withdrawals w
JOIN profiles p ON w.user_id = p.id;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON withdrawals TO authenticated;
GRANT SELECT ON withdrawal_history TO authenticated;
GRANT EXECUTE ON FUNCTION process_withdrawal TO authenticated;
