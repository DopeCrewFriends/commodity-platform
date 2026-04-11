import { getAppSolanaCluster } from './escrowChain';

/** Solscan cluster query matches RPC (devnet vs mainnet). */
export function solscanTxUrl(signature: string): string {
  const cluster = getAppSolanaCluster();
  const base = `https://solscan.io/tx/${encodeURIComponent(signature)}`;
  if (cluster === 'mainnet-beta') return base;
  return `${base}?cluster=devnet`;
}
