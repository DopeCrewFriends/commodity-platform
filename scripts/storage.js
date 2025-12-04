// ==================== STORAGE UTILITIES ====================
// User Data Management Functions

// Get current wallet address
function getCurrentWalletAddress() {
    return localStorage.getItem('walletAddress');
}

// Get user-specific data key
function getUserDataKey(dataType) {
    const walletAddress = getCurrentWalletAddress();
    if (!walletAddress) return null;
    return `user_${walletAddress}_${dataType}`;
}

// Get user data
function getUserData(dataType, defaultValue = null) {
    const key = getUserDataKey(dataType);
    if (!key) return defaultValue;
    const data = localStorage.getItem(key);
    if (data) {
        try {
            return JSON.parse(data);
        } catch (e) {
            console.error(`Error parsing user data for ${dataType}:`, e);
            return defaultValue;
        }
    }
    return defaultValue;
}

// Set user data
function setUserData(dataType, data) {
    const key = getUserDataKey(dataType);
    if (!key) {
        console.error('Cannot save user data: no wallet address');
        return false;
    }
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (e) {
        console.error(`Error saving user data for ${dataType}:`, e);
        return false;
    }
}

