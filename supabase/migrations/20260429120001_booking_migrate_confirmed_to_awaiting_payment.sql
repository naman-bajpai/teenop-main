-- Step 2 of 2: migrate rows after enum value exists (separate transaction from step 1).
-- If you run SQL manually, run 20260429120000 first, commit, then run this file.

UPDATE public.bookings
SET status = 'awaiting_payment'::booking_status
WHERE status = 'confirmed'::booking_status;
