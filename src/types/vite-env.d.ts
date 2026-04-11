/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /** Solana RPC; if unset, defaults from `VITE_SOLANA_CLUSTER` (see `getSolanaRpcUrl`). */
  readonly VITE_SOLANA_RPC_URL?: string;
  /**
   * `devnet` | `mainnet-beta` | `mainnet` — picks default public RPC when `VITE_SOLANA_RPC_URL` is unset
   * and selects default USDC mint (devnet vs native mainnet USDC).
   */
  readonly VITE_SOLANA_CLUSTER?: string;
  /** Override USDC mint (advanced); otherwise devnet vs mainnet default from cluster. */
  readonly VITE_USDC_MINT?: string;
  /** Anchor program id (same pubkey can be deployed on devnet and mainnet with the same program keypair). */
  readonly VITE_ESCROW_PROGRAM_ID?: string;
  /**
   * Optional: append `SetComputeUnitPrice({ microLamports: n })` after the CU limit ix (mainnet congestion).
   * Leave unset so the dapp does not set priority price — Phantom can still add fees; sim gets a high CU cap.
   */
  readonly VITE_ANCHOR_TX_COMPUTE_UNIT_PRICE_MICRO_LAMPORTS?: string;
  /** Set to `"true"` to skip RPC `simulateTransaction` before opening Phantom (debug only). */
  readonly VITE_SKIP_ANCHOR_TX_SIMULATE?: string;
  /**
   * Set to `"true"` to never call `wallet.signAndSendTransaction` — only `signTransaction` + `sendRawTransaction`.
   * Try this if Phantom’s combined path always shows a simulation revert while the app’s RPC sim succeeds.
   */
  readonly VITE_ANCHOR_SIGN_THEN_SENDRAW_ONLY?: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}


