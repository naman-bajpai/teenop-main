-- Add 'quote' to pricing_model enum
ALTER TYPE pricing_model ADD VALUE IF NOT EXISTS 'quote';

-- Add delivery_method column to services table
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS delivery_method TEXT CHECK (delivery_method IN ('in_person', 'online')) DEFAULT 'in_person';

-- Add location_type column to services table  
ALTER TABLE services
ADD COLUMN IF NOT EXISTS location_type TEXT CHECK (location_type IN ('public_address', 'client_location')) DEFAULT 'public_address';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_services_delivery_method ON services(delivery_method);
CREATE INDEX IF NOT EXISTS idx_services_location_type ON services(location_type);

