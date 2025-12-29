-- SQL script to set up Supabase database tables
-- Run this in your Supabase SQL editor

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
    wallet_address TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    company TEXT,
    location TEXT,
    avatar_image TEXT,
    username TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create unique index on username (case-insensitive, only for non-null usernames)
-- Using LOWER() to ensure case-insensitive uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_username_unique 
ON profiles(LOWER(username)) 
WHERE username IS NOT NULL AND username != '';

-- Create indexes for faster searches
CREATE INDEX IF NOT EXISTS idx_name ON profiles(name);
CREATE INDEX IF NOT EXISTS idx_username ON profiles(username);

-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id BIGSERIAL PRIMARY KEY,
    user_wallet_address TEXT NOT NULL,
    contact_wallet_address TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    company TEXT,
    location TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_wallet_address, contact_wallet_address)
);

-- Create indexes for contacts
CREATE INDEX IF NOT EXISTS idx_user_wallet ON contacts(user_wallet_address);
CREATE INDEX IF NOT EXISTS idx_contact_wallet ON contacts(contact_wallet_address);

-- Enable Row Level Security (RLS) - optional, adjust based on your needs
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (adjust based on your security needs)
-- For public read/write access:
CREATE POLICY "Allow all operations on profiles" ON profiles
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on contacts" ON contacts
    FOR ALL USING (true) WITH CHECK (true);

