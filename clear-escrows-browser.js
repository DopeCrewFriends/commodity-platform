// Run this code in your browser console to clear all escrows
// Copy and paste this entire block into the browser console

(function clearAllEscrows() {
  try {
    const keys = Object.keys(localStorage);
    
    // Find all escrow-related keys
    const escrowKeys = keys.filter(key => 
      (key.startsWith('user_') && key.endsWith('_escrows')) || 
      key.startsWith('escrows_')
    );
    
    console.log(`Found ${escrowKeys.length} escrow keys:`);
    escrowKeys.forEach(key => {
      console.log(`  - ${key}`);
    });
    
    // Clear or reset all escrow data
    let cleared = 0;
    escrowKeys.forEach(key => {
      if (key.startsWith('user_') && key.endsWith('_escrows')) {
        // Reset to empty escrows data
        localStorage.setItem(key, JSON.stringify({ totalAmount: 0, items: [] }));
        cleared++;
      } else if (key.startsWith('escrows_')) {
        // Remove old format keys
        localStorage.removeItem(key);
        cleared++;
      }
    });
    
    console.log(`✅ Cleared ${cleared} escrow entries from localStorage`);
    console.log('Please refresh the page to see the changes.');
    
    return cleared;
  } catch (error) {
    console.error('❌ Error clearing escrows:', error);
    throw error;
  }
})();

