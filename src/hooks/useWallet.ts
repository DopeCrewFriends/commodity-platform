import { useState, useEffect, useCallback, useMemo } from 'react';
import { PublicKey, Transaction, type SendOptions } from '@solana/web3.js';
import {
  safeLocalStorageGetItem,
  safeLocalStorageRemoveItem,
  safeLocalStorageSetItem,
} from '../utils/storage';

export function useWallet() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Check for Phantom wallet availability
  const getPhantomProvider = () => {
    if (typeof window === 'undefined') return null;
    
    // Check for Phantom wallet
    if ('solana' in window && window.solana?.isPhantom) {
      return window.solana;
    }
    
    // Also check for legacy Phantom
    if ('phantom' in window && (window as any).phantom?.solana) {
      return (window as any).phantom.solana;
    }
    
    return null;
  };

  useEffect(() => {
    // Wait for window to be available
    if (typeof window === 'undefined') return;

    const checkConnection = () => {
      const provider = getPhantomProvider();
      
      if (provider) {
        // Check if already connected
        if (provider.isConnected && provider.publicKey) {
          const address = provider.publicKey.toString();
          setWalletAddress(address);
          setIsConnected(true);
          safeLocalStorageSetItem('walletAddress', address);
          return;
        }
      }

      // Check localStorage for saved address
      const savedAddress = safeLocalStorageGetItem('walletAddress');
      if (savedAddress) {
        setWalletAddress(savedAddress);
        setIsConnected(true);
      }
    };

    // Check immediately
    checkConnection();

    // Also check after a short delay in case Phantom loads late
    const timeoutId = setTimeout(checkConnection, 500);

    // Listen for Phantom wallet events
    const handleAccountChange = (publicKey: any) => {
      if (publicKey) {
        const address = publicKey.toString();
        setWalletAddress(address);
        setIsConnected(true);
        safeLocalStorageSetItem('walletAddress', address);
      } else {
        setWalletAddress(null);
        setIsConnected(false);
        safeLocalStorageRemoveItem('walletAddress');
      }
    };

    const provider = getPhantomProvider();
    const handleDisconnect = () => {
      setWalletAddress(null);
      setIsConnected(false);
      safeLocalStorageRemoveItem('walletAddress');
    };

    if (provider) {
      provider.on('accountChanged', handleAccountChange);
      provider.on('disconnect', handleDisconnect);
    }

    return () => {
      clearTimeout(timeoutId);
      if (provider) {
        try {
          provider.removeListener('accountChanged', handleAccountChange);
          provider.removeListener('disconnect', handleDisconnect);
        } catch (error) {
          // Ignore errors if listeners don't exist
          console.warn('Error removing wallet listeners:', error);
        }
      }
    };
  }, []);

  const connect = useCallback(async () => {
    const provider = getPhantomProvider();
    
    if (!provider) {
      throw new Error('Phantom wallet not found. Please install Phantom wallet extension.');
    }

    try {
      // Connect with onlyIfTrusted: false to always show connection prompt
      const response = await provider.connect({ onlyIfTrusted: false });
      const address = response.publicKey.toString();
      
      setWalletAddress(address);
      setIsConnected(true);
      safeLocalStorageSetItem('walletAddress', address);
      safeLocalStorageSetItem('walletConnected', 'true');
      
      return address;
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      
      // Handle user rejection
      if (error.code === 4001) {
        throw new Error('Connection rejected by user');
      }
      
      throw error;
    }
  }, []);

  const disconnect = useCallback(async () => {
    const provider = getPhantomProvider();
    
    if (provider && provider.isConnected) {
      try {
        await provider.disconnect();
      } catch (error) {
        console.error('Error disconnecting wallet:', error);
      }
    }
    
    setWalletAddress(null);
    setIsConnected(false);
    safeLocalStorageRemoveItem('walletAddress');
    safeLocalStorageRemoveItem('walletConnected');
  }, []);

  const chainPublicKey = useMemo(() => {
    if (!walletAddress) return null;
    try {
      return new PublicKey(walletAddress.trim());
    } catch {
      return null;
    }
  }, [walletAddress]);

  const signTransaction = useCallback(async (tx: Transaction): Promise<Transaction> => {
    const provider = getPhantomProvider();
    if (!provider?.signTransaction) {
      throw new Error('Phantom cannot sign transactions. Update Phantom or use a compatible wallet.');
    }
    const signed = await provider.signTransaction(tx);
    return signed as Transaction;
  }, []);

  /**
   * Defined only when Phantom exposes `signAndSendTransaction` (see Phantom “Send a legacy transaction” docs).
   * Uses the wallet’s sign+broadcast path so pre-sign simulation matches submission more closely than
   * `signTransaction` + app `sendRawTransaction` when RPCs differ.
   */
  const signAndSendTransaction = useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    const provider = getPhantomProvider() as {
      signAndSendTransaction?: (
        t: Transaction,
        o?: SendOptions
      ) => Promise<{ signature: string } | string>;
    };
    if (typeof provider?.signAndSendTransaction !== 'function') return undefined;
    return async (tx: Transaction, options?: SendOptions): Promise<{ signature: string }> => {
      const result = await provider.signAndSendTransaction!(tx, options);
      const signature = typeof result === 'string' ? result : result.signature;
      return { signature };
    };
  }, [isConnected]);

  const signAllTransactions = useCallback(async (txs: Transaction[]): Promise<Transaction[]> => {
    const provider = getPhantomProvider();
    if (provider?.signAllTransactions) {
      return (await provider.signAllTransactions(txs)) as Transaction[];
    }
    if (!provider?.signTransaction) {
      throw new Error('Wallet cannot sign transactions');
    }
    const out: Transaction[] = [];
    for (const t of txs) {
      out.push((await provider.signTransaction!(t)) as Transaction);
    }
    return out;
  }, []);

  return {
    walletAddress,
    isConnected,
    connect,
    disconnect,
    chainPublicKey,
    signTransaction,
    signAndSendTransaction,
    signAllTransactions,
  };
}

