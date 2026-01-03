import { useState, useEffect } from 'react';
import { fetchSOLBalance, fetchUSDCBalance, fetchUSDTBalance } from '../utils/solana';
import { fetchSOLPrice } from '../utils/coingecko';
import { TokenBalance } from '../types';

export function useBalances(walletAddress: string | null) {
  const [balances, setBalances] = useState<TokenBalance>({
    SOL: { amount: 0 },
    USDC: { amount: 0 },
    USDT: { amount: 0 }
  });
  const [solPrice, setSolPrice] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);

  // Fetch SOL price on mount and periodically
  useEffect(() => {
    const loadSOLPrice = async () => {
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

    loadSOLPrice();
    // Refresh price every 60 seconds
    const priceInterval = setInterval(loadSOLPrice, 60000);

    return () => clearInterval(priceInterval);
  }, []);

  useEffect(() => {
    if (!walletAddress) {
      setBalances({ SOL: { amount: 0 }, USDC: { amount: 0 }, USDT: { amount: 0 } });
      return;
    }

    let isMounted = true; // Track if component is still mounted

    const loadBalances = async () => {
      setLoading(true);
      try {
        const [solBalance, usdcBalance, usdtBalance] = await Promise.all([
          fetchSOLBalance(walletAddress),
          fetchUSDCBalance(walletAddress),
          fetchUSDTBalance(walletAddress)
        ]);

        // Only update state if component is still mounted
        if (isMounted) {
        setBalances({
          SOL: { amount: solBalance },
            USDC: { amount: usdcBalance },
            USDT: { amount: usdtBalance }
        });
        }
      } catch (error) {
        console.error('Error loading balances:', error);
      } finally {
        if (isMounted) {
        setLoading(false);
        }
      }
    };

    loadBalances();

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [walletAddress]);

  return { balances, solPrice, loading, priceLoading };
}

