# Module Structure Overview

## Complete Module List

1. **storage.js** - localStorage utilities
   - `getCurrentWalletAddress()`
   - `getUserDataKey()`
   - `getUserData()`
   - `setUserData()`

2. **utils.js** - Theme, navigation, and UI utilities
   - Theme toggle
   - Navigation functions
   - Utility helpers (escapeHtml, formatAddress, copyWalletAddress)

3. **wallet.js** - Wallet connection and management
   - Phantom wallet connection
   - Wallet modal
   - Wallet UI updates
   - Disconnect functionality

4. **profile.js** - Profile management
   - Profile data loading
   - Profile editing
   - Profile statistics
   - Profile completion modal

5. **trades.js** - Trades and escrows
   - Trade history
   - Escrows management
   - Trade filtering

6. **contacts.js** - Contacts management
   - Add/edit/delete contacts
   - Contact modal

7. **balance.js** - Wallet balance
   - SOL balance fetching
   - USDC balance fetching
   - Balance display

8. **main.js** - Initialization
   - DOM ready handlers
   - Module initialization

## Load Order in index.html

The scripts are loaded in this exact order to respect dependencies:
1. storage.js (foundation)
2. utils.js
3. wallet.js (depends on storage, utils)
4. profile.js (depends on storage, utils, wallet)
5. trades.js (depends on storage)
6. contacts.js (depends on storage, utils)
7. balance.js (depends on storage)
8. main.js (depends on all)

