import { useState, useEffect } from 'react';
import { ProfileData, Statistics } from '../types';
import { loadUserData } from '../utils/storage'; // Only used for statistics
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

    // Load from API only
    const loadProfile = async () => {
      try {
        // Fetch from API
        const apiProfile = await apiRequest<ProfileData>(`/api/profiles/${walletAddress}`);
        if (apiProfile) {
          setProfileData({ ...apiProfile, walletAddress });
        } else {
          // Initialize new profile if not found
          setProfileData({
            name: '',
            email: '',
            company: '',
            location: '',
            walletAddress,
            avatarImage: undefined
          });
        }
      } catch (error) {
        // API failed - initialize empty profile
        console.log('API not available, initializing empty profile:', error);
        setProfileData({
          name: '',
          email: '',
          company: '',
          location: '',
          walletAddress,
          avatarImage: undefined
        });
      }

      // Load statistics from localStorage (statistics are still local-only)
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
    
    // Save to API only (this validates username uniqueness)
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
      
      // Only update state if API save succeeds
      setProfileData(updated);
    } catch (error) {
      console.error('Failed to save profile to API:', error);
      // Re-throw the error so EditProfileModal can show it
      throw error;
    }
  };
  
  // Check if username is available (for real-time validation)
  const checkUsernameAvailability = async (username: string): Promise<boolean> => {
    if (!username || username.trim().length < 3) {
      return true; // Empty or too short is considered "available" (will be validated on save)
    }
    
    try {
      const usernameLower = username.toLowerCase().trim();
      
      // Create a timeout promise to prevent hanging
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 3000);
      });
      
      // Use a more direct approach - check if username exists exactly
      const checkPromise = (async () => {
        try {
          // First try the search endpoint
          const response = await apiRequest<{ users: Array<{ walletAddress: string; username?: string }> }>(
            `/api/profiles/search?q=${encodeURIComponent(usernameLower)}&exclude=${walletAddress}`
          );
          
          // Check if any user in results has the exact same username (case-insensitive)
          const isTaken = response.users?.some(
            user => user.username && user.username.toLowerCase().trim() === usernameLower
          );
          
          return !isTaken;
        } catch (searchError: any) {
          // If search returns 503 (Database not configured), skip real-time validation
          if (searchError.message?.includes('503') || searchError.message?.includes('Database not configured')) {
            console.log('Database not configured, skipping real-time username validation');
            return true; // Allow it, will be validated on save
          }
          
          // If search fails, try checking by username directly
          try {
            const profile = await apiRequest<{ username?: string }>(
              `/api/profiles/username/${encodeURIComponent(usernameLower)}`
            );
            // If we get a profile back and it's not the current user's, username is taken
            return false;
          } catch (usernameError: any) {
            // If username endpoint also returns 503, skip validation
            if (usernameError.message?.includes('503') || usernameError.message?.includes('Database not configured')) {
              console.log('Database not configured, skipping real-time username validation');
              return true;
            }
            throw usernameError;
          }
        }
      })();
      
      // Race between the check and timeout
      return await Promise.race([checkPromise, timeoutPromise]);
    } catch (error: any) {
      // If it's a timeout or database not configured, allow it (will be validated on save)
      if (error.message?.includes('timeout') || error.message?.includes('503') || error.message?.includes('Database not configured')) {
        console.log('Username availability check unavailable, will validate on save');
        return true;
      }
      console.error('Failed to check username availability:', error);
      // If check fails, allow it (will be validated on save)
      return true;
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
    checkUsernameAvailability,
    isProfileComplete: isProfileComplete()
  };
}

