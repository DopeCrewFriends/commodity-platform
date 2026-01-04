import { useState, useEffect, useCallback } from 'react';
import { ProfileData } from '../types';
import { supabase } from '../utils/supabase';

// Shared in-memory cache for profiles
const profilesCache = new Map<string, ProfileData>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const cacheTimestamps = new Map<string, number>();

// Loading promises to prevent duplicate concurrent requests
const loadingPromises = new Map<string, Promise<ProfileData[]>>();

/**
 * Hook to fetch and cache profiles by wallet addresses
 * Prevents duplicate fetches across components
 */
export function useProfilesCache(walletAddresses: string[]) {
  const [profiles, setProfiles] = useState<Record<string, ProfileData>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!walletAddresses || walletAddresses.length === 0) {
      setProfiles({});
      return;
    }

    const fetchProfiles = async () => {
      // Filter out addresses we already have cached and valid
      const now = Date.now();
      const addressesToFetch: string[] = [];
      const cachedProfiles: Record<string, ProfileData> = {};

      walletAddresses.forEach(address => {
        const cached = profilesCache.get(address);
        const timestamp = cacheTimestamps.get(address);
        
        if (cached && timestamp && (now - timestamp) < CACHE_DURATION) {
          cachedProfiles[address] = cached;
        } else {
          addressesToFetch.push(address);
        }
      });

      // Set cached profiles immediately
      if (Object.keys(cachedProfiles).length > 0) {
        setProfiles(cachedProfiles);
      }

      // If all profiles are cached, we're done
      if (addressesToFetch.length === 0) {
        return;
      }

      // Check if there's already a loading request for these addresses
      const cacheKey = addressesToFetch.sort().join(',');
      let fetchPromise = loadingPromises.get(cacheKey);

      if (!fetchPromise) {
        setLoading(true);
        fetchPromise = (async () => {
          try {
            const { data, error } = await supabase
              .from('profiles')
              .select('*')
              .in('wallet_address', addressesToFetch);

            if (error) {
              if (error.code === 'PGRST205' || error.code === '42P01') {
                console.log('Profiles table not found');
                return [];
              }
              throw error;
            }

            const fetchedProfiles: ProfileData[] = (data || []).map(profile => ({
              name: profile.name,
              email: profile.email,
              company: profile.company,
              location: profile.location,
              walletAddress: profile.wallet_address || '',
              avatarImage: profile.avatar_image,
              username: profile.username
            }));

            // Update cache
            const now = Date.now();
            fetchedProfiles.forEach(profile => {
              profilesCache.set(profile.walletAddress, profile);
              cacheTimestamps.set(profile.walletAddress, now);
            });

            return fetchedProfiles;
          } catch (error) {
            console.error('Error fetching profiles:', error);
            return [];
          } finally {
            loadingPromises.delete(cacheKey);
          }
        })();

        loadingPromises.set(cacheKey, fetchPromise);
      }

      const fetchedProfiles = await fetchPromise;
      
      // Merge fetched profiles with cached ones
      const allProfiles: Record<string, ProfileData> = { ...cachedProfiles };
      fetchedProfiles.forEach(profile => {
        allProfiles[profile.walletAddress] = profile;
      });

      setProfiles(allProfiles);
      setLoading(false);
    };

    fetchProfiles();
  }, [walletAddresses.join(',')]); // Use join to create stable dependency

  const invalidateCache = useCallback((walletAddress?: string) => {
    if (walletAddress) {
      profilesCache.delete(walletAddress);
      cacheTimestamps.delete(walletAddress);
    } else {
      profilesCache.clear();
      cacheTimestamps.clear();
    }
  }, []);

  return { profiles, loading, invalidateCache };
}

