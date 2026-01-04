-- Migration: Add escrows table
-- Run this in your Supabase SQL Editor to enable escrow notifications for both users

-- Create escrows table
CREATE TABLE IF NOT EXISTS escrows (
    id TEXT PRIMARY KEY,
    buyer_wallet_address TEXT NOT NULL,
    seller_wallet_address TEXT NOT NULL,
    commodity TEXT NOT NULL,
    amount DECIMAL(18, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'ongoing', 'completed', 'cancelled')),
    duration_days INTEGER NOT NULL DEFAULT 7,
    additional_notes TEXT,
    payment_method TEXT CHECK (payment_method IN ('USDT', 'USDC')), -- Payment method (USDT or USDC)
    created_by TEXT NOT NULL, -- Wallet address of user who created the escrow
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (buyer_wallet_address) REFERENCES profiles(wallet_address) ON DELETE CASCADE,
    FOREIGN KEY (seller_wallet_address) REFERENCES profiles(wallet_address) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES profiles(wallet_address) ON DELETE CASCADE
);

-- Create indexes for escrows
CREATE INDEX IF NOT EXISTS idx_buyer_wallet ON escrows(buyer_wallet_address);
CREATE INDEX IF NOT EXISTS idx_seller_wallet ON escrows(seller_wallet_address);
CREATE INDEX IF NOT EXISTS idx_escrow_status ON escrows(status);
CREATE INDEX IF NOT EXISTS idx_escrow_created ON escrows(created_at DESC);

-- Enable RLS for escrows
ALTER TABLE escrows ENABLE ROW LEVEL SECURITY;

-- RLS Policies for escrows
-- Users can see escrows where they are buyer or seller
CREATE POLICY "Users can view their escrows" ON escrows
    FOR SELECT USING (
        buyer_wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address' OR
        seller_wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    );

-- For now, allow all reads (since we don't have JWT with wallet_address)
-- We'll filter in the application
CREATE POLICY "Anyone can view escrows" ON escrows
    FOR SELECT USING (true);

-- Users can create escrows
CREATE POLICY "Anyone can create escrows" ON escrows
    FOR INSERT WITH CHECK (true);

-- Users can update escrows (to confirm/reject)
CREATE POLICY "Users can update their escrows" ON escrows
    FOR UPDATE USING (true) WITH CHECK (true);

-- Users can delete escrows
CREATE POLICY "Anyone can delete escrows" ON escrows
    FOR DELETE USING (true);

