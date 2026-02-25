import { useState, useEffect } from 'react';
import { ProfileData, Statistics } from '../types';
import { loadUserData } from '../utils/storage';
import { supabase } from '../utils/supabase';
import { useAuth } from './useAuth';

/**
 * @param skipLoadUntilComplete - If true, skip loading until profile is complete
 * @param walletAddressOverride - When provided, use this wallet address instead of useAuth's.
 *   Use this so profile loading uses the same wallet as the rest of the app (avoids two
 *   useWallet() instances getting out of sync after connect()).
 */
export function useProfile(skipLoadUntilComplete: boolean = false, walletAddressOverride?: string | null) {
  const { walletAddress: authWalletAddress } = useAuth();
  const walletAddress = walletAddressOverride !== undefined ? walletAddressOverride : authWalletAddress;
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [statistics, setStatistics] = useState<Statistics>({
    memberSince: null,
    completedTrades: 0,
    totalVolume: 0,
    successRate: null,
    rating: null
  });
  const [loading, setLoading] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;

    if (!walletAddress) {
      if (mounted) {
        setProfileData(null);
        setLoading(true); // Set loading to true when wallet disconnects
        setHasInitialized(false);
      }
      return;
    }

    // Don't reload if we've already initialized for this wallet (unless skipLoadUntilComplete is false)
    if (skipLoadUntilComplete && hasInitialized) {
      return;
    }
    
    // Reset hasInitialized when walletAddress changes to ensure profile reloads
    if (mounted && hasInitialized) {
      setHasInitialized(false);
    }

    const emptyProfileForWallet: ProfileData = {
      name: '',
      email: '',
      company: '',
      location: '',
      walletAddress,
      avatarImage: '',
      username: ''
    };

    const loadProfile = async () => {
      if (!mounted) return;

      if (skipLoadUntilComplete) {
        if (mounted) {
          setProfileData(emptyProfileForWallet);
          setLoading(false);
          setHasInitialized(true);
        }
        return;
      }

      // Show complete-profile form immediately (assume new user); we'll update when fetch completes.
      // This avoids blocking on "Loading profile..." before we know if they have an existing profile.
      if (mounted) {
        setProfileData(emptyProfileForWallet);
        setLoading(false);
      }

      try {
        // Check / load existing profile from Supabase
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('wallet_address', walletAddress)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            if (mounted) {
              setProfileData({
                name: '',
                email: '',
                company: '',
                location: '',
                walletAddress,
                avatarImage: '',
                username: ''
              });
            }
          } else {
            throw error;
          }
        } else if (data && mounted) {
          // Map database fields to ProfileData
          setProfileData({
            name: data.name,
            email: data.email,
            company: data.company,
            location: data.location,
            walletAddress: data.wallet_address || walletAddress,
            avatarImage: data.avatar_image,
            username: data.username
          });
        }
      } catch (error: any) {
        console.error('Error loading profile:', error);
        if (mounted) {
          setProfileData({
            name: '',
            email: '',
            company: '',
            location: '',
            walletAddress,
            avatarImage: '',
            username: ''
          });
        }
      } finally {
        // Always clear loading so we never get stuck on "Loading profile..."
        // (effect cleanup can set mounted=false before the request completes)
        setLoading(false);
        if (mounted) {
          setHasInitialized(true);
        }
      }

      if (!mounted) return;

      // Load statistics from localStorage (statistics are still local-only)
      const savedStats = loadUserData<Statistics>(walletAddress, 'statistics');
      if (savedStats && mounted) {
        setStatistics(savedStats);
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [walletAddress, skipLoadUntilComplete]); // Removed hasInitialized from deps to prevent circular dependency

  const updateProfile = async (data: Partial<ProfileData>) => {
    if (!walletAddress) throw new Error('Wallet not connected');

    const updated = { ...profileData!, ...data };
    
    try {
      // Check if username is taken (excluding current wallet)
      if (updated.username) {
        const { data: existing } = await supabase
          .from('profiles')
          .select('wallet_address')
          .eq('username', updated.username.toLowerCase().trim())
          .neq('wallet_address', walletAddress)
          .maybeSingle();

        if (existing) {
          throw new Error('Username already taken');
        }
      }

      // Upsert profile (insert or update) using wallet_address
      const { data: savedProfile, error } = await supabase
        .from('profiles')
        .upsert({
          wallet_address: walletAddress,
          name: updated.name,
          email: updated.email,
          company: updated.company,
          location: updated.location,
          avatar_image: updated.avatarImage,
          username: updated.username.toLowerCase().trim(),
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'wallet_address'
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      if (savedProfile) {
        setProfileData({
          name: savedProfile.name,
          email: savedProfile.email,
          company: savedProfile.company,
          location: savedProfile.location,
          walletAddress: savedProfile.wallet_address || walletAddress,
          avatarImage: savedProfile.avatar_image,
          username: savedProfile.username
        });
      }
    } catch (error: any) {
      console.error('Failed to save profile:', error);
      throw error;
    }
  };
  
  // Check if username is available (for real-time validation)
  const checkUsernameAvailability = async (username: string): Promise<boolean> => {
    if (!walletAddress || !username || username.trim().length < 3) {
      return true;
    }

    try {
      const usernameLower = username.toLowerCase().trim();
      
      const { data, error } = await supabase
        .from('profiles')
        .select('wallet_address')
        .eq('username', usernameLower)
        .neq('wallet_address', walletAddress)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking username:', error);
        return true; // Assume available on error
      }

      // If data exists, username is taken
      return !data;
    } catch (error) {
      console.error('Failed to check username availability:', error);
      return true; // Assume available on error
    }
  };

  const isProfileComplete = (): boolean => {
    if (!profileData) {
      return false;
    }
    
    const checks = {
      name: !!profileData.name?.trim(),
      email: !!profileData.email?.trim(),
      company: !!profileData.company?.trim(),
      location: !!profileData.location?.trim(),
      username: !!profileData.username?.trim()
    };

    const isComplete = !!(
      checks.name &&
      checks.email &&
      checks.company &&
      checks.location &&
      checks.username
    );
    
    return isComplete;
  };

  return {
    profileData,
    statistics,
    loading,
    updateProfile,
    checkUsernameAvailability,
    isProfileComplete
  };
}
