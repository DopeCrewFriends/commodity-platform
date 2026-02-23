import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchSOLPrice } from '../utils/coingecko';

const REFRESH_INTERVAL_MS = 60 * 1000; // 60 seconds

interface SOLPriceContextValue {
  solPrice: number;
  priceLoading: boolean;
}

const SOLPriceContext = createContext<SOLPriceContextValue | null>(null);

export function SOLPriceProvider({ children }: { children: React.ReactNode }) {
  const [solPrice, setSolPrice] = useState<number>(0);
  const [priceLoading, setPriceLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setPriceLoading(true);
      try {
        const price = await fetchSOLPrice();
        setSolPrice(price);
      } catch (error) {
        console.error('Error loading SOL price:', error);
      } finally {
        setPriceLoading(false);
      }
    };

    load();
    const interval = setInterval(load, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <SOLPriceContext.Provider value={{ solPrice, priceLoading }}>
      {children}
    </SOLPriceContext.Provider>
  );
}

export function useSOLPrice(): SOLPriceContextValue {
  const ctx = useContext(SOLPriceContext);
  if (ctx == null) {
    throw new Error('useSOLPrice must be used within SOLPriceProvider');
  }
  return ctx;
}
