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
        console.log(`🔍 Fetching escrows for wallet: ${walletAddress}`);
        console.log(`   Wallet address length: ${walletAddress.length}, trimmed: "${walletAddress.trim()}"`);
        
        // Fetch escrows from Supabase where user is buyer or seller
        // Use exact match with trimmed addresses to avoid whitespace issues
        const trimmedWallet = walletAddress.trim();
        const queryString = `buyer_wallet_address.eq.${trimmedWallet},seller_wallet_address.eq.${trimmedWallet}`;
        console.log(`   Query string: ${queryString}`);
        
        const { data: supabaseEscrows, error } = await supabase
          .from('escrows')
          .select('*')
          .or(queryString)
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
          console.log(`✅ Fetched ${supabaseEscrows.length} escrows from Supabase`);
          console.log('Raw escrows from Supabase:', supabaseEscrows.map((e: any) => ({ id: e.id, status: e.status, buyer: e.buyer_wallet_address, seller: e.seller_wallet_address })));
          
          // Convert Supabase format to local Escrow format and normalize statuses
          const escrows: Escrow[] = supabaseEscrows
            .filter((escrow: any) => {
              const isActive = isActiveEscrowStatus(escrow.status);
              if (!isActive) {
                console.log(`❌ Filtered out escrow ${escrow.id} with status: ${escrow.status}`);
              } else {
                console.log(`✅ Keeping escrow ${escrow.id} with status: ${escrow.status} (normalized to: ${normalizeEscrowStatus(escrow.status)})`);
              }
              return isActive;
            }) // Filter out rejected only
            .map((escrow: any) => {
              const normalizedStatus = normalizeEscrowStatus(escrow.status);
              return {
                id: escrow.id,
                buyer: escrow.buyer_wallet_address?.trim() || escrow.buyer_wallet_address,
                seller: escrow.seller_wallet_address?.trim() || escrow.seller_wallet_address,
                commodity: escrow.commodity,
                amount: parseFloat(escrow.amount),
                status: normalizedStatus, // Normalize to new status format
                startDate: escrow.created_at || new Date().toISOString(),
                created_by: escrow.created_by?.trim() || escrow.created_by,
                paymentMethod: escrow.payment_method || 'USDC' // Default to USDC if not set
              };
            });

          console.log(`✅ Processed ${escrows.length} active escrows (after filtering)`);
          console.log('Final escrows:', escrows.map(e => ({ id: e.id, status: e.status })));
          const totalAmount = escrows.reduce((sum, escrow) => sum + escrow.amount, 0);
          const escrowsData: EscrowsData = {
            totalAmount,
            items: escrows
          };

          setEscrowsData(escrowsData);
          // Also save to localStorage as cache
          saveUserData(walletAddress, 'escrows', escrowsData);
        } else {
          console.log('⚠️ No escrows found in Supabase, trying localStorage fallback');
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

    console.log(`📝 updateEscrows called with ${data.items.length} escrows`);
    console.log('Escrows to sync:', data.items.map(e => ({ id: e.id, status: e.status, buyer: e.buyer, seller: e.seller })));

    // Save to localStorage as cache
    saveUserData(walletAddress, 'escrows', data);

    // Sync to Supabase
    try {
      // For each escrow, update or insert in Supabase
      for (const escrow of data.items) {
        const upsertData = {
          id: escrow.id,
          buyer_wallet_address: escrow.buyer.trim(),
          seller_wallet_address: escrow.seller.trim(),
          commodity: escrow.commodity,
          amount: escrow.amount,
          status: escrow.status, // Ensure status is saved correctly
          duration_days: 7, // Default, can be updated if needed
          additional_notes: null,
          payment_method: escrow.paymentMethod || 'USDC',
          created_by: (escrow.created_by || walletAddress).trim(),
          created_at: escrow.startDate || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        console.log(`🔄 Upserting escrow ${escrow.id} with status: ${escrow.status}`, upsertData);
        
        const { data: upsertedData, error } = await supabase
          .from('escrows')
          .upsert(upsertData, {
            onConflict: 'id'
          })
          .select()
          .single();

        if (error) {
          if (error.code === 'PGRST205' || error.code === '42P01') {
            console.log(`⚠️ Escrows table not found, skipping sync for ${escrow.id}`);
          } else {
            console.error(`❌ Error syncing escrow ${escrow.id} to Supabase:`, error);
            console.error(`   Error code: ${error.code}, Message: ${error.message}`);
            console.error(`   Error details:`, error);
            // Try to fetch the escrow to see if it exists
            const { data: existingEscrow } = await supabase
              .from('escrows')
              .select('*')
              .eq('id', escrow.id)
              .single();
            if (existingEscrow) {
              console.log(`   ⚠️ Escrow ${escrow.id} exists in Supabase with status: ${existingEscrow.status}`);
            }
          }
        } else if (upsertedData) {
          console.log(`✅ Successfully synced escrow ${escrow.id} to Supabase with status: ${upsertedData.status}`);
          // Verify the status was saved correctly
          if (upsertedData.status !== escrow.status) {
            console.warn(`   ⚠️ Status mismatch! Expected: ${escrow.status}, Got: ${upsertedData.status}`);
          }
        } else {
          console.warn(`⚠️ Upsert returned no data for escrow ${escrow.id}`);
        }
      }
    } catch (error) {
      console.error('❌ Error syncing escrows to Supabase:', error);
    }
  };

  return {
    escrowsData,
    updateEscrows,
    loading
  };
}

