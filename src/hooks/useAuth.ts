import { useState, useEffect } from 'react';
import { useWallet } from './useWallet';

// Wallet-based auth - uses wallet address as user identifier
export function useAuth() {
  const { walletAddress, isConnected, connect, disconnect } = useWallet();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Auth is based on wallet connection
    setLoading(false);
  }, [walletAddress, isConnected]);

  const signIn = async () => {
    // Sign in = connect wallet
    await connect();
  };

  const signUp = async () => {
    // Sign up = connect wallet (first time users will create profile)
    await connect();
  };

  const signOut = async () => {
    // Sign out = disconnect wallet
    await disconnect();
  };

  return {
    user: walletAddress ? { id: walletAddress, walletAddress } : null,
    walletAddress,
    isConnected,
    loading,
    signIn,
    signUp,
    signOut,
  };
}
