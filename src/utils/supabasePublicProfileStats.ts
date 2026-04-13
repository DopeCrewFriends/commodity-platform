import type { ProfileData, Statistics } from '../types';
import { supabase } from './supabase';
import { buildStatisticsSnapshotForProfile, formatMemberSince } from './profileStats';

/** Row shape from view `v_profile_public_stats` (Supabase). */
export interface PublicProfileStatsRow {
  wallet_address: string;
  profile_created_at: string;
  rating: number | null;
  completed_trades: number;
  total_volume: number | string;
  success_rate_percent: number | null;
}

const cache = new Map<string, { row: PublicProfileStatsRow; at: number }>();
const TTL_MS = 45_000;

export function mapPublicStatsRowToStatistics(
  row: PublicProfileStatsRow | null,
  profile: Partial<ProfileData>
): Statistics {
  const fallback = buildStatisticsSnapshotForProfile(profile);
  if (!row) return fallback;

  const memberSince =
    formatMemberSince(profile.profileCreatedAt) ??
    formatMemberSince(row.profile_created_at) ??
    fallback.memberSince;

  return {
    memberSince,
    completedTrades: Number(row.completed_trades),
    totalVolume: Number(row.total_volume),
    successRate: row.success_rate_percent,
    rating: row.rating ?? null,
  };
}

/**
 * Fetch aggregated public stats for a wallet (escrows + profile rating / created_at).
 * Cached briefly to avoid duplicate requests while moving the pointer across rows.
 */
export async function fetchPublicProfileStats(walletAddress: string): Promise<PublicProfileStatsRow | null> {
  const w = walletAddress.trim();
  if (!w) return null;

  const hit = cache.get(w);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return hit.row;
  }

  const { data, error } = await supabase
    .from('v_profile_public_stats')
    .select('*')
    .eq('wallet_address', w)
    .maybeSingle();

  if (error) {
    if (error.code !== 'PGRST116' && error.code !== '42P01' && !String(error.message || '').includes('does not exist')) {
      console.warn('v_profile_public_stats:', error.message);
    }
    return null;
  }

  const row = data as PublicProfileStatsRow | null;
  if (row) {
    cache.set(w, { row, at: Date.now() });
  }
  return row;
}
