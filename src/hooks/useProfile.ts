import { useState, useEffect } from 'react';
import { ProfileData, Statistics } from '../types';
import { loadUserData, saveUserData } from '../utils/storage';
import { apiRequest } from '../utils/api';

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

    // Try to load from API first, then fallback to localStorage
    const loadProfile = async () => {
      try {
        // Try to fetch from API
        const apiProfile = await apiRequest<ProfileData>(`/api/profiles/${walletAddress}`);
        if (apiProfile) {
          setProfileData({ ...apiProfile, walletAddress });
          // Also save to localStorage as backup
          saveUserData(walletAddress, 'profileData', apiProfile);
        } else {
          // Fallback to localStorage
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
        }
      } catch (error) {
        // API failed, use localStorage
        console.log('API not available, using localStorage:', error);
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
      }

      // Load statistics
      const savedStats = loadUserData<Statistics>(walletAddress, 'statistics');
      if (savedStats) {
        setStatistics(savedStats);
      }

      setLoading(false);
    };

    loadProfile();
  }, [walletAddress]);

  const updateProfile = async (data: Partial<ProfileData>) => {
    const updated = { ...profileData!, ...data };
    setProfileData(updated);
    
    // Save to localStorage immediately
    saveUserData(walletAddress, 'profileData', updated);
    
    // Also save to API
    try {
      await apiRequest('/api/profiles', {
        method: 'POST',
        body: JSON.stringify({
          walletAddress,
          name: updated.name,
          email: updated.email,
          company: updated.company,
          location: updated.location,
          avatarImage: updated.avatarImage,
          username: (updated as any).username
        })
      });
    } catch (error) {
      console.error('Failed to save profile to API:', error);
      // If API fails, show error to user
      if (error instanceof Error && error.message.includes('Username already taken')) {
        throw error; // Re-throw so EditProfileModal can show the error
      }
    }
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

