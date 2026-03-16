-- Fix the check_future_date constraint to allow past dates for completed bookings
-- The constraint was preventing bookings from being marked as completed if the date is in the past

-- First, drop the existing constraint
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS check_future_date;

-- Recreate the constraint to only check future dates for non-completed bookings
-- This allows completed bookings to have dates in the past
ALTER TABLE bookings ADD CONSTRAINT check_future_date 
  CHECK (
    status IN ('completed', 'cancelled', 'rejected') 
    OR requested_date >= CURRENT_DATE
  );
