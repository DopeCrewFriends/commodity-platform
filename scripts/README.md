# Scripts Directory Structure

This directory contains modular JavaScript files organized by functionality:

## File Organization

1. **storage.js** - localStorage utilities and user data management
2. **utils.js** - Theme, navigation, and general UI utilities
3. **wallet.js** - Wallet connection (Phantom) and wallet UI updates
4. **profile.js** - Profile editing, display, and profile completion modal
5. **trades.js** - Trade history and escrows management
6. **contacts.js** - Contacts management (add, edit, delete)
7. **balance.js** - Wallet balance fetching (SOL and USDC)
8. **main.js** - Initialization and orchestration

## Load Order (important!)

Scripts should be loaded in this order in index.html:
1. storage.js
2. utils.js
3. wallet.js
4. profile.js
5. trades.js
6. contacts.js
7. balance.js
8. main.js

## Dependencies

- `storage.js` - No dependencies (foundation)
- `utils.js` - No dependencies
- `wallet.js` - Depends on: storage.js, utils.js
- `profile.js` - Depends on: storage.js, utils.js, wallet.js
- `trades.js` - Depends on: storage.js
- `contacts.js` - Depends on: storage.js, utils.js
- `balance.js` - Depends on: storage.js
- `main.js` - Depends on: All modules

