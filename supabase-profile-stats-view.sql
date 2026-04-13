-- =============================================================================
-- CX: profile stats from Supabase (run once in Supabase SQL Editor on existing DB)
-- =============================================================================
-- Adds optional profiles.rating and view v_profile_public_stats (escrow-derived).
-- Safe to re-run: IF NOT EXISTS / CREATE OR REPLACE VIEW.
-- =============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rating REAL;

CREATE OR REPLACE VIEW v_profile_public_stats AS
WITH escrow_participation AS (
  SELECT buyer_wallet_address AS wallet, status, amount FROM escrows
  UNION ALL
  SELECT seller_wallet_address AS wallet, status, amount FROM escrows
),
escrow_agg AS (
  SELECT
    wallet,
    COUNT(*) FILTER (WHERE status = 'completed')::bigint AS completed_trades,
    COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0)::numeric(18, 2) AS total_volume,
    COUNT(*) FILTER (WHERE status = 'cancelled')::bigint AS cancelled_trades
  FROM escrow_participation
  GROUP BY wallet
)
SELECT
  pr.wallet_address,
  pr.created_at AS profile_created_at,
  pr.rating AS rating,
  COALESCE(e.completed_trades, 0)::bigint AS completed_trades,
  COALESCE(e.total_volume, 0)::numeric(18, 2) AS total_volume,
  CASE
    WHEN COALESCE(e.completed_trades, 0) + COALESCE(e.cancelled_trades, 0) > 0 THEN
      ROUND(
        (100.0 * COALESCE(e.completed_trades, 0)::numeric)
        / (COALESCE(e.completed_trades, 0) + COALESCE(e.cancelled_trades, 0))::numeric
      )::integer
    ELSE NULL
  END AS success_rate_percent
FROM profiles pr
LEFT JOIN escrow_agg e ON e.wallet = pr.wallet_address;

GRANT SELECT ON v_profile_public_stats TO anon;
GRANT SELECT ON v_profile_public_stats TO authenticated;
GRANT SELECT ON v_profile_public_stats TO service_role;
