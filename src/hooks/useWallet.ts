import { useState, useEffect, useCallback } from 'react';
// Using Phantom's injected provider - SolanaKit handles this

export function useWallet() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Check for existing connection
    const savedAddress = localStorage.getItem('walletAddress');
    if (savedAddress) {
      setWalletAddress(savedAddress);
      setIsConnected(true);
    }

    // Check Phantom connection
    if (window.solana?.isPhantom) {
      if (window.solana.isConnected) {
        const address = window.solana.publicKey?.toString();
        if (address) {
          setWalletAddress(address);
          setIsConnected(true);
        }
      }
    }
  }, []);

  const connect = useCallback(async () => {
    if (!window.solana?.isPhantom) {
      throw new Error('Phantom wallet not found');
    }

    try {
      const response = await window.solana.connect();
      const address = response.publicKey.toString();
      
      setWalletAddress(address);
      setIsConnected(true);
      localStorage.setItem('walletAddress', address);
      localStorage.setItem('walletConnected', 'true');
      
      return address;
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (window.solana?.isPhantom && window.solana.isConnected) {
      await window.solana.disconnect();
    }
    
    setWalletAddress(null);
    setIsConnected(false);
    localStorage.removeItem('walletAddress');
    localStorage.removeItem('walletConnected');
  }, []);

  return {
    walletAddress,
    isConnected,
    connect,
    disconnect
  };
}

