import { useState, useEffect, useCallback } from 'react';

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
          localStorage.setItem('walletAddress', address);
          return;
        }
      }

      // Check localStorage for saved address
      const savedAddress = localStorage.getItem('walletAddress');
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
        localStorage.setItem('walletAddress', address);
      } else {
        setWalletAddress(null);
        setIsConnected(false);
        localStorage.removeItem('walletAddress');
      }
    };

    const provider = getPhantomProvider();
    const handleDisconnect = () => {
      setWalletAddress(null);
      setIsConnected(false);
      localStorage.removeItem('walletAddress');
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
      localStorage.setItem('walletAddress', address);
      localStorage.setItem('walletConnected', 'true');
      
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

