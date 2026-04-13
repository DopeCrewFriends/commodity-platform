/**
 * On-chain escrow (Anchor) — USDC mint + RPC cluster from `VITE_*` (see `getUsdcMint`, `getAppSolanaCluster`).
 */
import { Buffer } from 'buffer';
import {
  PublicKey,
  Connection,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { Program, AnchorProvider, Idl } from '@coral-xyz/anchor';
import BN from 'bn.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstructionWithDerivation,
} from '@solana/spl-token';
import {
  getEscrowProgramId,
  sendAnchorTransaction,
  adapterWalletPk,
  SystemProgram,
  type AnchorWalletSendLike,
} from './anchorTx';
import type { Escrow, EscrowStatus } from '../types';

const DEVNET_USDC = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
/** Native USDC on Solana mainnet (legacy SPL mint). */
const MAINNET_USDC = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const USDC_DECIMALS = 6;
const FACTOR = 10 ** USDC_DECIMALS;

export function getSolanaRpcUrl(): string {
  const u = import.meta.env.VITE_SOLANA_RPC_URL?.trim();
  if (u) return u;
  const cluster = import.meta.env.VITE_SOLANA_CLUSTER?.trim().toLowerCase();
  if (cluster === 'mainnet-beta' || cluster === 'mainnet') {
    return 'https://api.mainnet-beta.solana.com';
  }
  return 'https://api.devnet.solana.com';
}

/** Cluster from `VITE_SOLANA_CLUSTER` or inferred from `VITE_SOLANA_RPC_URL` / default RPC. */
export type AppSolanaCluster = 'devnet' | 'mainnet-beta';

export function getAppSolanaCluster(): AppSolanaCluster {
  const raw = import.meta.env.VITE_SOLANA_CLUSTER?.trim().toLowerCase();
  if (raw === 'mainnet-beta' || raw === 'mainnet') return 'mainnet-beta';
  if (raw === 'devnet') return 'devnet';
  const rpc = getSolanaRpcUrl().toLowerCase();
  return rpc.includes('devnet') || rpc.includes('testnet') ? 'devnet' : 'mainnet-beta';
}

/** Canonical USDC mint for the active cluster (override with `VITE_USDC_MINT`). */
export function getUsdcMint(): PublicKey {
  const o = import.meta.env.VITE_USDC_MINT?.trim();
  if (o) return new PublicKey(o);
  return getAppSolanaCluster() === 'mainnet-beta' ? MAINNET_USDC : DEVNET_USDC;
}

export function getClusterDisplayName(): 'Mainnet' | 'Devnet' {
  return getAppSolanaCluster() === 'mainnet-beta' ? 'Mainnet' : 'Devnet';
}

export function isOnChainEscrowConfigured(): boolean {
  return Boolean(import.meta.env.VITE_ESCROW_PROGRAM_ID?.trim());
}

export function atomsFromUiAmount(amount: number): BN {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Invalid amount');
  return new BN(Math.round(amount * FACTOR));
}

function tokenAta(owner: PublicKey, mint: PublicKey, allowOwnerOffCurve = false): PublicKey {
  return getAssociatedTokenAddressSync(mint, owner, allowOwnerOffCurve, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
}

function vaultAta(escrowPda: PublicKey, mint: PublicKey): PublicKey {
  return tokenAta(escrowPda, mint, true);
}

function deriveEscrowPda(buyer: PublicKey, seller: PublicKey, nonce: BN, programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('escrow'), buyer.toBuffer(), seller.toBuffer(), nonce.toArrayLike(Buffer, 'le', 8)],
    programId
  );
  return pda;
}

/** Match on-chain layout; Anchor 0.32 AccountClient needs `size` on Escrow in the IDL. */
const ESCROW_ACCOUNT_MIN_LEN = 124;
const ESCROW_DISCRIMINATOR = [31, 213, 123, 187, 186, 22, 218, 155];
const ESCROW_TYPE_FIELDS = [
  { name: 'buyer', type: 'pubkey' },
  { name: 'seller', type: 'pubkey' },
  { name: 'nonce', type: 'u64' },
  { name: 'mint', type: 'pubkey' },
  { name: 'status', type: 'u8' },
  { name: 'amount', type: 'u64' },
  { name: 'buyer_vote', type: 'u8' },
  { name: 'seller_vote', type: 'u8' },
  { name: 'bump', type: 'u8' },
] as const;

function patchAnchor032EscrowIdl(raw: Idl): Idl {
  const idl = JSON.parse(JSON.stringify(raw)) as Idl;
  if (!idl.accounts) idl.accounts = [];
  const accounts = idl.accounts as { name: string; discriminator?: number[]; size?: number }[];
  let escrowAcc = accounts.find((a) => a.name === 'Escrow');
  if (!escrowAcc) {
    escrowAcc = { name: 'Escrow', discriminator: [...ESCROW_DISCRIMINATOR], size: ESCROW_ACCOUNT_MIN_LEN };
    accounts.push(escrowAcc);
  } else {
    escrowAcc.discriminator = [...ESCROW_DISCRIMINATOR];
    escrowAcc.size = ESCROW_ACCOUNT_MIN_LEN;
  }
  if (!idl.types) idl.types = [];
  const types = idl.types as {
    name: string;
    size?: number;
    type?: { kind: string; fields: { name: string; type: string }[] };
  }[];
  let escrowType = types.find((t) => t.name === 'Escrow');
  const fields = ESCROW_TYPE_FIELDS.map((f) => ({ name: f.name, type: f.type }));
  if (!escrowType) {
    escrowType = {
      name: 'Escrow',
      type: { kind: 'struct', fields },
      size: ESCROW_ACCOUNT_MIN_LEN,
    };
    types.push(escrowType);
  } else {
    escrowType.size = ESCROW_ACCOUNT_MIN_LEN;
    if (escrowType.type?.kind === 'struct') {
      escrowType.type.fields = fields;
    }
  }
  return idl;
}

function patchIdlSignerAccounts(idl: Idl): void {
  const byIx: Record<string, Set<string>> = {
    init_escrow: new Set(['buyer']),
    buyer_cancel: new Set(['buyer']),
    seller_accept: new Set(['seller']),
    seller_reject: new Set(['seller']),
    vote: new Set(['signer']),
  };
  for (const ix of idl.instructions ?? []) {
    const names = byIx[ix.name];
    if (!names) continue;
    const walk = (accs: any[]) => {
      for (const a of accs) {
        if (a?.accounts) walk(a.accounts);
        else if (a?.name && names.has(a.name)) {
          a.signer = true;
        }
      }
    };
    walk((ix as any).accounts ?? []);
  }
}

let cached: {
  program: Program;
  connection: Connection;
  programId: PublicKey;
} | null = null;

export async function getEscrowProgram(): Promise<{
  program: Program;
  connection: Connection;
  programId: PublicKey;
}> {
  if (cached) return cached;
  const programId = getEscrowProgramId();
  const connection = new Connection(getSolanaRpcUrl(), 'confirmed');
  const dummy = {
    publicKey: PublicKey.default,
    signTransaction: async (t: Transaction) => t,
    signAllTransactions: async (ts: Transaction[]) => ts,
  };
  const provider = new AnchorProvider(connection, dummy as any, { commitment: 'confirmed' });
  const fetched = await Program.fetchIdl(programId, provider);
  if (!fetched) {
    throw new Error(
      'No on-chain IDL for this program on the current RPC. Deploy with `anchor idl init` on this cluster, or fix VITE_SOLANA_RPC_URL / VITE_ESCROW_PROGRAM_ID.'
    );
  }
  const rawIdl = JSON.parse(JSON.stringify(fetched)) as Idl;
  const idl = patchAnchor032EscrowIdl(rawIdl);
  patchIdlSignerAccounts(idl);
  (idl as any).address = programId.toBase58();
  const program = new Program(idl, provider);
  cached = { program, connection, programId };
  return cached;
}

export function clearEscrowProgramCache(): void {
  cached = null;
}

export type OnChainEscrowAccount = {
  buyer: PublicKey;
  seller: PublicKey;
  mint: PublicKey;
  status: unknown;
  /** Anchor camelCase; older layouts may use snake_case. */
  buyerVote?: unknown;
  sellerVote?: unknown;
  buyer_vote?: unknown;
  seller_vote?: unknown;
};

/** IDL is loaded at runtime; `Program<Idl>` does not expose typed `account.escrow`. */
export async function fetchEscrowAccountData(
  program: Program,
  escrowKey: PublicKey
): Promise<OnChainEscrowAccount> {
  const ns = program.account as unknown as {
    escrow: { fetch: (k: PublicKey) => Promise<OnChainEscrowAccount> };
  };
  return ns.escrow.fetch(escrowKey);
}

export function parseOnChainEscrowVotes(ed: OnChainEscrowAccount): { buyer: number; seller: number } {
  const b = ed.buyerVote ?? ed.buyer_vote;
  const s = ed.sellerVote ?? ed.seller_vote;
  return { buyer: Number(b ?? 0), seller: Number(s ?? 0) };
}

/** Both parties voted but chose different outcomes (1 vs 2) — program stays Locked until votes match. */
export function onChainVotesAreMismatched(ed: OnChainEscrowAccount): boolean {
  const { buyer, seller } = parseOnChainEscrowVotes(ed);
  return buyer !== 0 && seller !== 0 && buyer !== seller;
}

export async function isEscrowPdaAccountClosed(escrowPdaStr: string): Promise<boolean> {
  try {
    const { connection } = await getEscrowProgram();
    const info = await connection.getAccountInfo(new PublicKey(escrowPdaStr.trim()));
    return info === null;
  } catch {
    return false;
  }
}

/** Matches `smart` program `Status` enum (u8). */
export function mapChainStatusToEscrowStatus(chainStatusU8: number): EscrowStatus | null {
  switch (chainStatusU8) {
    case 1:
      return 'waiting';
    case 4:
      return 'ongoing';
    case 5:
      return 'completed';
    case 2:
    case 3:
    case 6:
      return 'cancelled';
    default:
      return null;
  }
}

/**
 * After `vote` finalizes, the program closes the escrow PDA — `fetch` fails and there is
 * no on-chain `status` byte. Infer UI status from `chain_transactions` / signing arrays.
 */
export function inferEscrowStatusWhenAccountClosed(escrow: Escrow): EscrowStatus | null {
  const ct = escrow.chainTransactions;
  if (ct?.reject || ct?.buyerCancel) return 'cancelled';
  if ((ct?.voteCancel?.length ?? 0) >= 2) return 'cancelled';
  if ((ct?.voteComplete?.length ?? 0) >= 2) return 'completed';
  if ((escrow.complete_signed_by?.length ?? 0) >= 2) return 'completed';
  if ((escrow.cancel_signed_by?.length ?? 0) >= 2) return 'cancelled';
  /**
   * PDA is already closed but we only stored one `vote_complete` sig in the app (or poll timed out
   * before the second landed). Typical successful release still closes the account — treat as completed
   * when we were in-flight on complete, not on a cancel/reject path.
   */
  if (
    escrow.status === 'ongoing' &&
    (ct?.voteComplete?.length ?? 0) >= 1 &&
    (ct?.voteCancel?.length ?? 0) < 2 &&
    !ct?.reject &&
    !ct?.buyerCancel
  ) {
    return 'completed';
  }
  return null;
}

/**
 * Poll after a vote tx: Released(5) / Returned(6), account closed, or vote mismatch.
 * Uses more attempts + slightly longer spacing so RPC/commitment lag doesn’t yield false `open`.
 */
export async function pollOnChainEscrowResolved(
  pdaStr: string,
  mode: 'complete' | 'cancel'
): Promise<'finalized' | 'mismatch' | 'open'> {
  const wantStatus = mode === 'complete' ? 5 : 6;
  const maxAttempts = 36;
  const delayMs = 400;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const { program } = await getEscrowProgram();
      const ed = await fetchEscrowAccountData(program, new PublicKey(pdaStr.trim()));
      if (onChainVotesAreMismatched(ed)) return 'mismatch';
      const s = Number(ed.status);
      if (s === wantStatus) return 'finalized';
    } catch {
      if (await isEscrowPdaAccountClosed(pdaStr)) return 'finalized';
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  if (await isEscrowPdaAccountClosed(pdaStr)) return 'finalized';
  return 'open';
}

/** When status is terminal, align app signing arrays so the dashboard matches chain reality. */
export function normalizeEscrowSigningForStatus(escrow: Escrow): Escrow {
  const b = escrow.buyer.trim();
  const s = escrow.seller.trim();
  const ct = escrow.chainTransactions;

  if (escrow.status === 'completed') {
    const signed = new Set((escrow.complete_signed_by ?? []).map((w) => w.trim()));
    if (signed.has(b) && signed.has(s)) return escrow;
    return { ...escrow, complete_signed_by: [b, s], cancel_signed_by: [] };
  }

  if (escrow.status === 'cancelled' && (ct?.voteCancel?.length ?? 0) >= 2) {
    const signed = new Set((escrow.cancel_signed_by ?? []).map((w) => w.trim()));
    if (signed.has(b) && signed.has(s)) return escrow;
    return { ...escrow, cancel_signed_by: [b, s], complete_signed_by: [] };
  }

  return escrow;
}

/**
 * If this row is linked to an on-chain USDC escrow, prefer the chain account's `status`
 * over the DB row when they disagree (fixes stale DB after a successful tx when the DB
 * update failed, e.g. missing `chain_transactions` column).
 */
export async function reconcileEscrowWithOnChainState(escrow: Escrow): Promise<Escrow> {
  if (!isOnChainEscrowConfigured()) return escrow;
  if (escrow.paymentMethod !== 'USDC' || !escrow.chainEscrowPda?.trim()) return escrow;
  const pda = escrow.chainEscrowPda.trim();
  let next: Escrow = escrow;

  try {
    const { program } = await getEscrowProgram();
    const ed = await fetchEscrowAccountData(program, new PublicKey(pda));
    const fromChain = mapChainStatusToEscrowStatus(Number(ed.status));
    if (fromChain && fromChain !== escrow.status) {
      next = { ...escrow, status: fromChain };
    }
  } catch {
    if (await isEscrowPdaAccountClosed(pda)) {
      const inferred = inferEscrowStatusWhenAccountClosed(escrow);
      if (inferred && inferred !== escrow.status) {
        next = { ...escrow, status: inferred };
      }
    }
  }

  next = normalizeEscrowSigningForStatus(next);
  const signingOnlyFix =
    next.status === escrow.status &&
    (JSON.stringify(next.complete_signed_by) !== JSON.stringify(escrow.complete_signed_by) ||
      JSON.stringify(next.cancel_signed_by) !== JSON.stringify(escrow.cancel_signed_by));

  if (next.status !== escrow.status || signingOnlyFix) {
    return next;
  }
  return escrow;
}

export type PhantomWalletLike = AnchorWalletSendLike;

/** USDC mint for the active cluster (see `getUsdcMint`). */
export function chainMintForPaymentMethod(pm: 'USDC' | 'USDT' | undefined): PublicKey | null {
  if (pm === 'USDC') return getUsdcMint();
  return null;
}

export async function chainInitEscrow(
  wallet: PhantomWalletLike,
  seller: PublicKey,
  amountUi: number,
  nonce: BN
): Promise<{ signature: string; escrowPda: string }> {
  const { program, connection, programId } = await getEscrowProgram();
  const mint = getUsdcMint();
  const buyerPk = adapterWalletPk(wallet.publicKey);
  const escrowPda = deriveEscrowPda(buyerPk, seller, nonce, programId);
  const buyerTok = tokenAta(buyerPk, mint, false);
  const vault = vaultAta(escrowPda, mint);
  const amountAtoms = atomsFromUiAmount(amountUi);

  const pre: TransactionInstruction[] = [];
  const ataInfo = await connection.getAccountInfo(buyerTok);
  if (!ataInfo) {
    pre.push(
      createAssociatedTokenAccountIdempotentInstructionWithDerivation(
        buyerPk,
        buyerPk,
        mint,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }

  const signature = await sendAnchorTransaction(
    connection,
    wallet,
    programId,
    () =>
      program.methods
        .initEscrow(seller, amountAtoms, nonce)
        .accountsStrict({
          escrow: escrowPda,
          mint,
          buyerToken: buyerTok,
          vault,
          buyer: buyerPk,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .preInstructions(pre)
        .transaction()
  );

  return { signature, escrowPda: escrowPda.toBase58() };
}

export async function chainBuyerCancel(wallet: PhantomWalletLike, escrowPdaStr: string): Promise<string> {
  const { program, connection, programId } = await getEscrowProgram();
  const escrowKey = new PublicKey(escrowPdaStr);
  const ed = await fetchEscrowAccountData(program, escrowKey);
  const mintPk = ed.mint as PublicKey;
  return sendAnchorTransaction(connection, wallet, programId, () =>
    program.methods
      .buyerCancel()
      .accounts({
        escrow: escrowKey,
        mint: mintPk,
        buyerToken: tokenAta(ed.buyer, mintPk),
        vault: vaultAta(escrowKey, mintPk),
        buyer: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .transaction()
  );
}

export async function chainSellerAccept(wallet: PhantomWalletLike, escrowPdaStr: string): Promise<string> {
  const { program, connection, programId } = await getEscrowProgram();
  const escrowKey = new PublicKey(escrowPdaStr);
  const escrowData = await fetchEscrowAccountData(program, escrowKey);
  return sendAnchorTransaction(connection, wallet, programId, () =>
    program.methods
      .sellerAccept()
      .accounts({
        escrow: escrowKey,
        seller: wallet.publicKey,
        buyer: escrowData.buyer,
        systemProgram: SystemProgram.programId,
      })
      .transaction()
  );
}

export async function chainSellerReject(wallet: PhantomWalletLike, escrowPdaStr: string): Promise<string> {
  const { program, connection, programId } = await getEscrowProgram();
  const escrowKey = new PublicKey(escrowPdaStr);
  const escrowData = await fetchEscrowAccountData(program, escrowKey);
  const mintPk = escrowData.mint as PublicKey;
  return sendAnchorTransaction(connection, wallet, programId, () =>
    program.methods
      .sellerReject()
      .accounts({
        escrow: escrowKey,
        seller: wallet.publicKey,
        mint: mintPk,
        buyerToken: tokenAta(escrowData.buyer, mintPk),
        vault: vaultAta(escrowKey, mintPk),
        buyer: escrowData.buyer,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .transaction()
  );
}

/** vote 1 = return to buyer, 2 = release to seller */
export async function chainVote(wallet: PhantomWalletLike, escrowPdaStr: string, vote: 1 | 2): Promise<string> {
  const { program, connection, programId } = await getEscrowProgram();
  const escrowKey = new PublicKey(escrowPdaStr);
  const escrowData = await fetchEscrowAccountData(program, escrowKey);
  const signerPk = adapterWalletPk(wallet.publicKey);
  const mintPk = escrowData.mint as PublicKey;
  const buyerTok = tokenAta(escrowData.buyer, mintPk);
  const sellerTok = tokenAta(escrowData.seller, mintPk);

  const pre: TransactionInstruction[] = [];
  for (const owner of [escrowData.buyer, escrowData.seller]) {
    const ata = tokenAta(owner, mintPk);
    const info = await connection.getAccountInfo(ata);
    if (!info) {
      pre.push(
        createAssociatedTokenAccountIdempotentInstructionWithDerivation(
          signerPk,
          owner,
          mintPk,
          false,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }
  }

  return sendAnchorTransaction(connection, wallet, programId, () =>
    program.methods
      .vote(vote)
      .accounts({
        escrow: escrowKey,
        mint: mintPk,
        vault: vaultAta(escrowKey, mintPk),
        buyer: escrowData.buyer,
        seller: escrowData.seller,
        buyerToken: buyerTok,
        sellerToken: sellerTok,
        signer: signerPk,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .preInstructions(pre)
      .transaction()
  );
}

export function parseNonce(chainNonce: string | undefined): BN {
  if (!chainNonce?.trim()) throw new Error('Missing on-chain nonce for this escrow');
  return new BN(chainNonce.trim(), 10);
}
