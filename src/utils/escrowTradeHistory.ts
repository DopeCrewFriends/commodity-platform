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
  try {
    const d = new Date(t.date);
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
  } catch {
    return 0;
  }
}

function sortTradesNewestFirst(trades: Trade[]): Trade[] {
  return [...trades].sort((a, b) => parseTradeSortTime(b) - parseTradeSortTime(a));
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
  return {
    id: `${ESCROW_TRADE_ID_PREFIX}${escrow.id}`,
    buyer: escrow.buyer,
    seller: escrow.seller,
    commodity: escrow.commodity,
    amount: escrow.amount,
    duration: '—',
    date: formatTradeDisplayDate(escrow.startDate),
    status,
  };
}

/**
 * Merge persisted manual trade history with completed / cancelled escrows.
 * Escrow-backed rows use ids `escrow:<uuid>` so they do not collide with manual entries.
 */
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
