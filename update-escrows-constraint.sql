-- Update escrows table CHECK constraint to allow new status values
-- Run this in your Supabase SQL Editor

-- STEP 1: Drop the old constraint first (if it exists)
ALTER TABLE escrows DROP CONSTRAINT IF EXISTS escrows_status_check;

-- STEP 2: Update any existing escrows with old status values to new ones
-- This must be done BEFORE adding the new constraint
UPDATE escrows 
SET status = 'ongoing' 
WHERE status = 'confirmed';

UPDATE escrows 
SET status = 'waiting' 
WHERE status = 'pending';

-- Also handle any other old status values that might exist
UPDATE escrows 
SET status = 'cancelled' 
WHERE status = 'rejected';

-- STEP 3: Now add the new constraint with correct status values
-- This will only work if all existing rows have valid status values
ALTER TABLE escrows ADD CONSTRAINT escrows_status_check 
    CHECK (status IN ('waiting', 'ongoing', 'completed', 'cancelled'));

-- STEP 4: Verify the constraint is working
-- This should return all escrows
SELECT id, status, buyer_wallet_address, seller_wallet_address 
FROM escrows 
WHERE status IN ('waiting', 'ongoing', 'completed', 'cancelled');

