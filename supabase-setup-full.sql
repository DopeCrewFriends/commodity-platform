-- =============================================================================
-- SETTL / CX – Full Supabase schema (up to date)
-- =============================================================================
-- Run this in Supabase Dashboard → SQL Editor on a **new project** to create all
-- tables, indexes, and RLS policies. For existing projects, run the sections
-- that apply or use separate migrations.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. PROFILES
-- -----------------------------------------------------------------------------
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_username_unique ON profiles(LOWER(username));
CREATE INDEX IF NOT EXISTS idx_name ON profiles(name);
CREATE INDEX IF NOT EXISTS idx_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_wallet_address ON profiles(wallet_address);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert profile" ON profiles;
CREATE POLICY "Anyone can insert profile" ON profiles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (true) WITH CHECK (true);


-- -----------------------------------------------------------------------------
-- 2. CONTACTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contacts (
    id BIGSERIAL PRIMARY KEY,
    user_wallet_address TEXT NOT NULL,
    contact_wallet_address TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_wallet_address, contact_wallet_address),
    CHECK (user_wallet_address != contact_wallet_address),
    FOREIGN KEY (user_wallet_address) REFERENCES profiles(wallet_address) ON DELETE CASCADE,
    FOREIGN KEY (contact_wallet_address) REFERENCES profiles(wallet_address) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_wallet ON contacts(user_wallet_address);
CREATE INDEX IF NOT EXISTS idx_contact_wallet ON contacts(contact_wallet_address);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Contacts are viewable by everyone" ON contacts;
CREATE POLICY "Contacts are viewable by everyone" ON contacts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can add contacts" ON contacts;
CREATE POLICY "Anyone can add contacts" ON contacts FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete contacts" ON contacts;
CREATE POLICY "Anyone can delete contacts" ON contacts FOR DELETE USING (true);


-- -----------------------------------------------------------------------------
-- 3. CONTACT_REQUESTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contact_requests (
    id BIGSERIAL PRIMARY KEY,
    from_wallet_address TEXT NOT NULL,
    to_wallet_address TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(from_wallet_address, to_wallet_address),
    CHECK (from_wallet_address != to_wallet_address),
    FOREIGN KEY (from_wallet_address) REFERENCES profiles(wallet_address) ON DELETE CASCADE,
    FOREIGN KEY (to_wallet_address) REFERENCES profiles(wallet_address) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_from_wallet ON contact_requests(from_wallet_address);
CREATE INDEX IF NOT EXISTS idx_to_wallet ON contact_requests(to_wallet_address);
CREATE INDEX IF NOT EXISTS idx_request_status ON contact_requests(status);
CREATE INDEX IF NOT EXISTS idx_request_created ON contact_requests(created_at DESC);

ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their contact requests" ON contact_requests;
CREATE POLICY "Users can view their contact requests" ON contact_requests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can create contact requests" ON contact_requests;
CREATE POLICY "Anyone can create contact requests" ON contact_requests FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update contact requests" ON contact_requests;
CREATE POLICY "Users can update contact requests" ON contact_requests FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete contact requests" ON contact_requests;
CREATE POLICY "Anyone can delete contact requests" ON contact_requests FOR DELETE USING (true);


-- -----------------------------------------------------------------------------
-- 4. ESCROWS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS escrows (
    id TEXT PRIMARY KEY,
    buyer_wallet_address TEXT NOT NULL,
    seller_wallet_address TEXT NOT NULL,
    commodity TEXT NOT NULL,
    amount DECIMAL(18, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting',
    duration_days INTEGER NOT NULL DEFAULT 7,
    additional_notes TEXT,
    payment_method TEXT CHECK (payment_method IN ('USDT', 'USDC')),
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cancelled_by TEXT,
    complete_signed_by TEXT[] DEFAULT '{}',
    cancel_signed_by TEXT[] DEFAULT '{}',
    FOREIGN KEY (buyer_wallet_address) REFERENCES profiles(wallet_address) ON DELETE CASCADE,
    FOREIGN KEY (seller_wallet_address) REFERENCES profiles(wallet_address) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES profiles(wallet_address) ON DELETE CASCADE
);

ALTER TABLE escrows DROP CONSTRAINT IF EXISTS escrows_status_check;
ALTER TABLE escrows ADD CONSTRAINT escrows_status_check
    CHECK (status IN ('waiting', 'ongoing', 'completed', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_buyer_wallet ON escrows(buyer_wallet_address);
CREATE INDEX IF NOT EXISTS idx_seller_wallet ON escrows(seller_wallet_address);
CREATE INDEX IF NOT EXISTS idx_escrow_status ON escrows(status);
CREATE INDEX IF NOT EXISTS idx_escrow_created ON escrows(created_at DESC);

ALTER TABLE escrows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their escrows" ON escrows;
DROP POLICY IF EXISTS "Anyone can view escrows" ON escrows;
CREATE POLICY "Anyone can view escrows" ON escrows FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can create escrows" ON escrows;
CREATE POLICY "Anyone can create escrows" ON escrows FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their escrows" ON escrows;
CREATE POLICY "Users can update their escrows" ON escrows FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete escrows" ON escrows;
CREATE POLICY "Anyone can delete escrows" ON escrows FOR DELETE USING (true);


-- -----------------------------------------------------------------------------
-- Optional: if escrows already existed without these columns, add them
-- -----------------------------------------------------------------------------
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS cancelled_by TEXT;
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS complete_signed_by TEXT[] DEFAULT '{}';
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS cancel_signed_by TEXT[] DEFAULT '{}';

-- =============================================================================
-- Done. Tables: profiles, contacts, contact_requests, escrows.
-- Reset script: see scripts/reset-platform-data.sql
-- =============================================================================
