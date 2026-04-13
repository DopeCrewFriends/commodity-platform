import { useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { EscrowsData, EscrowStatus, EscrowChainTransactions } from '../types';
import { useWallet } from './useWallet';
import {
  chainBuyerCancel,
  chainSellerAccept,
  chainSellerReject,
  chainVote,
  isOnChainEscrowConfigured,
  pollOnChainEscrowResolved,
} from '../utils/escrowChain';
import { isEscrowActiveForPanel } from '../utils/escrowTradeHistory';
import { normalizeEscrowSigningForStatus } from '../utils/escrowChain';

type EscrowAction = 'accept' | 'reject' | 'cancel' | 'complete' | 'sign_complete' | 'sign_cancel';

function mapEscrowItemsWithId(
  items: EscrowsData['items'],
  escrowId: string,
  patch: (e: (typeof items)[0]) => (typeof items)[0]
): EscrowsData['items'] {
  return items.map((e) => (e.id === escrowId ? patch(e) : e));
}

function useChainForEscrow(escrow: { paymentMethod?: string; chainEscrowPda?: string; chainNonce?: string }): boolean {
  return Boolean(
    isOnChainEscrowConfigured() &&
      escrow.paymentMethod === 'USDC' &&
      escrow.chainEscrowPda?.trim() &&
      escrow.chainNonce?.trim()
  );
}

const CHAIN_SIGNED: EscrowAction[] = ['accept', 'reject', 'cancel', 'sign_complete', 'sign_cancel'];

const ONCHAIN_VOTE_MISMATCH_HINT =
  'Votes still do not match on-chain. Each wallet has one vote: signing “complete” then “cancel” (or the reverse) replaces your earlier on-chain vote. Buyer and seller must both end on the same choice (both complete, or both cancel) before funds move.';

export function useEscrowChainActions(
  walletAddress: string | null,
  escrowsData: EscrowsData,
  updateEscrows: (data: EscrowsData) => void | Promise<void>
) {
  const { chainPublicKey, signTransaction, signAndSendTransaction } = useWallet();

  const handleEscrowAction = useCallback(
    async (escrowId: string, action: EscrowAction) => {
      if (!walletAddress) return;
      const escrow = escrowsData.items.find((e) => e.id === escrowId);
      if (!escrow) return;

      const me = walletAddress.trim();
      let newStatus: EscrowStatus = escrow.status;
      let cancelledBy: string | undefined;
      let completeSignedBy: string[] = escrow.complete_signed_by ?? [];
      let cancelSignedBy: string[] = escrow.cancel_signed_by ?? [];

      const chainOk = useChainForEscrow(escrow);
      const walletAdapter = chainPublicKey
        ? {
            publicKey: chainPublicKey,
            signTransaction,
            ...(signAndSendTransaction ? { signAndSendTransaction } : {}),
          }
        : null;

      let chainTransactions: EscrowChainTransactions = { ...(escrow.chainTransactions ?? {}) };

      if (chainOk && CHAIN_SIGNED.includes(action) && !walletAdapter) {
        window.alert('Connect Phantom to sign the on-chain transaction.');
        return;
      }

      if (chainOk && action === 'complete') {
        window.alert('Use “Sign to complete” (both parties) for on-chain USDC escrows.');
        return;
      }

      try {
        if (chainOk && walletAdapter) {
          const pda = escrow.chainEscrowPda!.trim();

          if (action === 'accept' && escrow.status === 'waiting') {
            const sig = await chainSellerAccept(walletAdapter, pda);
            chainTransactions = { ...chainTransactions, accept: sig };
            newStatus = 'ongoing';
          } else if (action === 'reject') {
            const sig = await chainSellerReject(walletAdapter, pda);
            chainTransactions = { ...chainTransactions, reject: sig };
            newStatus = 'cancelled';
            cancelledBy = me;
          } else if (action === 'cancel' && escrow.status === 'waiting') {
            const sig = await chainBuyerCancel(walletAdapter, pda);
            chainTransactions = { ...chainTransactions, buyerCancel: sig };
            newStatus = 'cancelled';
            cancelledBy = me;
          } else if (action === 'sign_complete') {
            const sig = await chainVote(walletAdapter, pda, 2);
            const prev = chainTransactions.voteComplete ?? [];
            chainTransactions = {
              ...chainTransactions,
              voteComplete: prev.includes(sig) ? prev : [...prev, sig],
            };
            if (!completeSignedBy.some((w) => w.trim() === me)) completeSignedBy = [...completeSignedBy, me];
            cancelSignedBy = cancelSignedBy.filter((w) => w.trim() !== me);

            const interim = mapEscrowItemsWithId(escrowsData.items, escrowId, (e) => ({
              ...e,
              complete_signed_by: completeSignedBy,
              cancel_signed_by: cancelSignedBy,
              chainTransactions: { ...chainTransactions },
              status: newStatus,
            }));
            const interimTotal = interim.filter(isEscrowActiveForPanel).reduce((sum, e) => sum + e.amount, 0);
            await updateEscrows({ totalAmount: interimTotal, items: interim });

            const poll = await pollOnChainEscrowResolved(pda, 'complete');
            if (poll === 'mismatch') {
              window.alert(ONCHAIN_VOTE_MISMATCH_HINT);
            }
            if (poll === 'finalized') {
              newStatus = 'completed';
              completeSignedBy = [escrow.buyer.trim(), escrow.seller.trim()];
              cancelSignedBy = [];
            }
          } else if (action === 'sign_cancel') {
            const sig = await chainVote(walletAdapter, pda, 1);
            const prev = chainTransactions.voteCancel ?? [];
            chainTransactions = {
              ...chainTransactions,
              voteCancel: prev.includes(sig) ? prev : [...prev, sig],
            };
            if (!cancelSignedBy.some((w) => w.trim() === me)) cancelSignedBy = [...cancelSignedBy, me];
            completeSignedBy = completeSignedBy.filter((w) => w.trim() !== me);

            const interim = mapEscrowItemsWithId(escrowsData.items, escrowId, (e) => ({
              ...e,
              complete_signed_by: completeSignedBy,
              cancel_signed_by: cancelSignedBy,
              chainTransactions: { ...chainTransactions },
              status: newStatus,
            }));
            const interimTotal = interim.filter(isEscrowActiveForPanel).reduce((sum, e) => sum + e.amount, 0);
            await updateEscrows({ totalAmount: interimTotal, items: interim });

            const poll = await pollOnChainEscrowResolved(pda, 'cancel');
            if (poll === 'mismatch') {
              window.alert(ONCHAIN_VOTE_MISMATCH_HINT);
            }
            if (poll === 'finalized') {
              newStatus = 'cancelled';
              cancelSignedBy = [escrow.buyer.trim(), escrow.seller.trim()];
              completeSignedBy = [];
              cancelledBy = me;
            }
          }
        }

        if (!chainOk) {
          if (action === 'accept') {
            if (isOnChainEscrowConfigured() && escrow.paymentMethod === 'USDC') {
              window.alert(
                'This USDC escrow is not linked on-chain (missing PDA/nonce). Create a new escrow after DB migration, or fund on-chain from the buyer wallet.'
              );
              return;
            }
            newStatus = 'ongoing';
          } else if (action === 'reject') {
            newStatus = 'cancelled';
            cancelledBy = me;
          } else if (action === 'cancel' && escrow.status === 'waiting') {
            newStatus = 'cancelled';
            cancelledBy = me;
          } else if (action === 'sign_complete') {
            if (!completeSignedBy.some((w) => w.trim() === me)) completeSignedBy = [...completeSignedBy, me];
            if (completeSignedBy.length >= 2) newStatus = 'completed';
          } else if (action === 'sign_cancel') {
            if (!cancelSignedBy.some((w) => w.trim() === me)) cancelSignedBy = [...cancelSignedBy, me];
            if (cancelSignedBy.length >= 2) newStatus = 'cancelled';
          } else if (action === 'complete') {
            newStatus = 'completed';
          }
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        window.alert(`Transaction failed:\n\n${msg}`);
        return;
      }

      const basePayload: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };
      if (cancelledBy !== undefined) basePayload.cancelled_by = cancelledBy;
      if (action === 'sign_complete' || action === 'sign_cancel') {
        basePayload.complete_signed_by = completeSignedBy;
        basePayload.cancel_signed_by = cancelSignedBy;
      }
      if (chainOk && Object.keys(chainTransactions).length > 0) {
        basePayload.chain_transactions = chainTransactions;
      }

      try {
        const { error } = await supabase.from('escrows').update(basePayload).eq('id', escrowId);
        if (error && error.code !== 'PGRST205' && error.code !== '42P01') {
          console.warn('Error updating escrow in Supabase:', error);
        }
      } catch {
        /* ignore */
      }

      const updatedEscrows = escrowsData.items.map((e) => {
        if (e.id !== escrowId) return e;
        const merged = {
          ...e,
          status: newStatus,
          cancelled_by: cancelledBy ?? e.cancelled_by,
          complete_signed_by: completeSignedBy,
          cancel_signed_by: cancelSignedBy,
          chainTransactions: chainOk ? chainTransactions : e.chainTransactions,
        };
        return normalizeEscrowSigningForStatus(merged);
      });

      const totalAmount = updatedEscrows
        .filter(isEscrowActiveForPanel)
        .reduce((sum, e) => sum + e.amount, 0);

      await updateEscrows({ totalAmount, items: updatedEscrows });
    },
    [walletAddress, escrowsData, updateEscrows, chainPublicKey, signTransaction, signAndSendTransaction]
  );

  return handleEscrowAction;
}
