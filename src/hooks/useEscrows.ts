import { useState, useEffect } from 'react';
import { EscrowsData } from '../types';
import { loadUserData, saveUserData } from '../utils/storage';

export function useEscrows(walletAddress: string | null) {
  const [escrowsData, setEscrowsData] = useState<EscrowsData>({
    totalAmount: 0,
    items: []
  });

  useEffect(() => {
    if (!walletAddress) {
      setEscrowsData({ totalAmount: 0, items: [] });
      return;
    }

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
      setEscrowsData(saved);
    } else {
      const defaultData = { totalAmount: 0, items: [] };
      setEscrowsData(defaultData);
      saveUserData(walletAddress, 'escrows', defaultData);
    }
  }, [walletAddress]);

  const updateEscrows = (data: EscrowsData) => {
    setEscrowsData(data);
    if (walletAddress) {
      saveUserData(walletAddress, 'escrows', data);
    }
  };

  return {
    escrowsData,
    updateEscrows
  };
}

