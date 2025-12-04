# Backend API Integration - Summary

## What Changed

The platform now has a **backend API server** that enables cross-device profile sharing. Previously, profiles were only stored in localStorage, so they were only visible on the device that created them.

## New Files Created

1. **`api_server.py`** - Flask backend API server with SQLite database
2. **`requirements.txt`** - Python dependencies (Flask, flask-cors)
3. **`scripts/api.js`** - Frontend API integration utilities
4. **`API_SETUP.md`** - Detailed setup instructions

## Files Modified

1. **`index.html`** - Added script tag for `api.js`
2. **`scripts/profile.js`** - Updated to save profiles to API
3. **`scripts/contacts.js`** - Updated to fetch users from API instead of just localStorage

## How It Works

### Before (localStorage only)
- Profiles saved in browser localStorage
- Only visible on the device that created them
- No cross-device sharing

### After (API + localStorage)
- Profiles saved to both localStorage AND API database
- Visible across all devices
- localStorage serves as cache/fallback for offline access

## Quick Start

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Start API server** (terminal 1):
   ```bash
   python api_server.py
   ```

3. **Start frontend server** (terminal 2):
   ```bash
   python server.py
   ```

4. **Open browser:**
   - Frontend: http://localhost:8000
   - API: http://localhost:5000

## Features

✅ Profiles are saved to centralized database
✅ Users can be found across different devices
✅ Search works across all users (not just local)
✅ localStorage still works as cache/fallback
✅ Graceful degradation if API is unavailable

## API Endpoints

- `POST /api/profiles` - Save/update profile
- `GET /api/profiles/<wallet>` - Get profile
- `GET /api/profiles/search?q=<query>` - Search by name
- `GET /api/profiles/all` - Get all profiles

## Database

SQLite database (`commodityx.db`) is automatically created with:
- `profiles` table storing user data
- Indexed for fast name searches

## Testing

1. Start both servers
2. Create a profile on Device A
3. Open the app on Device B (different browser/device)
4. Search for the user from Device A
5. ✅ User should appear in search results!

## Notes

- The API runs on port 5000 (configurable in `api_server.py`)
- Frontend runs on port 8000 (configurable in `server.py`)
- Database file is `commodityx.db` in the project root
- All API calls include localStorage fallback for offline functionality

