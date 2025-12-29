import { useState, useEffect } from 'react';
import { TradeHistory } from '../types';
import { loadUserData, saveUserData } from '../utils/storage';

export function useTradeHistory(walletAddress: string | null) {
  const [tradeHistory, setTradeHistory] = useState<TradeHistory>({
    completed: [],
    ongoing: [],
    unsuccessful: []
  });
  const [activeFilter, setActiveFilter] = useState<'completed' | 'ongoing' | 'unsuccessful'>('completed');

  useEffect(() => {
    if (!walletAddress) {
      setTradeHistory({ completed: [], ongoing: [], unsuccessful: [] });
      return;
    }

    const saved = loadUserData<TradeHistory>(walletAddress, 'tradeHistory');
    if (saved) {
      setTradeHistory(saved);
    } else {
      const defaultData = { completed: [], ongoing: [], unsuccessful: [] };
      setTradeHistory(defaultData);
      saveUserData(walletAddress, 'tradeHistory', defaultData);
    }
  }, [walletAddress]);

  const updateTradeHistory = (data: TradeHistory) => {
    setTradeHistory(data);
    if (walletAddress) {
      saveUserData(walletAddress, 'tradeHistory', data);
    }
  };

  return {
    tradeHistory,
    activeFilter,
    setActiveFilter,
    updateTradeHistory
  };
}

