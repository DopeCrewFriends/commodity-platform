/**
 * Utility to clear all user data from localStorage
 */

export function clearAllUserData(): void {
  try {
    // Get all localStorage keys
    const keys = Object.keys(localStorage);
    
    // Filter keys that start with 'user_' (our user data pattern)
    const userDataKeys = keys.filter(key => key.startsWith('user_'));
    
    // Also clear wallet address
    const walletAddressKey = 'walletAddress';
    
    // Clear all user data
    userDataKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Clear wallet address
    localStorage.removeItem(walletAddressKey);
    
    // Clear theme preference (optional - you might want to keep this)
    // localStorage.removeItem('theme');
    
    console.log(`Cleared ${userDataKeys.length} user data entries from localStorage`);
    return;
  } catch (error) {
    console.error('Error clearing user data:', error);
    throw error;
  }
}

export function clearUserDataByWallet(walletAddress: string): void {
  try {
    if (!walletAddress) return;
    
    const keys = Object.keys(localStorage);
    const userDataKeys = keys.filter(key => 
      key.startsWith(`user_${walletAddress}_`)
    );
    
    userDataKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log(`Cleared ${userDataKeys.length} entries for wallet ${walletAddress}`);
  } catch (error) {
    console.error('Error clearing user data:', error);
    throw error;
  }
}


