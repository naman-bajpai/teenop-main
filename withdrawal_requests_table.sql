-- ============================================
-- WITHDRAWAL REQUESTS TABLE CREATION/UPDATE
-- ============================================

-- Create withdrawal_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  platform_fee DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (platform_fee >= 0),
  total_earnings DECIMAL(10, 2) NOT NULL CHECK (total_earnings >= 0),
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('pending', 'processing', 'approved', 'processed', 'failed', 'cancelled')),
  stripe_connect_account_id TEXT,
  stripe_transfer_id TEXT,
  processed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_created_at ON withdrawal_requests(created_at DESC);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_withdrawal_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_withdrawal_requests_updated_at ON withdrawal_requests;
CREATE TRIGGER update_withdrawal_requests_updated_at
  BEFORE UPDATE ON withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_withdrawal_requests_updated_at();

-- Enable RLS (Row Level Security)
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own withdrawal requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "Admins can view all withdrawal requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "Users can create their own withdrawal requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "Admins can update withdrawal requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "Service role can manage withdrawal requests" ON withdrawal_requests;

-- Policy: Users can view their own withdrawal requests
CREATE POLICY "Users can view their own withdrawal requests"
  ON withdrawal_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Admins can view all withdrawal requests
CREATE POLICY "Admins can view all withdrawal requests"
  ON withdrawal_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Users can create their own withdrawal requests
CREATE POLICY "Users can create their own withdrawal requests"
  ON withdrawal_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can update withdrawal requests
CREATE POLICY "Admins can update withdrawal requests"
  ON withdrawal_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Service role can manage withdrawal requests (for automatic creation)
-- This allows the service role to create withdrawal requests on behalf of users
-- when bookings are completed
CREATE POLICY "Service role can manage withdrawal requests"
  ON withdrawal_requests
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comment to table
COMMENT ON TABLE withdrawal_requests IS 'Stores withdrawal requests from users to admins. Created automatically when bookings are completed.';

-- Update status constraint if table already exists
DO $$ 
BEGIN
  -- Drop old constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'withdrawal_requests_status_check'
  ) THEN
    ALTER TABLE withdrawal_requests 
    DROP CONSTRAINT withdrawal_requests_status_check;
  END IF;
  
  -- Add new constraint with all statuses
  ALTER TABLE withdrawal_requests 
  ADD CONSTRAINT withdrawal_requests_status_check 
  CHECK (status IN ('pending', 'processing', 'approved', 'processed', 'failed', 'cancelled'));
  
  -- Update default if needed
  ALTER TABLE withdrawal_requests 
  ALTER COLUMN status SET DEFAULT 'processing';
END $$;

