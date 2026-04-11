import { useState, useEffect } from 'react';
import { EscrowsData, Escrow } from '../types';
import { loadUserData, saveUserData } from '../utils/storage';
import { supabase } from '../utils/supabase';
import { normalizeEscrowStatus, isActiveEscrowStatus } from '../utils/escrowStatus';
import { parseEscrowChainTransactions } from '../utils/escrowChainMeta';
import { reconcileEscrowWithOnChainState } from '../utils/escrowChain';

export function useEscrows(walletAddress: string | null) {
  const [escrowsData, setEscrowsData] = useState<EscrowsData>({
    totalAmount: 0,
    items: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!walletAddress) {
      setEscrowsData({ totalAmount: 0, items: [] });
      setLoading(false);
      return;
    }

    const fetchEscrows = async () => {
      setLoading(true);
      try {
        const trimmedWallet = walletAddress.trim();
        const queryString = `buyer_wallet_address.eq.${trimmedWallet},seller_wallet_address.eq.${trimmedWallet}`;

        const { data: supabaseEscrows, error } = await supabase
          .from('escrows')
          .select('*')
          .or(queryString)
          .order('created_at', { ascending: false });

        if (error) {
          if (error.code === 'PGRST205' || error.code === '42P01') {
            loadFromLocalStorage();
            return;
          }
          console.error('Error fetching escrows from Supabase:', error);
          loadFromLocalStorage();
          return;
        }

        if (supabaseEscrows && supabaseEscrows.length > 0) {
          const escrowsFromDb: Escrow[] = supabaseEscrows
            .filter((escrow: any) => isActiveEscrowStatus(escrow.status))
            .map((escrow: any) => {
              const normalizedStatus = normalizeEscrowStatus(escrow.status);
              return {
                id: escrow.id,
                buyer: escrow.buyer_wallet_address?.trim() || escrow.buyer_wallet_address,
                seller: escrow.seller_wallet_address?.trim() || escrow.seller_wallet_address,
                commodity: escrow.commodity,
                amount: parseFloat(escrow.amount),
                status: normalizedStatus,
                startDate: escrow.created_at || new Date().toISOString(),
                created_by: escrow.created_by?.trim() || escrow.created_by,
                paymentMethod: escrow.payment_method || 'USDC',
                cancelled_by: escrow.cancelled_by?.trim() || escrow.cancelled_by,
                complete_signed_by: Array.isArray(escrow.complete_signed_by) ? escrow.complete_signed_by.map((w: string) => w?.trim()).filter(Boolean) : [],
                cancel_signed_by: Array.isArray(escrow.cancel_signed_by) ? escrow.cancel_signed_by.map((w: string) => w?.trim()).filter(Boolean) : [],
                chainNonce: escrow.chain_nonce?.trim() || undefined,
                chainEscrowPda: escrow.chain_escrow_pda?.trim() || undefined,
                chainInitTx: escrow.chain_init_tx?.trim() || undefined,
                chainTransactions: (() => {
                  const ct = parseEscrowChainTransactions(escrow.chain_transactions);
                  return ct && Object.keys(ct).length > 0 ? ct : undefined;
                })(),
              };
            });

          const escrows = await Promise.all(escrowsFromDb.map((e) => reconcileEscrowWithOnChainState(e)));

          for (let i = 0; i < escrows.length; i++) {
            if (escrows[i].status !== escrowsFromDb[i].status) {
              const { error: syncErr } = await supabase
                .from('escrows')
                .update({ status: escrows[i].status, updated_at: new Date().toISOString() })
                .eq('id', escrows[i].id);
              if (syncErr && syncErr.code !== 'PGRST205' && syncErr.code !== '42P01') {
                console.warn('Could not sync reconciled escrow status to Supabase:', escrows[i].id, syncErr);
              }
            }
          }

          const totalAmount = escrows.reduce((sum, escrow) => sum + escrow.amount, 0);
          const escrowsData: EscrowsData = {
            totalAmount,
            items: escrows
          };

          setEscrowsData(escrowsData);
          saveUserData(walletAddress, 'escrows', escrowsData);
        } else {
          // Supabase returned empty: use empty state and overwrite cache (don't use stale localStorage)
          const emptyData: EscrowsData = { totalAmount: 0, items: [] };
          setEscrowsData(emptyData);
          saveUserData(walletAddress, 'escrows', emptyData);
        }
      } catch (error) {
        console.error('Error fetching escrows:', error);
        loadFromLocalStorage();
      } finally {
        setLoading(false);
      }
    };

    const loadFromLocalStorage = () => {
      // Try loading from new format first
      let saved = loadUserData<EscrowsData>(walletAddress, 'escrows');
      
      // If not found, try old format and migrate
      if (!saved || saved.items.length === 0) {
        const oldFormatKey = `escrows_${walletAddress}`;
        const oldFormatData = localStorage.getItem(oldFormatKey);
        if (oldFormatData) {
          try {
            const oldData = JSON.parse(oldFormatData) as EscrowsData;
            if (oldData && oldData.items && oldData.items.length > 0) {
              // Migrate to new format
              saved = oldData;
              saveUserData(walletAddress, 'escrows', oldData);
              // Remove old format
              localStorage.removeItem(oldFormatKey);
            }
          } catch (e) {
            console.error('Error migrating escrows data:', e);
          }
        }
      }
      
      if (saved) {
        // Normalize statuses in saved data
        const normalizedEscrows = saved.items
          .filter(escrow => isActiveEscrowStatus(escrow.status))
          .map(escrow => ({
            ...escrow,
            status: normalizeEscrowStatus(escrow.status)
          }));
        const normalizedData: EscrowsData = {
          totalAmount: normalizedEscrows.reduce((sum, e) => sum + e.amount, 0),
          items: normalizedEscrows
        };
        setEscrowsData(normalizedData);
        // Save normalized data back
        saveUserData(walletAddress, 'escrows', normalizedData);
      } else {
        const defaultData = { totalAmount: 0, items: [] };
        setEscrowsData(defaultData);
        saveUserData(walletAddress, 'escrows', defaultData);
      }
    };

    fetchEscrows();
  }, [walletAddress]);

  const updateEscrows = async (data: EscrowsData) => {
    setEscrowsData(data);
    if (!walletAddress) return;

    saveUserData(walletAddress, 'escrows', data);

    try {
      for (const escrow of data.items) {
        const upsertData: Record<string, unknown> = {
          id: escrow.id,
          buyer_wallet_address: escrow.buyer.trim(),
          seller_wallet_address: escrow.seller.trim(),
          commodity: escrow.commodity,
          amount: escrow.amount,
          status: escrow.status,
          duration_days: 7,
          additional_notes: null,
          payment_method: escrow.paymentMethod || 'USDC',
          created_by: (escrow.created_by || walletAddress).trim(),
          created_at: escrow.startDate || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        if (escrow.chainNonce != null) upsertData.chain_nonce = escrow.chainNonce;
        if (escrow.chainEscrowPda != null) upsertData.chain_escrow_pda = escrow.chainEscrowPda;
        if (escrow.chainInitTx != null) upsertData.chain_init_tx = escrow.chainInitTx;

        const { error } = await supabase
          .from('escrows')
          .upsert(upsertData, {
            onConflict: 'id'
          })
          .select()
          .single();

        if (error && error.code !== 'PGRST205' && error.code !== '42P01') {
          console.error('Error syncing escrow to Supabase:', error);
        } else if (escrow.chainTransactions != null && Object.keys(escrow.chainTransactions).length > 0) {
          const { error: txErr } = await supabase
            .from('escrows')
            .update({
              chain_transactions: escrow.chainTransactions,
              updated_at: new Date().toISOString(),
            })
            .eq('id', escrow.id);
          if (txErr && txErr.code !== 'PGRST205' && txErr.code !== '42P01') {
            console.warn('chain_transactions sync failed (row may still be correct):', escrow.id, txErr);
          }
        }
      }
    } catch (error) {
      console.error('Error syncing escrows to Supabase:', error);
    }
  };

  return {
    escrowsData,
    updateEscrows,
    loading
  };
}

