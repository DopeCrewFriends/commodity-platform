import type { Escrow, Trade, TradeHistory } from '../types';

const ESCROW_TRADE_ID_PREFIX = 'escrow:';

/** Escrows shown in the main panel (not completed / cancelled). */
export function isEscrowActiveForPanel(escrow: Escrow): boolean {
  return escrow.status === 'waiting' || escrow.status === 'ongoing';
}

function formatTradeDisplayDate(isoOrText: string): string {
  try {
    const d = new Date(isoOrText);
    return Number.isNaN(d.getTime()) ? isoOrText : d.toLocaleDateString();
  } catch {
    return isoOrText;
  }
}

function parseTradeSortTime(t: Trade): number {
  const raw = (t.sortAt?.trim() || t.date?.trim() || '').trim();
  if (!raw) return 0;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function sortTradesNewestFirst(trades: Trade[]): Trade[] {
  return [...trades].sort((a, b) => {
    const byTime = parseTradeSortTime(b) - parseTradeSortTime(a);
    if (byTime !== 0) return byTime;
    return b.id.localeCompare(a.id);
  });
}

/** Single list for UI: all buckets merged, deduped by `id`, newest first. */
export function flattenTradeHistoryForDisplay(history: TradeHistory): Trade[] {
  const raw = [
    ...(history.completed || []),
    ...(history.ongoing || []),
    ...(history.unsuccessful || []),
  ];
  const byId = new Map<string, Trade>();
  for (const t of raw) {
    const id =
      t.id?.trim() ||
      `${t.commodity}|${t.date}|${t.amount}|${t.buyer}|${t.seller}|${t.status}`;
    byId.set(id, t);
  }
  return sortTradesNewestFirst([...byId.values()]);
}

/** Map a terminal-state escrow into a row for Trade History. */
export function escrowToTrade(escrow: Escrow): Trade {
  const status: Trade['status'] = escrow.status === 'completed' ? 'completed' : 'unsuccessful';
  const sortIso = (escrow.updatedAt?.trim() || escrow.startDate?.trim() || '').trim() || escrow.startDate;
  return {
    id: `${ESCROW_TRADE_ID_PREFIX}${escrow.id}`,
    buyer: escrow.buyer,
    seller: escrow.seller,
    commodity: escrow.commodity,
    amount: escrow.amount,
    duration: '—',
    sortAt: sortIso,
    date: formatTradeDisplayDate(sortIso),
    status,
  };
}

/**
 * Merge persisted manual trade history with completed / cancelled escrows.
 * Escrow-backed rows use ids `escrow:<uuid>` so they do not collide with manual entries.
 */
/** Trades where the two wallets are exactly the buyer and seller (either role). */
export function tradeInvolvesBothWallets(trade: Trade, walletA: string, walletB: string): boolean {
  const a = walletA.trim();
  const b = walletB.trim();
  const tb = trade.buyer.trim();
  const ts = trade.seller.trim();
  return (tb === a && ts === b) || (tb === b && ts === a);
}

export function filterTradesBetweenWallets(trades: Trade[], walletA: string, walletB: string): Trade[] {
  return trades.filter((t) => tradeInvolvesBothWallets(t, walletA, walletB));
}

/** Split a flat list back into `TradeHistory` buckets (order preserved per bucket). */
export function buildTradeHistoryFromTrades(trades: Trade[]): TradeHistory {
  return {
    completed: trades.filter((t) => t.status === 'completed'),
    ongoing: trades.filter((t) => t.status === 'ongoing'),
    unsuccessful: trades.filter((t) => t.status === 'unsuccessful'),
  };
}

/**
 * Viewer’s merged history + escrows, restricted to trades between `walletViewer` and `walletOther`.
 */
export function sharedTradeHistoryBetweenWallets(
  history: TradeHistory,
  escrows: Escrow[],
  walletViewer: string,
  walletOther: string
): TradeHistory {
  const merged = mergeTradeHistoryWithEscrows(history, escrows);
  const flat = flattenTradeHistoryForDisplay(merged);
  const filtered = filterTradesBetweenWallets(flat, walletViewer, walletOther);
  return buildTradeHistoryFromTrades(filtered);
}

export function mergeTradeHistoryWithEscrows(history: TradeHistory, escrows: Escrow[]): TradeHistory {
  const fromEscrowCompleted = escrows
    .filter((e) => e.status === 'completed')
    .map(escrowToTrade);
  const fromEscrowUnsuccessful = escrows
    .filter((e) => e.status === 'cancelled')
    .map(escrowToTrade);

  // Drop manual rows that reuse our escrow-prefixed id (should not happen)
  const manualCompleted = (history.completed || []).filter((t) => !t.id.startsWith(ESCROW_TRADE_ID_PREFIX));
  const manualUnsuccessful = (history.unsuccessful || []).filter((t) => !t.id.startsWith(ESCROW_TRADE_ID_PREFIX));

  const byIdCompleted = new Map<string, Trade>();
  for (const t of manualCompleted) byIdCompleted.set(t.id, t);
  for (const t of fromEscrowCompleted) byIdCompleted.set(t.id, t);

  const byIdUnsuccessful = new Map<string, Trade>();
  for (const t of manualUnsuccessful) byIdUnsuccessful.set(t.id, t);
  for (const t of fromEscrowUnsuccessful) byIdUnsuccessful.set(t.id, t);

  return {
    completed: sortTradesNewestFirst([...byIdCompleted.values()]),
    ongoing: sortTradesNewestFirst([...(history.ongoing || [])]),
    unsuccessful: sortTradesNewestFirst([...byIdUnsuccessful.values()]),
  };
}
