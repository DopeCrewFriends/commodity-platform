import { useState, useEffect } from 'react';
import { fetchSOLBalance, fetchUSDCBalance } from '../utils/solana';
import { fetchSOLPrice } from '../utils/coingecko';
import { TokenBalance } from '../types';

export function useBalances(walletAddress: string | null) {
  const [balances, setBalances] = useState<TokenBalance>({
    SOL: { amount: 0 },
    USDC: { amount: 0 }
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
      setBalances({ SOL: { amount: 0 }, USDC: { amount: 0 } });
      return;
    }

    const loadBalances = async () => {
      setLoading(true);
      try {
        const [solBalance, usdcBalance] = await Promise.all([
          fetchSOLBalance(walletAddress),
          fetchUSDCBalance(walletAddress)
        ]);

        setBalances({
          SOL: { amount: solBalance },
          USDC: { amount: usdcBalance }
        });
      } catch (error) {
        console.error('Error loading balances:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBalances();
  }, [walletAddress]);

  return { balances, solPrice, loading, priceLoading };
}

