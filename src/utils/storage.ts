/** localStorage can throw (private mode, blocked storage, security settings). */
export function safeLocalStorageGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeLocalStorageSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeLocalStorageRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function getUserDataKey(walletAddress: string, dataType: string): string {
  return `user_${walletAddress}_${dataType}`;
}

export function saveUserData<T>(walletAddress: string, dataType: string, data: T): boolean {
  const key = getUserDataKey(walletAddress, dataType);
  if (!key) return false;
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error(`Error saving user data for ${dataType}:`, e);
    return false;
  }
}

export function loadUserData<T>(walletAddress: string, dataType: string): T | null {
  const key = getUserDataKey(walletAddress, dataType);
  const data = safeLocalStorageGetItem(key);
  if (!data) return null;
  try {
    return JSON.parse(data) as T;
  } catch (e) {
    console.error(`Error loading user data for ${dataType}:`, e);
    return null;
  }
}

export function getCurrentWalletAddress(): string | null {
  return safeLocalStorageGetItem('walletAddress');
}

export function formatWalletAddress(address: string): string {
  return address.length > 12 
    ? address.slice(0, 4) + '...' + address.slice(-4)
    : address;
}

export function getInitials(name: string, fallback: string = ''): string {
  if (name && name.trim() !== '') {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  return fallback.slice(0, 2).toUpperCase();
}

/**
 * Clear all user data from localStorage
 * This removes all user-specific data but keeps theme preference
 */
export function clearAllUserData(): void {
  try {
    const keys = Object.keys(localStorage);
    
    // Remove all keys that start with 'user_' (user data pattern)
    const userDataKeys = keys.filter(key => key.startsWith('user_'));
    userDataKeys.forEach(key => localStorage.removeItem(key));
    
    // Remove wallet-related keys
    localStorage.removeItem('walletAddress');
    localStorage.removeItem('walletConnected');
  } catch (error) {
    console.error('Error clearing user data:', error);
    throw error;
  }
}

/**
 * Clear user data for a specific wallet address
 */
export function clearUserDataByWallet(walletAddress: string): void {
  try {
    if (!walletAddress) return;
    
    const keys = Object.keys(localStorage);
    const userDataKeys = keys.filter(key => 
      key.startsWith(`user_${walletAddress}_`)
    );
    
    userDataKeys.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('Error clearing user data:', error);
    throw error;
  }
}

/**
 * Clear all escrows from localStorage for all users
 */
export function clearAllEscrows(): void {
  try {
    const keys = Object.keys(localStorage);
    
    // Find all escrow-related keys
    const escrowKeys = keys.filter(key => 
      (key.startsWith('user_') && key.endsWith('_escrows')) || 
      key.startsWith('escrows_')
    );
    
    // Clear or reset all escrow data
    escrowKeys.forEach(key => {
      if (key.startsWith('user_') && key.endsWith('_escrows')) {
        // Reset to empty escrows data
        localStorage.setItem(key, JSON.stringify({ totalAmount: 0, items: [] }));
      } else if (key.startsWith('escrows_')) {
        // Remove old format keys
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Error clearing escrows:', error);
    throw error;
  }
}

