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
      
      // Reload profile from API to get the latest data (including username)
      try {
        const apiProfile = await apiRequest<ProfileData>(`/api/profiles/${walletAddress}`);
        if (apiProfile) {
          setProfileData({ ...apiProfile, walletAddress });
        } else {
          // Fallback to updated data if API doesn't return it
          setProfileData(updated);
        }
      } catch (reloadError) {
        // If reload fails, use the updated data
        console.log('Failed to reload profile, using updated data:', reloadError);
        setProfileData(updated);
      }
    } catch (error) {
      console.error('Failed to save profile to API:', error);
      // Re-throw the error so EditProfileModal can show it
      throw error;
    }
  };
  
  // Track if validation is disabled to prevent infinite loops
  let validationDisabled = false;
  
  // Check if username is available (for real-time validation)
  const checkUsernameAvailability = async (username: string): Promise<boolean> => {
    // If validation was disabled due to errors, skip it
    if (validationDisabled) {
      return true;
    }
    
    if (!username || username.trim().length < 3) {
      return true; // Empty or too short is considered "available" (will be validated on save)
    }
    
    try {
      const usernameLower = username.toLowerCase().trim();
      
      // Use AbortController for fetch cancellation
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.warn('Username check timeout, disabling real-time validation');
        validationDisabled = true; // Disable after timeout to prevent more attempts
        controller.abort();
      }, 2000);
      
      try {
        // First try the search endpoint with abort signal
        const response = await fetch(`${window.location.origin}/api/profiles/search?q=${encodeURIComponent(usernameLower)}&exclude=${walletAddress}`, {
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          if (response.status === 503) {
            console.log('Database not configured, disabling real-time validation');
            validationDisabled = true;
            return true;
          }
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json() as { users: Array<{ walletAddress: string; username?: string }> };
        
        // Check if any user in results has the exact same username (case-insensitive)
        const isTaken = data.users?.some(
          user => user.username && user.username.toLowerCase().trim() === usernameLower
        );
        
        return !isTaken;
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        // If aborted or network error, disable validation
        if (fetchError.name === 'AbortError' || fetchError.message?.includes('fetch')) {
          console.warn('Network error during username check, disabling real-time validation');
          validationDisabled = true;
          return true;
        }
        
        // If search returns 503 (Database not configured), skip real-time validation
        if (fetchError.message?.includes('503') || fetchError.message?.includes('Database not configured')) {
          console.log('Database not configured, disabling real-time validation');
          validationDisabled = true;
          return true;
        }
        
        throw fetchError;
      }
    } catch (error: any) {
      // Disable validation on any error to prevent infinite loops
      validationDisabled = true;
      console.error('Failed to check username availability, disabling real-time validation:', error);
      // If check fails, allow it (will be validated on save)
      return true;
    }
  };

  const isProfileComplete = (): boolean => {
    if (!profileData) return false;
    // Required fields: name, email, and username
    return !!(
      profileData.name?.trim() &&
      profileData.email?.trim() &&
      (profileData as any).username?.trim()
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

