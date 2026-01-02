-- Migration script to convert from user_id-based auth to wallet_address-based auth
-- Run this in your Supabase SQL editor AFTER running the updated supabase-setup.sql

-- Step 1: Drop old RLS policies that reference auth.uid()
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can add their own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can delete their own contacts" ON contacts;

-- Step 2: If profiles table has user_id column, we need to handle it
-- Option A: If you want to keep user_id for backward compatibility (make it nullable)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'profiles' AND column_name = 'user_id') THEN
        -- Make user_id nullable since we're using wallet_address now
        ALTER TABLE profiles ALTER COLUMN user_id DROP NOT NULL;
        -- Remove the foreign key constraint if it exists
        ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;
        -- Remove the unique constraint on user_id
        ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_id_key;
    END IF;
END $$;

-- Step 3: Ensure wallet_address is NOT NULL and UNIQUE
ALTER TABLE profiles ALTER COLUMN wallet_address SET NOT NULL;
-- Add unique constraint if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_wallet_address_key'
    ) THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_wallet_address_key UNIQUE (wallet_address);
    END IF;
END $$;

-- Step 4: Create new RLS policies for wallet-based auth
-- Profiles: Everyone can read, anyone can insert/update (wallet-based)
CREATE POLICY "Profiles are viewable by everyone" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert profile" ON profiles
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update profile" ON profiles
    FOR UPDATE USING (true) WITH CHECK (true);

-- Contacts: Everyone can read, anyone can insert/delete (wallet-based)
CREATE POLICY "Contacts are viewable by everyone" ON contacts
    FOR SELECT USING (true);

CREATE POLICY "Anyone can add contacts" ON contacts
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can delete contacts" ON contacts
    FOR DELETE USING (true);

-- Step 5: If contacts table has user_id columns, make them nullable
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'contacts' AND column_name = 'user_id') THEN
        ALTER TABLE contacts ALTER COLUMN user_id DROP NOT NULL;
        ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_user_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'contacts' AND column_name = 'contact_user_id') THEN
        ALTER TABLE contacts ALTER COLUMN contact_user_id DROP NOT NULL;
        ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_contact_user_id_fkey;
    END IF;
END $$;

-- Step 6: Ensure contacts table has wallet address columns
ALTER TABLE contacts ALTER COLUMN user_wallet_address SET NOT NULL;
ALTER TABLE contacts ALTER COLUMN contact_wallet_address SET NOT NULL;

