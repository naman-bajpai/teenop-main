-- Step 1 of 2: add enum value only. PostgreSQL requires this to commit before
-- the new value can appear in UPDATE/INSERT (55P04). Step 2 is the next migration.

ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'awaiting_payment';
