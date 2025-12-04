// ==================== CLEANUP UTILITIES ====================
// Functions to clean up invalid or test data

// Remove all data for wallet addresses starting with "0x"
function cleanupInvalidWalletData() {
    const invalidAddresses = new Set();
    const keysToRemove = [];
    
    // First pass: Identify all wallet addresses starting with "0x"
    const allKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) allKeys.push(key);
    }
    
    // Scan all localStorage keys to find invalid wallet addresses
    allKeys.forEach(key => {
        // Check if key matches user data pattern: user_{walletAddress}_{dataType}
        if (key.startsWith('user_')) {
            // Extract wallet address from key pattern: user_{walletAddress}_{dataType}
            const match = key.match(/^user_(.+?)_(.+)$/);
            if (match) {
                const walletAddress = match[1];
                
                // Check if wallet address starts with "0x" (Ethereum format)
                if (walletAddress.startsWith('0x')) {
                    invalidAddresses.add(walletAddress);
                }
            }
        }
    });
    
    // Second pass: Collect all keys to remove for invalid addresses
    allKeys.forEach(key => {
        invalidAddresses.forEach(invalidAddr => {
            // Check if this key belongs to an invalid address
            if (key.startsWith(`user_${invalidAddr}_`)) {
                keysToRemove.push(key);
            }
        });
    });
    
    // Also clean contacts - remove contacts with 0x addresses from all contact lists
    allKeys.forEach(key => {
        if (key.startsWith('user_') && key.endsWith('_contacts')) {
            try {
                const contacts = JSON.parse(localStorage.getItem(key));
                if (Array.isArray(contacts) && contacts.length > 0) {
                    const validContacts = contacts.filter(contact => {
                        // Remove contacts with 0x addresses
                        return !(contact.address && contact.address.startsWith('0x'));
                    });
                    
                    // If contacts were removed, update the list
                    if (validContacts.length !== contacts.length) {
                        localStorage.setItem(key, JSON.stringify(validContacts));
                        console.log(`Cleaned contacts in ${key}: removed ${contacts.length - validContacts.length} invalid contact(s)`);
                    }
                }
            } catch (e) {
                // Ignore parsing errors
            }
        }
    });
    
    // Remove all identified keys
    let removedCount = 0;
    keysToRemove.forEach(key => {
        try {
            localStorage.removeItem(key);
            removedCount++;
            console.log(`Removed: ${key}`);
        } catch (e) {
            console.error(`Error removing ${key}:`, e);
        }
    });
    
    if (invalidAddresses.size > 0) {
        console.log(`✅ Cleanup complete! Removed ${removedCount} items for ${invalidAddresses.size} invalid wallet address(es).`);
        console.log(`Invalid addresses found:`, Array.from(invalidAddresses));
    } else {
        console.log(`✅ Cleanup complete! No invalid wallet addresses found.`);
    }
    
    return {
        removedCount: removedCount,
        invalidAddresses: Array.from(invalidAddresses)
    };
}

// Run cleanup immediately when script loads
if (typeof window !== 'undefined') {
    // Run cleanup immediately (before DOMContentLoaded)
    console.log('🧹 Running cleanup for invalid wallet addresses...');
    cleanupInvalidWalletData();
    
    // Make function available globally for manual execution
    window.cleanupInvalidWalletData = cleanupInvalidWalletData;
}

