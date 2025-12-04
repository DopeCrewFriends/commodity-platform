// ==================== API UTILITIES ====================
// Backend API integration for cross-device profile sharing

const API_BASE_URL = 'http://localhost:5000/api';

// Check if API server is available
async function checkAPIAvailable() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`, {
            method: 'GET',
            timeout: 3000
        });
        return response.ok;
    } catch (error) {
        console.warn('API server not available, using localStorage only:', error);
        return false;
    }
}

// Save profile to API
async function saveProfileToAPI(profileData) {
    try {
        const response = await fetch(`${API_BASE_URL}/profiles`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(profileData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to save profile');
        }
        
        const result = await response.json();
        console.log('✅ Profile saved to API:', result);
        return true;
    } catch (error) {
        console.error('Error saving profile to API:', error);
        return false;
    }
}

// Get profile from API
async function getProfileFromAPI(walletAddress) {
    try {
        const response = await fetch(`${API_BASE_URL}/profiles/${walletAddress}`, {
            method: 'GET'
        });
        
        if (!response.ok) {
            if (response.status === 404) {
                return null; // Profile not found
            }
            throw new Error('Failed to fetch profile');
        }
        
        const profile = await response.json();
        return profile;
    } catch (error) {
        console.error('Error fetching profile from API:', error);
        return null;
    }
}

// Search profiles from API
async function searchProfilesFromAPI(searchQuery, excludeWallet = null) {
    try {
        let url = `${API_BASE_URL}/profiles/search?q=${encodeURIComponent(searchQuery)}`;
        if (excludeWallet) {
            url += `&exclude=${encodeURIComponent(excludeWallet)}`;
        }
        
        const response = await fetch(url, {
            method: 'GET'
        });
        
        if (!response.ok) {
            throw new Error('Failed to search profiles');
        }
        
        const data = await response.json();
        return data.users || [];
    } catch (error) {
        console.error('Error searching profiles from API:', error);
        return [];
    }
}

// Get all profiles from API
async function getAllProfilesFromAPI(excludeWallet = null) {
    try {
        let url = `${API_BASE_URL}/profiles/all`;
        if (excludeWallet) {
            url += `?exclude=${encodeURIComponent(excludeWallet)}`;
        }
        
        const response = await fetch(url, {
            method: 'GET'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch all profiles');
        }
        
        const data = await response.json();
        return data.users || [];
    } catch (error) {
        console.error('Error fetching all profiles from API:', error);
        return [];
    }
}

// Sync profile: save to both API and localStorage
async function syncProfile(profileData) {
    // Always save to localStorage first (for offline access)
    const savedToLocal = setUserData('profileData', profileData);
    
    // Try to save to API (will fail silently if API is unavailable)
    const savedToAPI = await saveProfileToAPI(profileData);
    
    return {
        local: savedToLocal,
        api: savedToAPI
    };
}

// Get profile: try API first, fallback to localStorage
async function getProfile(walletAddress) {
    // Try API first
    const apiProfile = await getProfileFromAPI(walletAddress);
    if (apiProfile) {
        // Also cache in localStorage
        const key = `user_${walletAddress}_profileData`;
        localStorage.setItem(key, JSON.stringify(apiProfile));
        return apiProfile;
    }
    
    // Fallback to localStorage
    const key = `user_${walletAddress}_profileData`;
    const localData = localStorage.getItem(key);
    if (localData) {
        try {
            return JSON.parse(localData);
        } catch (e) {
            console.error('Error parsing local profile data:', e);
        }
    }
    
    return null;
}

