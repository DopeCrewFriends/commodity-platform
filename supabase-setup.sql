-- SQL script to set up Supabase database tables
-- Run this in your Supabase SQL editor

-- Create profiles table (all fields are required)
-- Now uses user_id from auth.users as primary identifier
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    wallet_address TEXT, -- Optional: keep for backward compatibility
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT NOT NULL,
    avatar_image TEXT NOT NULL,
    username TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id) -- One profile per user
);

-- Create unique index on username (case-insensitive)
-- Using LOWER() to ensure case-insensitive uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_username_unique 
ON profiles(LOWER(username));

-- Create indexes for faster searches
CREATE INDEX IF NOT EXISTS idx_name ON profiles(name);
CREATE INDEX IF NOT EXISTS idx_username ON profiles(username);

-- Create contacts table (only stores relationships - profile data comes from profiles table)
-- Now uses user_id from auth.users
CREATE TABLE IF NOT EXISTS contacts (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    contact_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    -- Keep wallet addresses for backward compatibility during migration
    user_wallet_address TEXT,
    contact_wallet_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, contact_user_id), -- One relationship per user pair
    CHECK (user_id != contact_user_id) -- Cannot add yourself as contact
);

-- Migration: If you have an existing contacts table with name/email/company/location columns,
-- you can remove them with:
-- ALTER TABLE contacts DROP COLUMN IF EXISTS name;
-- ALTER TABLE contacts DROP COLUMN IF EXISTS email;
-- ALTER TABLE contacts DROP COLUMN IF EXISTS company;
-- ALTER TABLE contacts DROP COLUMN IF EXISTS location;

-- Migration: If you have an existing profiles table, make all fields required:
-- ALTER TABLE profiles ALTER COLUMN company SET NOT NULL;
-- ALTER TABLE profiles ALTER COLUMN location SET NOT NULL;
-- ALTER TABLE profiles ALTER COLUMN avatar_image SET NOT NULL;
-- ALTER TABLE profiles ALTER COLUMN username SET NOT NULL;
-- Note: Make sure all existing rows have values for these fields before running the above commands!

-- Create indexes for contacts
CREATE INDEX IF NOT EXISTS idx_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_user_id ON contacts(contact_user_id);
-- Keep wallet indexes for backward compatibility
CREATE INDEX IF NOT EXISTS idx_user_wallet ON contacts(user_wallet_address);
CREATE INDEX IF NOT EXISTS idx_contact_wallet ON contacts(contact_wallet_address);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
-- Users can read all profiles (for searching/adding contacts)
CREATE POLICY "Profiles are viewable by everyone" ON profiles
    FOR SELECT USING (true);

-- Users can only insert/update their own profile
CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for contacts
-- Users can only see their own contacts
CREATE POLICY "Users can view their own contacts" ON contacts
    FOR SELECT USING (auth.uid() = user_id);

-- Users can only add contacts for themselves
CREATE POLICY "Users can add their own contacts" ON contacts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own contacts
CREATE POLICY "Users can delete their own contacts" ON contacts
    FOR DELETE USING (auth.uid() = user_id);

