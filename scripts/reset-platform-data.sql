-- =============================================================================
-- RESET ALL PLATFORM DATA
-- =============================================================================
-- Use this to wipe: all escrows, contact requests, contacts, and user profiles.
-- Run in Supabase Dashboard → SQL Editor → New query → paste and Run.
--
-- Order matters: delete child tables first, then profiles.
-- (Alternatively you could DELETE FROM profiles only and rely on ON DELETE CASCADE,
--  but this order is explicit and safe.)
-- =============================================================================

-- 1. Escrow history
DELETE FROM escrows;

-- 2. Contact requests (pending / accepted / rejected)
DELETE FROM contact_requests;

-- 3. Contacts (relationships between users)
DELETE FROM contacts;

-- 4. All user profiles (this will cascade if any FKs remain)
DELETE FROM profiles;

-- Optional: reset sequences if you use SERIAL/BIGSERIAL and want IDs to start from 1 again
-- ALTER SEQUENCE contacts_id_seq RESTART WITH 1;
-- ALTER SEQUENCE contact_requests_id_seq RESTART WITH 1;
