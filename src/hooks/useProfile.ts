import { useState, useEffect } from 'react';
import { ProfileData, Statistics } from '../types';
import { loadUserData } from '../utils/storage';
import { supabase } from '../utils/supabase';
import { useAuth } from './useAuth';

export function useProfile(skipLoadUntilComplete: boolean = false) {
  const { walletAddress } = useAuth();
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
        setLoading(false);
        setHasInitialized(false);
      }
      return;
    }

    if (skipLoadUntilComplete && hasInitialized) {
      return;
    }

    const loadProfile = async () => {
      if (!mounted) return;

      if (skipLoadUntilComplete) {
        console.log('Skipping profile load - waiting for user to complete profile first');
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
          setLoading(false);
          setHasInitialized(true);
        }
        return;
      }
      
      console.log('loadProfile called for wallet:', walletAddress);
      if (mounted) {
        setLoading(true);
      }
      
      try {
        // Fetch profile from Supabase directly using wallet_address
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('wallet_address', walletAddress)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // Profile doesn't exist yet - this is normal for new users
            console.log('Profile not found - initializing new profile for first-time user');
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
        if (mounted) {
          setLoading(false);
          setHasInitialized(true);
        }
      }

      if (!mounted) return;

      // Load statistics from localStorage (statistics are still local-only)
      const savedStats = loadUserData<Statistics>(walletAddress, 'statistics');
      if (savedStats && mounted) {
        setStatistics(savedStats);
      }
      
      console.log('loadProfile completed');
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [walletAddress, skipLoadUntilComplete, hasInitialized]);

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
    if (!profileData) return false;
    return !!(
      profileData.name?.trim() &&
      profileData.email?.trim() &&
      profileData.company?.trim() &&
      profileData.location?.trim() &&
      profileData.avatarImage?.trim() &&
      profileData.username?.trim()
    );
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
