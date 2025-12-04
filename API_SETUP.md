# Backend API Setup Guide

## Overview

The CommodityX platform now uses a Flask backend API with SQLite database to enable cross-device profile sharing. Profiles are stored in a central database, so users can find each other across different devices and browsers.

## Setup Instructions

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

Or if you prefer pip3:

```bash
pip3 install -r requirements.txt
```

This will install:
- Flask (web framework)
- flask-cors (for CORS support)

### 2. Run the API Server

```bash
python api_server.py
```

Or:

```bash
python3 api_server.py
```

The API server will start on **http://localhost:5000**

### 3. Run the Frontend Server

In a separate terminal, run the frontend server:

```bash
python server.py
```

Or:

```bash
python3 server.py
```

The frontend will be available at **http://localhost:8000**

## How It Works

### Data Flow

1. **Profile Creation/Update**: When a user saves their profile, it's saved to both:
   - localStorage (for offline access and caching)
   - Backend API (for cross-device sharing)

2. **Profile Search**: When searching for users:
   - Frontend first tries the API (returns profiles from all devices)
   - Falls back to localStorage if API is unavailable

3. **Profile Viewing**: When viewing a profile:
   - Frontend tries API first
   - Falls back to localStorage if not found in API

### API Endpoints

- `GET /api/health` - Health check
- `POST /api/profiles` - Save/update a profile
- `GET /api/profiles/<wallet_address>` - Get a specific profile
- `GET /api/profiles/search?q=<query>` - Search profiles by name
- `GET /api/profiles/all` - Get all profiles (for directory)

### Database

The SQLite database (`commodityx.db`) is automatically created when you first run the API server. It contains:

- **profiles table**: Stores user profile data (name, email, company, location, avatar, wallet address, etc.)

## Configuration

The API base URL is configured in `scripts/api.js`:

```javascript
const API_BASE_URL = 'http://localhost:5000/api';
```

For production, update this to your backend server URL.

## Troubleshooting

### API Server Won't Start

- Make sure port 5000 is not already in use
- Check that Flask is installed: `pip list | grep Flask`

### Profiles Not Showing Across Devices

- Make sure the API server is running
- Check browser console for API errors
- Verify CORS is enabled (flask-cors should handle this automatically)

### Database Issues

- The database file `commodityx.db` is created automatically
- If you need to reset: delete `commodityx.db` and restart the API server

## Production Deployment

For production, you'll want to:

1. Use a production WSGI server (like Gunicorn)
2. Use a proper database (PostgreSQL, MySQL, etc.)
3. Set up environment variables for configuration
4. Enable HTTPS
5. Update CORS settings to allow only your domain
6. Set up proper authentication/authorization

Example with Gunicorn:

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 api_server:app
```

