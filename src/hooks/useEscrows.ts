import { useState, useEffect } from 'react';
import { EscrowsData, Escrow } from '../types';
import { loadUserData, saveUserData } from '../utils/storage';
import { supabase } from '../utils/supabase';
import { normalizeEscrowStatus, isActiveEscrowStatus } from '../utils/escrowStatus';

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
        // Fetch escrows from Supabase where user is buyer or seller
        const { data: supabaseEscrows, error } = await supabase
          .from('escrows')
          .select('*')
          .or(`buyer_wallet_address.eq.${walletAddress},seller_wallet_address.eq.${walletAddress}`)
          .order('created_at', { ascending: false });

        if (error) {
          // If table doesn't exist, fall back to localStorage
          if (error.code === 'PGRST205' || error.code === '42P01') {
            console.log('Escrows table not found, using localStorage');
            loadFromLocalStorage();
            return;
          }
          console.error('Error fetching escrows from Supabase:', error);
          loadFromLocalStorage();
          return;
        }

        if (supabaseEscrows && supabaseEscrows.length > 0) {
          // Convert Supabase format to local Escrow format and normalize statuses
          const escrows: Escrow[] = supabaseEscrows
            .filter((escrow: any) => isActiveEscrowStatus(escrow.status)) // Filter out rejected only
            .map((escrow: any) => ({
              id: escrow.id,
              buyer: escrow.buyer_wallet_address,
              seller: escrow.seller_wallet_address,
              commodity: escrow.commodity,
              amount: parseFloat(escrow.amount),
              status: normalizeEscrowStatus(escrow.status), // Normalize to new status format
              startDate: escrow.created_at || new Date().toISOString(),
              created_by: escrow.created_by,
              paymentMethod: escrow.payment_method || 'USDC' // Default to USDC if not set
            }));

          const totalAmount = escrows.reduce((sum, escrow) => sum + escrow.amount, 0);
          const escrowsData: EscrowsData = {
            totalAmount,
            items: escrows
          };

          setEscrowsData(escrowsData);
          // Also save to localStorage as cache
          saveUserData(walletAddress, 'escrows', escrowsData);
        } else {
          // No escrows in Supabase, try localStorage as fallback
          loadFromLocalStorage();
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

    // Save to localStorage as cache
    saveUserData(walletAddress, 'escrows', data);

    // Sync to Supabase
    try {
      // For each escrow, update or insert in Supabase
      for (const escrow of data.items) {
        const { error } = await supabase
          .from('escrows')
          .upsert({
            id: escrow.id,
            buyer_wallet_address: escrow.buyer,
            seller_wallet_address: escrow.seller,
            commodity: escrow.commodity,
            amount: escrow.amount,
            status: escrow.status,
            duration_days: 7, // Default, can be updated if needed
            additional_notes: null,
            payment_method: escrow.paymentMethod || 'USDC',
            created_by: escrow.created_by || walletAddress,
            created_at: escrow.startDate || new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id'
          });

        if (error && error.code !== 'PGRST205' && error.code !== '42P01') {
          console.error('Error syncing escrow to Supabase:', error);
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

