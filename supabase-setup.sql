-- SQL script to set up Supabase database tables
-- Run this in your Supabase SQL editor
-- Updated for wallet-based authentication

-- Create profiles table (all fields are required)
-- Uses wallet_address as primary identifier (wallet-based auth)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT NOT NULL,
    avatar_image TEXT NOT NULL,
    username TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create unique index on username (case-insensitive)
-- Using LOWER() to ensure case-insensitive uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_username_unique 
ON profiles(LOWER(username));

-- Create indexes for faster searches
CREATE INDEX IF NOT EXISTS idx_name ON profiles(name);
CREATE INDEX IF NOT EXISTS idx_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_wallet_address ON profiles(wallet_address);

-- Create contacts table (only stores relationships - profile data comes from profiles table)
-- Uses wallet addresses for wallet-based auth
CREATE TABLE IF NOT EXISTS contacts (
    id BIGSERIAL PRIMARY KEY,
    user_wallet_address TEXT NOT NULL,
    contact_wallet_address TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_wallet_address, contact_wallet_address), -- One relationship per user pair
    CHECK (user_wallet_address != contact_wallet_address), -- Cannot add yourself as contact
    FOREIGN KEY (user_wallet_address) REFERENCES profiles(wallet_address) ON DELETE CASCADE,
    FOREIGN KEY (contact_wallet_address) REFERENCES profiles(wallet_address) ON DELETE CASCADE
);

-- Create indexes for contacts
CREATE INDEX IF NOT EXISTS idx_user_wallet ON contacts(user_wallet_address);
CREATE INDEX IF NOT EXISTS idx_contact_wallet ON contacts(contact_wallet_address);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
-- Everyone can read all profiles (for searching/adding contacts)
CREATE POLICY "Profiles are viewable by everyone" ON profiles
    FOR SELECT USING (true);

-- Anyone can insert a profile (wallet-based, no auth.uid() needed)
CREATE POLICY "Anyone can insert profile" ON profiles
    FOR INSERT WITH CHECK (true);

-- Users can only update their own profile (by wallet_address)
-- Note: This requires a function to check wallet ownership
-- For now, we'll allow updates but you can restrict this further if needed
CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (true) WITH CHECK (true);

-- RLS Policies for contacts
-- Users can only see contacts where they are the user
-- Note: Since we don't have auth.uid(), we'll need to filter in the application
-- For now, allow reading all contacts (you can restrict this in your app code)
CREATE POLICY "Contacts are viewable by everyone" ON contacts
    FOR SELECT USING (true);

-- Anyone can add contacts (wallet-based)
CREATE POLICY "Anyone can add contacts" ON contacts
    FOR INSERT WITH CHECK (true);

-- Anyone can delete contacts (wallet-based)
-- Note: You should filter by wallet_address in your application code
CREATE POLICY "Anyone can delete contacts" ON contacts
    FOR DELETE USING (true);

-- Migration: If you have an existing profiles table with user_id, you need to migrate:
-- 1. First, make wallet_address NOT NULL and UNIQUE if it isn't already
-- ALTER TABLE profiles ALTER COLUMN wallet_address SET NOT NULL;
-- ALTER TABLE profiles ADD CONSTRAINT profiles_wallet_address_unique UNIQUE (wallet_address);
-- 
-- 2. Remove user_id column if it exists (only if you're fully migrating to wallet-based)
-- ALTER TABLE profiles DROP COLUMN IF EXISTS user_id;
--
-- 3. Drop old policies that reference auth.uid()
-- DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
-- DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
-- DROP POLICY IF EXISTS "Users can view their own contacts" ON contacts;
-- DROP POLICY IF EXISTS "Users can add their own contacts" ON contacts;
-- DROP POLICY IF EXISTS "Users can delete their own contacts" ON contacts;
