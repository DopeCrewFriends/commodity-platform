// Script to clear all escrows from localStorage
// Run this in the browser console or via Node.js

if (typeof window !== 'undefined' && window.localStorage) {
  // Browser environment
  const keys = Object.keys(localStorage);
  
  // Find all escrow-related keys
  const escrowKeys = keys.filter(key => 
    key.startsWith('user_') && key.endsWith('_escrows') || 
    key.startsWith('escrows_')
  );
  
  console.log(`Found ${escrowKeys.length} escrow keys to clear:`);
  escrowKeys.forEach(key => {
    console.log(`  - ${key}`);
    localStorage.removeItem(key);
  });
  
  // Also clear any escrow data by resetting to empty
  keys.forEach(key => {
    if (key.startsWith('user_') && key.endsWith('_escrows')) {
      localStorage.setItem(key, JSON.stringify({ totalAmount: 0, items: [] }));
    } else if (key.startsWith('escrows_')) {
      localStorage.setItem(key, JSON.stringify({ totalAmount: 0, items: [] }));
    }
  });
  
  console.log('All escrows cleared!');
} else {
  console.log('This script must be run in a browser environment with localStorage');
}

