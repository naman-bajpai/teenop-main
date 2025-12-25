-- Add alternative_proposed status to booking_status enum
-- This needs to be run in Supabase SQL Editor

-- First, check if the value already exists
DO $$ 
BEGIN
    -- Try to add the value, but it will fail silently if it already exists
    -- We need to check if it exists first
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum 
        WHERE enumlabel = 'alternative_proposed' 
        AND enumtypid = (
            SELECT oid 
            FROM pg_type 
            WHERE typname = 'booking_status'
        )
    ) THEN
        ALTER TYPE booking_status ADD VALUE 'alternative_proposed';
    END IF;
END $$;

-- Verify the enum values
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'booking_status'
)
ORDER BY enumsortorder;

