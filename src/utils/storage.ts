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
  const data = localStorage.getItem(key);
  if (!data) return null;
  try {
    return JSON.parse(data) as T;
  } catch (e) {
    console.error(`Error loading user data for ${dataType}:`, e);
    return null;
  }
}

export function getCurrentWalletAddress(): string | null {
  return localStorage.getItem('walletAddress');
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

