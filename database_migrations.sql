-- ============================================
-- DATABASE MIGRATIONS FOR TEENOPS UPDATES
-- ============================================

-- 1. Add alternative_date and alternative_time columns to bookings table
-- (For alternative time proposals)
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS alternative_date DATE,
ADD COLUMN IF NOT EXISTS alternative_time TIME;

-- 2. Add alternative_proposed status to booking_status enum (if not exists)
-- Note: This may need to be done via Supabase dashboard if enum already exists
-- ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'alternative_proposed';

-- 3. Add avatar_url column to profiles table (for profile pictures)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 4. Add service_address column to bookings table (for client location)
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS service_address TEXT;

-- 5. Add availability column to services table (for service-specific availability)
-- This will store JSON data for availability
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS availability JSONB;

-- 6. Create reviews table (for Tip/Rate/Review functionality)
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  tip_amount DECIMAL(10, 2) DEFAULT 0 CHECK (tip_amount >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(booking_id, reviewer_id) -- One review per booking per reviewer
);

-- 7. Create index on reviews for faster queries
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_service_id ON reviews(service_id);
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON reviews(booking_id);

-- 8. Add average_rating column to services table (for displaying ratings)
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3, 2) DEFAULT 0 CHECK (average_rating >= 0 AND average_rating <= 5),
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0 CHECK (total_reviews >= 0);

-- 9. Create function to update service ratings when review is added
CREATE OR REPLACE FUNCTION update_service_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE services
  SET 
    average_rating = (
      SELECT COALESCE(AVG(rating)::DECIMAL(3,2), 0)
      FROM reviews
      WHERE service_id = NEW.service_id
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM reviews
      WHERE service_id = NEW.service_id
    )
  WHERE id = NEW.service_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Create trigger to automatically update service ratings
DROP TRIGGER IF EXISTS trigger_update_service_rating ON reviews;
CREATE TRIGGER trigger_update_service_rating
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_service_rating();

-- 11. Add message_notification_sent column to messages/conversations (if messages table exists)
-- Note: Adjust table name based on your actual messages table structure
-- ALTER TABLE messages ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT FALSE;

-- 12. IMPORTANT: Create Supabase Storage bucket for avatars
-- This must be done in Supabase Dashboard > Storage:
-- 1. Go to Storage section
-- 2. Click "New bucket"
-- 3. Name: "avatars"
-- 4. Make it public (or configure RLS policies as needed)
-- 5. Enable file size limit: 5MB

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check if columns were added successfully
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
AND column_name IN ('alternative_date', 'alternative_time', 'service_address');

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'avatar_url';

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'services' 
AND column_name IN ('availability', 'average_rating', 'total_reviews');

-- Check if reviews table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'reviews';

