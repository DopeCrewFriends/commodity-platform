import type { EscrowChainTransactions } from '../types';

export function parseEscrowChainTransactions(raw: unknown): EscrowChainTransactions | undefined {
  if (raw == null || raw === '') return undefined;
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw as EscrowChainTransactions;
  if (typeof raw === 'string') {
    try {
      const o = JSON.parse(raw) as EscrowChainTransactions;
      return typeof o === 'object' && o !== null ? o : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}
