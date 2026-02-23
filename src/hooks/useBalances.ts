import { useState, useEffect } from 'react';
import { fetchSOLBalance, fetchUSDCBalance, fetchUSDTBalance } from '../utils/solana';
import { useSOLPrice } from '../contexts/SOLPriceContext';
import { TokenBalance } from '../types';

export function useBalances(walletAddress: string | null) {
  const { solPrice, priceLoading } = useSOLPrice();
  const [balances, setBalances] = useState<TokenBalance>({
    SOL: { amount: 0 },
    USDC: { amount: 0 },
    USDT: { amount: 0 }
  });
  const [loading, setLoading] = useState(false);

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

