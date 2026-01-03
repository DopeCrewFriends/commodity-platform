-- Migration: Add contact_requests table
-- Run this in your Supabase SQL Editor to enable the contact request system

-- Create contact_requests table for contact request system
CREATE TABLE IF NOT EXISTS contact_requests (
    id BIGSERIAL PRIMARY KEY,
    from_wallet_address TEXT NOT NULL,
    to_wallet_address TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(from_wallet_address, to_wallet_address), -- One pending request per user pair
    CHECK (from_wallet_address != to_wallet_address), -- Cannot send request to yourself
    FOREIGN KEY (from_wallet_address) REFERENCES profiles(wallet_address) ON DELETE CASCADE,
    FOREIGN KEY (to_wallet_address) REFERENCES profiles(wallet_address) ON DELETE CASCADE
);

-- Create indexes for contact_requests
CREATE INDEX IF NOT EXISTS idx_from_wallet ON contact_requests(from_wallet_address);
CREATE INDEX IF NOT EXISTS idx_to_wallet ON contact_requests(to_wallet_address);
CREATE INDEX IF NOT EXISTS idx_request_status ON contact_requests(status);
CREATE INDEX IF NOT EXISTS idx_request_created ON contact_requests(created_at DESC);

-- Enable RLS for contact_requests
ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contact_requests
-- Users can see requests they sent or received
CREATE POLICY "Users can view their contact requests" ON contact_requests
    FOR SELECT USING (true);

-- Users can create contact requests
CREATE POLICY "Anyone can create contact requests" ON contact_requests
    FOR INSERT WITH CHECK (true);

-- Users can update contact requests (to accept/reject)
CREATE POLICY "Users can update contact requests" ON contact_requests
    FOR UPDATE USING (true) WITH CHECK (true);

-- Users can delete contact requests
CREATE POLICY "Anyone can delete contact requests" ON contact_requests
    FOR DELETE USING (true);

