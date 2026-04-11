import { useState, useEffect, useRef, useCallback } from 'react';
import { EscrowsData, Escrow } from '../types';
import { loadUserData, saveUserData } from '../utils/storage';
import { supabase } from '../utils/supabase';
import { normalizeEscrowStatus, isActiveEscrowStatus } from '../utils/escrowStatus';
import { parseEscrowChainTransactions } from '../utils/escrowChainMeta';
import { reconcileEscrowWithOnChainState } from '../utils/escrowChain';
import { isEscrowActiveForPanel } from '../utils/escrowTradeHistory';

export function useEscrows(walletAddress: string | null) {
  const [escrowsData, setEscrowsData] = useState<EscrowsData>({
    totalAmount: 0,
    items: [],
  });
  const [loading, setLoading] = useState(true);
  const cancelledRef = useRef(false);

  const loadFromLocalStorage = useCallback((addr: string) => {
    let saved = loadUserData<EscrowsData>(addr, 'escrows');

    if (!saved || saved.items.length === 0) {
      const oldFormatKey = `escrows_${addr}`;
      const oldFormatData = localStorage.getItem(oldFormatKey);
      if (oldFormatData) {
        try {
          const oldData = JSON.parse(oldFormatData) as EscrowsData;
          if (oldData?.items?.length) {
            saved = oldData;
            saveUserData(addr, 'escrows', oldData);
            localStorage.removeItem(oldFormatKey);
          }
        } catch (e) {
          console.error('Error migrating escrows data:', e);
        }
      }
    }

    if (saved) {
      const normalizedEscrows = saved.items
        .filter((escrow) => isActiveEscrowStatus(escrow.status))
        .map((escrow) => ({
          ...escrow,
          status: normalizeEscrowStatus(escrow.status),
        }));
      const activeSum = normalizedEscrows
        .filter(isEscrowActiveForPanel)
        .reduce((sum, e) => sum + e.amount, 0);
      const normalizedData: EscrowsData = {
        totalAmount: activeSum,
        items: normalizedEscrows,
      };
      setEscrowsData(normalizedData);
      saveUserData(addr, 'escrows', normalizedData);
    } else {
      const defaultData = { totalAmount: 0, items: [] };
      setEscrowsData(defaultData);
      saveUserData(addr, 'escrows', defaultData);
    }
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    if (!walletAddress) {
      setEscrowsData({ totalAmount: 0, items: [] });
      setLoading(false);
      return;
    }

    const trimmedWallet = walletAddress.trim();

    const refreshFromSupabase = async (opts?: { silent?: boolean }) => {
      if (cancelledRef.current) return;
      const silent = opts?.silent === true;
      if (!silent) setLoading(true);
      try {
        const queryString = `buyer_wallet_address.eq.${trimmedWallet},seller_wallet_address.eq.${trimmedWallet}`;

        const { data: supabaseEscrows, error } = await supabase
          .from('escrows')
          .select('*')
          .or(queryString)
          .order('created_at', { ascending: false });

        if (cancelledRef.current) return;

        if (error) {
          if (error.code === 'PGRST205' || error.code === '42P01') {
            loadFromLocalStorage(trimmedWallet);
            return;
          }
          console.error('Error fetching escrows from Supabase:', error);
          loadFromLocalStorage(trimmedWallet);
          return;
        }

        if (supabaseEscrows && supabaseEscrows.length > 0) {
          const escrowsFromDb: Escrow[] = supabaseEscrows
            .filter((escrow: { status: string }) => isActiveEscrowStatus(escrow.status))
            .map((escrow: Record<string, unknown>) => {
              const normalizedStatus = normalizeEscrowStatus(escrow.status as string);
              return {
                id: escrow.id as string,
                buyer: String(escrow.buyer_wallet_address ?? '').trim(),
                seller: String(escrow.seller_wallet_address ?? '').trim(),
                commodity: escrow.commodity as string,
                amount: parseFloat(String(escrow.amount)),
                status: normalizedStatus,
                startDate: (escrow.created_at as string) || new Date().toISOString(),
                created_by: escrow.created_by ? String(escrow.created_by).trim() : undefined,
                paymentMethod: (escrow.payment_method as 'USDT' | 'USDC') || 'USDC',
                cancelled_by: escrow.cancelled_by ? String(escrow.cancelled_by).trim() : undefined,
                complete_signed_by: Array.isArray(escrow.complete_signed_by)
                  ? (escrow.complete_signed_by as string[]).map((w: string) => w?.trim()).filter(Boolean)
                  : [],
                cancel_signed_by: Array.isArray(escrow.cancel_signed_by)
                  ? (escrow.cancel_signed_by as string[]).map((w: string) => w?.trim()).filter(Boolean)
                  : [],
                chainNonce: escrow.chain_nonce ? String(escrow.chain_nonce).trim() : undefined,
                chainEscrowPda: escrow.chain_escrow_pda ? String(escrow.chain_escrow_pda).trim() : undefined,
                chainInitTx: escrow.chain_init_tx ? String(escrow.chain_init_tx).trim() : undefined,
                chainTransactions: (() => {
                  const ct = parseEscrowChainTransactions(escrow.chain_transactions);
                  return ct && Object.keys(ct).length > 0 ? ct : undefined;
                })(),
              };
            });

          const escrows = await Promise.all(escrowsFromDb.map((e) => reconcileEscrowWithOnChainState(e)));

          if (cancelledRef.current) return;

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

          const totalAmount = escrows
            .filter(isEscrowActiveForPanel)
            .reduce((sum, escrow) => sum + escrow.amount, 0);
          const next: EscrowsData = { totalAmount, items: escrows };
          setEscrowsData(next);
          saveUserData(trimmedWallet, 'escrows', next);
        } else {
          const emptyData: EscrowsData = { totalAmount: 0, items: [] };
          setEscrowsData(emptyData);
          saveUserData(trimmedWallet, 'escrows', emptyData);
        }
      } catch (error) {
        console.error('Error fetching escrows:', error);
        loadFromLocalStorage(trimmedWallet);
      } finally {
        if (!silent && !cancelledRef.current) setLoading(false);
      }
    };

    void refreshFromSupabase({ silent: false });

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRealtimeRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        if (!cancelledRef.current) void refreshFromSupabase({ silent: true });
      }, 400);
    };

    const channel = supabase
      .channel(`realtime:escrows:${trimmedWallet}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'escrows',
          filter: `buyer_wallet_address=eq.${trimmedWallet}`,
        },
        scheduleRealtimeRefresh
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'escrows',
          filter: `seller_wallet_address=eq.${trimmedWallet}`,
        },
        scheduleRealtimeRefresh
      )
      .subscribe();

    return () => {
      cancelledRef.current = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      void supabase.removeChannel(channel);
    };
  }, [walletAddress, loadFromLocalStorage]);

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
            onConflict: 'id',
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
    loading,
  };
}
