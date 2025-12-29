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

    const saved = loadUserData<EscrowsData>(walletAddress, 'escrows');
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

