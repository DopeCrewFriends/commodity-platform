import { useState, useEffect } from 'react';
import { ProfileData, Statistics } from '../types';
import { loadUserData, saveUserData } from '../utils/storage';

export function useProfile(walletAddress: string) {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [statistics, setStatistics] = useState<Statistics>({
    memberSince: null,
    completedTrades: 0,
    totalVolume: 0,
    successRate: null,
    rating: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!walletAddress) return;

    // Load profile data
    const savedProfile = loadUserData<ProfileData>(walletAddress, 'profileData');
    if (savedProfile) {
      setProfileData({ ...savedProfile, walletAddress });
    } else {
      // Initialize new profile
      setProfileData({
        name: '',
        email: '',
        company: '',
        location: '',
        walletAddress,
        avatarImage: undefined
      });
    }

    // Load statistics
    const savedStats = loadUserData<Statistics>(walletAddress, 'statistics');
    if (savedStats) {
      setStatistics(savedStats);
    }

    setLoading(false);
  }, [walletAddress]);

  const updateProfile = (data: Partial<ProfileData>) => {
    const updated = { ...profileData!, ...data };
    setProfileData(updated);
    saveUserData(walletAddress, 'profileData', updated);
  };

  const isProfileComplete = (): boolean => {
    if (!profileData) return false;
    return !!(
      profileData.name?.trim() &&
      profileData.email?.trim() &&
      profileData.company?.trim() &&
      profileData.location?.trim()
    );
  };

  return {
    profileData,
    statistics,
    loading,
    updateProfile,
    isProfileComplete: isProfileComplete()
  };
}

