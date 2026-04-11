/**
 * Legacy Anchor tx signing + Phantom quirks (3010 / fee-payer merge).
 */
import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  SendTransactionError,
  ComputeBudgetProgram,
  Message,
  Connection,
  type SendOptions,
} from '@solana/web3.js';
import bs58 from 'bs58';
import { Buffer } from 'buffer';

export function getEscrowProgramId(): PublicKey {
  const raw = import.meta.env.VITE_ESCROW_PROGRAM_ID?.trim();
  if (!raw) throw new Error('VITE_ESCROW_PROGRAM_ID is not set');
  return new PublicKey(raw);
}

export function canonicalPk(p: PublicKey): PublicKey {
  try {
    return new PublicKey(Buffer.from(p.toBytes()));
  } catch {
    return new PublicKey(p.toBase58());
  }
}

export function adapterWalletPk(pk: PublicKey): PublicKey {
  return new PublicKey(Buffer.from(pk.toBytes()));
}

function isLegacyTransaction(tx: unknown): tx is Transaction {
  return (
    tx != null &&
    typeof (tx as Transaction).serialize === 'function' &&
    typeof (tx as Transaction).partialSign === 'function'
  );
}

/** First populated signature on a legacy `Transaction` (after wallet sign). */
function getLegacyTxSignatureBase58(tx: Transaction): string | null {
  const pairs = (tx as Transaction & { signatures?: { signature: Buffer | null }[] }).signatures;
  if (!pairs?.length) return null;
  const raw = pairs[0]?.signature;
  if (!raw || raw.length === 0) return null;
  if (Buffer.from(raw).every((b) => b === 0)) return null;
  return bs58.encode(raw);
}

function looksLikeAlreadyProcessedError(err: unknown): boolean {
  const s = err instanceof Error ? err.message : String(err);
  return /already\s+been\s+processed|already\s+processed/i.test(s);
}

function isUserRejectedWalletError(err: unknown): boolean {
  if (err == null) return false;
  const o = err as { code?: number; message?: string };
  if (o.code === 4001) return true;
  const m = (typeof o.message === 'string' ? o.message : String(err)).toLowerCase();
  return /user rejected|rejected the request|request rejected|cancelled|canceled|denied|disapproved/.test(m);
}

async function pollTransactionLanded(connection: Connection, signature: string): Promise<boolean> {
  for (let i = 0; i < 10; i++) {
    try {
      const got = await connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });
      if (got) return true;
    } catch {
      /* ignore */
    }
    await new Promise((r) => setTimeout(r, 350));
  }
  return false;
}

const INIT_ESCROW_DISCRIMINATOR = Buffer.from([70, 46, 40, 23, 6, 11, 81, 139]);
const INIT_ESCROW_MIN_ACCOUNTS = 8;

function normalizeTransactionPubkeys(tx: Transaction): void {
  for (let i = 0; i < tx.instructions.length; i++) {
    const ix = tx.instructions[i];
    tx.instructions[i] = new TransactionInstruction({
      programId: canonicalPk(ix.programId),
      keys: ix.keys.map((m) => ({
        pubkey: canonicalPk(m.pubkey),
        isSigner: m.isSigner,
        isWritable: m.isWritable,
      })),
      data: ix.data,
    });
  }
  if (tx.feePayer) tx.feePayer = canonicalPk(tx.feePayer);
}

function markPubkeySignerInAllInstructions(tx: Transaction, signer: PublicKey): void {
  const want = signer.toBase58();
  const signerPk = canonicalPk(signer);
  for (let i = 0; i < tx.instructions.length; i++) {
    const ix = tx.instructions[i];
    const keys = ix.keys.map((meta) =>
      meta.pubkey.toBase58() === want
        ? { pubkey: signerPk, isSigner: true, isWritable: meta.isWritable }
        : meta
    );
    tx.instructions[i] = new TransactionInstruction({
      programId: ix.programId,
      keys,
      data: ix.data,
    });
  }
}

function assertPubkeyInCompiledSigners(tx: Transaction, signer: PublicKey): void {
  const msg = tx.compileMessage();
  const n = msg.header.numRequiredSignatures;
  const signerSet = new Set(msg.accountKeys.slice(0, n).map((k) => k.toBase58()));
  const want = signer.toBase58();
  if (!signerSet.has(want)) {
    throw new Error(
      `Wallet ${want} is not a required signer on this transaction (required: ${[...signerSet].join(', ')}).`
    );
  }
}

function patchInitEscrowBuyerAccount(tx: Transaction, buyer: PublicKey, programId: PublicKey): void {
  const pid = programId.toBase58();
  const want = buyer.toBase58();
  const buyerPk = canonicalPk(buyer);
  for (let i = 0; i < tx.instructions.length; i++) {
    const ix = tx.instructions[i];
    if (ix.programId.toBase58() !== pid || ix.data.length < 8) continue;
    const disc = Buffer.from(ix.data.subarray(0, 8));
    if (!disc.equals(INIT_ESCROW_DISCRIMINATOR)) continue;
    if (ix.keys.length < INIT_ESCROW_MIN_ACCOUNTS) continue;
    const keys = ix.keys.map((meta, j) =>
      j === 0 || meta.pubkey.toBase58() === want
        ? { pubkey: buyerPk, isSigner: true, isWritable: true }
        : { pubkey: meta.pubkey, isSigner: meta.isSigner, isWritable: meta.isWritable }
    );
    tx.instructions[i] = new TransactionInstruction({
      programId: canonicalPk(ix.programId),
      keys,
      data: ix.data,
    });
    return;
  }
}

/** Solana per-tx compute ceiling; init_escrow + ATA + CPI needs a high cap or wallet sim often reverts with no balance preview. */
const ANCHOR_TX_COMPUTE_UNIT_LIMIT = 1_400_000;

/**
 * Always set a high compute-unit **limit** so Phantom’s simulator (and RPC simulate) do not hit the default
 * low ceiling and return “reverted during simulation” while the same tx can still land after the wallet adds fees.
 * We intentionally do **not** set a dapp `SetComputeUnitPrice` unless `VITE_ANCHOR_TX_COMPUTE_UNIT_PRICE_MICRO_LAMPORTS`
 * is set, so Phantom can attach its own priority-fee logic when it wants to.
 */
function prependComputeBudgetIfMissing(tx: Transaction): void {
  const cu = ComputeBudgetProgram.programId.toBase58();
  if (tx.instructions.some((ix) => ix.programId.toBase58() === cu)) return;

  const rawPrice = import.meta.env.VITE_ANCHOR_TX_COMPUTE_UNIT_PRICE_MICRO_LAMPORTS?.trim();
  const microLamports = rawPrice && rawPrice !== '' ? Number(rawPrice) : NaN;
  const withPrice = Number.isFinite(microLamports) && microLamports > 0;

  if (withPrice) {
    tx.instructions.unshift(
      ComputeBudgetProgram.setComputeUnitLimit({ units: ANCHOR_TX_COMPUTE_UNIT_LIMIT }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: Math.floor(microLamports) })
    );
  } else {
    tx.instructions.unshift(ComputeBudgetProgram.setComputeUnitLimit({ units: ANCHOR_TX_COMPUTE_UNIT_LIMIT }));
  }
}

function applySignerPatches(tx: Transaction, signerPk: PublicKey, programId: PublicKey): void {
  normalizeTransactionPubkeys(tx);
  markPubkeySignerInAllInstructions(tx, signerPk);
  patchInitEscrowBuyerAccount(tx, signerPk, programId);
  markPubkeySignerInAllInstructions(tx, signerPk);
  assertPubkeyInCompiledSigners(tx, signerPk);
}

function assertInitEscrowBuyerInMessage(msg: Message, buyer: PublicKey, programId: PublicKey): void {
  const want = buyer.toBase58();
  const progWant = programId.toBase58();
  for (const cix of msg.instructions) {
    const prog = msg.accountKeys[cix.programIdIndex];
    if (prog.toBase58() !== progWant) continue;
    let raw: Buffer;
    try {
      raw = Buffer.from(bs58.decode(cix.data));
    } catch {
      continue;
    }
    if (raw.length < 8 || !raw.subarray(0, 8).equals(INIT_ESCROW_DISCRIMINATOR)) continue;
    if (cix.accounts.length < INIT_ESCROW_MIN_ACCOUNTS) {
      throw new Error(`Packed message: InitEscrow has fewer than ${INIT_ESCROW_MIN_ACCOUNTS} accounts.`);
    }
    const buyerIdx = cix.accounts[0];
    const at = msg.accountKeys[buyerIdx].toBase58();
    if (at !== want) {
      throw new Error(`Packed message: InitEscrow account[0] is ${at}, expected connected wallet ${want}.`);
    }
    if (!msg.isAccountSigner(buyerIdx)) {
      throw new Error(
        `Packed message: InitEscrow buyer is not a required signer (global index ${buyerIdx}).`
      );
    }
    if (msg.accountKeys[0].toBase58() !== want) {
      throw new Error(
        `Packed message: fee payer is ${msg.accountKeys[0].toBase58()}, expected ${want}.`
      );
    }
    return;
  }
}

function appendPhantomChainHint(rpcEndpoint: string, body: string): string {
  if (body.includes('Simulation failed (RPC')) return body;
  const t = body.trim();
  const vague = t.length < 55 || /unexpected error|unknown error/i.test(t);
  if (!vague) return body;
  const ep = rpcEndpoint.toLowerCase();
  const looksDevnet = ep.includes('devnet') || ep.includes('testnet');
  const hint = looksDevnet
    ? 'Wallet/RPC hint: use Phantom on Devnet and an RPC URL that targets devnet.\n' + `Current RPC: ${rpcEndpoint}`
    : 'Wallet/RPC hint: use Phantom on Mainnet and a mainnet-beta RPC that matches this app.\n' +
      `Current RPC: ${rpcEndpoint}`;
  return body.trim() ? `${body}\n\n${hint}` : hint;
}

function formatTxFailure(err: unknown, rpcEndpoint: string): string {
  const parts: string[] = [];
  const seen = new Set<string>();
  const push = (s?: string | null) => {
    const t = s?.trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    parts.push(t);
  };
  const visit = (e: unknown, depth: number) => {
    if (e == null || depth > 8) return;
    if (e instanceof Error) push(e.message);
    if (e instanceof SendTransactionError) {
      push(e.transactionError.message);
      if (e.logs?.length) push(e.logs.slice(-25).join('\n'));
    }
    if (typeof e === 'object' && e !== null) {
      const o = e as Record<string, unknown>;
      if (typeof o.message === 'string') push(o.message);
      if (Array.isArray(o.logs)) push((o.logs as string[]).slice(-25).join('\n'));
      if ('cause' in o && o.cause !== e) visit(o.cause, depth + 1);
    }
  };
  visit(err, 0);
  const raw =
    parts.length > 0 ? parts.join('\n\n') : 'Transaction failed. Check the browser console.';
  return appendPhantomChainHint(rpcEndpoint, raw);
}

export type SignTransactionFn = (tx: Transaction) => Promise<Transaction>;

/** Wallet surface for Anchor sends — optional `signAndSendTransaction` uses Phantom’s combined path (often cleaner previews). */
export type AnchorWalletSendLike = {
  publicKey: PublicKey;
  signTransaction: SignTransactionFn;
  signAndSendTransaction?: (tx: Transaction, opts?: SendOptions) => Promise<{ signature: string } | string>;
};

function normalizeSignAndSendResult(result: { signature: string } | string): string {
  return typeof result === 'string' ? result : result.signature;
}

/**
 * Same family of check Phantom uses for previews. If this fails, Phantom will almost always show
 * “reverted during simulation” — fail fast with logs so users fix funding/program issues before the wallet UI.
 */
async function assertRpcSimulationOk(connection: Connection, tx: Transaction): Promise<void> {
  if (import.meta.env.VITE_SKIP_ANCHOR_TX_SIMULATE === 'true') return;
  // Legacy overload `(tx, signers?, includeAccounts?)`: use `undefined` signers (not `[]` — [] is truthy and breaks signing).
  const v = await connection.simulateTransaction(tx, undefined, false);
  if (v.value.err) {
    const logs = v.value.logs?.length ? v.value.logs.slice(-45).join('\n') : '(no logs returned)';
    throw new Error(
      `Transaction would fail on-chain (RPC simulation). Phantom hides balance lines when this happens.\n\nError: ${JSON.stringify(v.value.err)}\n\nProgram logs (last lines):\n${logs}`
    );
  }
  if (import.meta.env.DEV) {
    let host = connection.rpcEndpoint;
    try {
      host = new URL(connection.rpcEndpoint).hostname;
    } catch {
      /* keep raw */
    }
    const wire = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
    if (wire.length > 1100) {
      console.warn(
        `[anchorTx] Transaction wire size ${wire.length} bytes (max 1232). Phantom may show a bad simulation preview if it cannot adjust fees.`
      );
    }
    console.info(
      `[anchorTx] App RPC simulate OK (host: ${host})` +
        (v.value.unitsConsumed != null ? `, units consumed: ${v.value.unitsConsumed}` : '') +
        '. Phantom simulates separately; a red banner can still appear when RPCs disagree.'
    );
  }
}

export async function sendAnchorTransaction(
  connection: Connection,
  wallet: AnchorWalletSendLike,
  programId: PublicKey,
  buildTx: () => Promise<Transaction>
): Promise<string> {
  const signerPk = adapterWalletPk(wallet.publicKey);

  const prepareTx = async (): Promise<Transaction> => {
    const tx = await buildTx();
    if (!isLegacyTransaction(tx)) throw new Error('Expected a legacy Solana transaction from Anchor');
    prependComputeBudgetIfMissing(tx);
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    tx.feePayer = signerPk;
    tx.recentBlockhash = blockhash;
    applySignerPatches(tx, signerPk, programId);
    assertInitEscrowBuyerInMessage(tx.compileMessage(), signerPk, programId);
    return tx;
  };

  const sendOpts: SendOptions = {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
    maxRetries: 0,
  };

  const rpcEp = connection.rpcEndpoint;
  let tx = await prepareTx();
  await assertRpcSimulationOk(connection, tx);

  const skipWalletSignAndSend =
    import.meta.env.VITE_ANCHOR_SIGN_THEN_SENDRAW_ONLY === 'true';

  if (wallet.signAndSendTransaction && !skipWalletSignAndSend) {
    try {
      if (import.meta.env.DEV) {
        console.info(
          '[anchorTx] Calling wallet.signAndSendTransaction — if Phantom shows "reverted during simulation" but this session logged "App RPC simulate OK", align Phantom’s cluster RPC with your app or treat the banner as a false negative.'
        );
      }
      const raw = await wallet.signAndSendTransaction(tx, sendOpts);
      const sig = normalizeSignAndSendResult(raw);
      try {
        await connection.confirmTransaction(sig, 'confirmed');
      } catch (confirmErr) {
        // Wallet already submitted; do not fall back to signTransaction (second Phantom popup).
        if (await pollTransactionLanded(connection, sig)) {
          await connection.confirmTransaction(sig, 'confirmed').catch(() => {});
          return sig;
        }
        throw new Error(
          `Transaction was sent (signature ${sig}) but confirmation timed out. Check Solscan — do not submit again from the wallet prompt. Underlying: ${confirmErr instanceof Error ? confirmErr.message : String(confirmErr)}`
        );
      }
      return sig;
    } catch (e) {
      if (isUserRejectedWalletError(e)) {
        throw e instanceof Error ? e : new Error(String(e));
      }
      console.warn(
        '[sendAnchorTransaction] signAndSendTransaction failed; falling back to sign + sendRawTransaction.',
        e
      );
      tx = await prepareTx();
      await assertRpcSimulationOk(connection, tx);
    }
  }

  let signature: string;
  let signed: Transaction | undefined;
  try {
    signed = await wallet.signTransaction(tx);
    assertInitEscrowBuyerInMessage(signed.compileMessage(), signerPk, programId);
    signature = await connection.sendRawTransaction(signed.serialize(), sendOpts);
  } catch (e) {
    let simLogs = '';
    if (e instanceof SendTransactionError) {
      try {
        const logs = await e.getLogs(connection);
        if (logs?.length) simLogs = '\n\n' + logs.slice(-30).join('\n');
      } catch {
        /* ignore */
      }
    }
    // Phantom / RPC sometimes report "already processed" on preflight even when the tx landed
    // (double-send, retry, or wallet edge case). If we find it on-chain, treat as success.
    if (signed && looksLikeAlreadyProcessedError(e)) {
      const maybeSig = getLegacyTxSignatureBase58(signed);
      if (maybeSig && (await pollTransactionLanded(connection, maybeSig))) {
        console.info('[sendAnchorTransaction] Recovered: tx already on-chain', maybeSig);
        await connection.confirmTransaction(maybeSig, 'confirmed').catch(() => {});
        return maybeSig;
      }
    }
    throw new Error(formatTxFailure(e, rpcEp) + simLogs);
  }
  await connection.confirmTransaction(signature, 'confirmed');
  return signature;
}

export { SystemProgram };
