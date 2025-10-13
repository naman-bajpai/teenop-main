-- Create booking_status enum
CREATE TYPE booking_status AS ENUM (
  'pending',
  'confirmed', 
  'in_progress',
  'completed',
  'cancelled',
  'rejected'
);

-- Create bookings table
CREATE TABLE bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status booking_status DEFAULT 'pending' NOT NULL,
  requested_date DATE NOT NULL,
  requested_time TIME NOT NULL,
  duration INTEGER NOT NULL, -- in minutes
  total_price DECIMAL(10,2) NOT NULL,
  special_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_bookings_service_id ON bookings(service_id);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_requested_date ON bookings(requested_date);
CREATE INDEX idx_bookings_created_at ON bookings(created_at);

-- Create a composite index for checking availability
CREATE INDEX idx_bookings_availability ON bookings(service_id, requested_date, requested_time, status);

-- Add RLS (Row Level Security) policies
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own bookings
CREATE POLICY "Users can view own bookings" ON bookings
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Service providers can view bookings for their services
CREATE POLICY "Service providers can view their bookings" ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM services 
      WHERE services.id = bookings.service_id 
      AND services.user_id = auth.uid()
    )
  );

-- Policy: Users can create bookings for services they don't own
CREATE POLICY "Users can create bookings" ON bookings
  FOR INSERT WITH CHECK (
    auth.uid() = user_id 
    AND NOT EXISTS (
      SELECT 1 FROM services 
      WHERE services.id = bookings.service_id 
      AND services.user_id = auth.uid()
    )
  );

-- Policy: Booking owners can update their own bookings
CREATE POLICY "Booking owners can update own bookings" ON bookings
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Service providers can update bookings for their services
CREATE POLICY "Service providers can update their bookings" ON bookings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM services 
      WHERE services.id = bookings.service_id 
      AND services.user_id = auth.uid()
    )
  );

-- Policy: Booking owners can delete their own pending bookings
CREATE POLICY "Users can delete own pending bookings" ON bookings
  FOR DELETE USING (
    auth.uid() = user_id 
    AND status = 'pending'
  );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_bookings_updated_at 
  BEFORE UPDATE ON bookings 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add constraint to prevent double booking
CREATE UNIQUE INDEX idx_unique_booking_slot ON bookings(service_id, requested_date, requested_time) 
WHERE status IN ('pending', 'confirmed', 'in_progress');

-- Add constraint to ensure requested date is not in the past
ALTER TABLE bookings ADD CONSTRAINT check_future_date 
CHECK (requested_date >= CURRENT_DATE);

-- Add constraint to ensure total_price is positive
ALTER TABLE bookings ADD CONSTRAINT check_positive_price 
CHECK (total_price > 0);

-- Add constraint to ensure duration is positive
ALTER TABLE bookings ADD CONSTRAINT check_positive_duration 
CHECK (duration > 0);
