import type { EscrowsData, ProfileData, Statistics, TradeHistory } from '../types';
import { mergeTradeHistoryWithEscrows } from './escrowTradeHistory';
import { loadUserData } from './storage';

function userParticipatedInTrade(trade: { buyer: string; seller: string }, walletAddress: string): boolean {
  const w = walletAddress.trim().toLowerCase();
  if (!w) return false;
  return trade.buyer.trim().toLowerCase() === w || trade.seller.trim().toLowerCase() === w;
}

/** Format profile `created_at` (ISO) for display, e.g. "Apr 2025". */
export function formatMemberSince(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  try {
    return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  } catch {
    return null;
  }
}

export function computeTradeDerivedStats(
  history: TradeHistory,
  walletAddress: string
): Pick<Statistics, 'completedTrades' | 'totalVolume' | 'successRate'> {
  const w = walletAddress.trim();
  if (!w) {
    return { completedTrades: 0, totalVolume: 0, successRate: null };
  }

  const completed = (history.completed || []).filter((t) => userParticipatedInTrade(t, w));
  const unsuccessful = (history.unsuccessful || []).filter((t) => userParticipatedInTrade(t, w));

  const completedTrades = completed.length;
  const totalVolume = completed.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const settled = completedTrades + unsuccessful.length;
  const successRate = settled === 0 ? null : Math.round((completedTrades / settled) * 100);

  return { completedTrades, totalVolume, successRate };
}

const EMPTY_TRADE_HISTORY: TradeHistory = { completed: [], ongoing: [], unsuccessful: [] };

/** Same display formatting as the profile stat cards. */
export function formatStatisticDisplay(
  value: string | number | null,
  type: 'volume' | 'rate' | 'rating'
): string {
  if (value === null || value === undefined) return '—';
  if (type === 'volume') {
    return `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (type === 'rate') {
    return `${value}%`;
  }
  if (type === 'rating') {
    return `⭐ ${value}/5.0`;
  }
  return String(value);
}

/**
 * Statistics for a wallet using the same sources as the dashboard profile card:
 * localStorage `statistics`, `tradeHistory`, `escrows` for that address (this browser).
 */
export function buildStatisticsSnapshotForWallet(walletAddress: string): Statistics {
  const w = walletAddress.trim();
  if (!w) {
    return { memberSince: null, completedTrades: 0, totalVolume: 0, successRate: null, rating: null };
  }
  const savedStats = loadUserData<Statistics>(w, 'statistics');
  const tradeHistory = loadUserData<TradeHistory>(w, 'tradeHistory') ?? EMPTY_TRADE_HISTORY;
  const escrowsData = loadUserData<EscrowsData>(w, 'escrows') ?? { totalAmount: 0, items: [] };
  const merged = mergeTradeHistoryWithEscrows(tradeHistory, escrowsData.items);
  const derived = computeTradeDerivedStats(merged, w);
  return {
    memberSince: savedStats?.memberSince ?? null,
    completedTrades: derived.completedTrades,
    totalVolume: derived.totalVolume,
    successRate: derived.successRate,
    rating: savedStats?.rating ?? null,
  };
}

/** Snapshot for a contact / search result: merges DB `profileCreatedAt` into member since when present. */
export function buildStatisticsSnapshotForProfile(profile: Partial<ProfileData>): Statistics {
  const w = profile.walletAddress?.trim() || '';
  const base = w
    ? buildStatisticsSnapshotForWallet(w)
    : { memberSince: null, completedTrades: 0, totalVolume: 0, successRate: null, rating: null };
  const fromCreated = formatMemberSince(profile.profileCreatedAt);
  return {
    ...base,
    memberSince: fromCreated ?? base.memberSince,
  };
}
