# Deployment Guide for SETL Platform

This guide explains how to deploy the SETL platform to Vercel with serverless functions.

## Architecture

- **Frontend**: React/Vite app deployed to Vercel
- **API**: Vercel serverless functions in `/api` folder
- **Database**: Supabase (PostgreSQL) - shared across all users and devices

## Why This Works Across Devices

✅ **YES** - When one user creates a profile on Device A, another user can see it on Device B because:
- All data is stored in a **shared Supabase database**
- All serverless functions access the **same database**
- No local storage - everything is in the cloud

## Setup Steps

### 1. Set Up Supabase Database

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to SQL Editor and run the SQL from `supabase-setup.sql`
4. Go to Settings > API and copy:
   - Project URL (SUPABASE_URL)
   - Anon/Public Key (SUPABASE_ANON_KEY)

### 2. Deploy to Vercel

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```

4. **Set Environment Variables** in Vercel Dashboard:
   - Go to your project settings
   - Navigate to Environment Variables
   - Add these variables:
     ```
     SUPABASE_URL=your_supabase_project_url
     SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

5. **Redeploy** after adding environment variables:
   ```bash
   vercel --prod
   ```

### 3. Update Frontend API URL

The frontend will automatically use the Vercel deployment URL for API calls. No configuration needed!

## API Endpoints

After deployment, your API will be available at:
- `https://your-project.vercel.app/api/health`
- `https://your-project.vercel.app/api/profiles`
- `https://your-project.vercel.app/api/profiles/[wallet]`
- `https://your-project.vercel.app/api/profiles/search`
- `https://your-project.vercel.app/api/profiles/username/[username]`
- `https://your-project.vercel.app/api/contacts`
- `https://your-project.vercel.app/api/contacts/[contact_wallet]`

## Testing Cross-Device Functionality

1. **Device A**: Create a profile with username "testuser"
2. **Device B**: Search for "@testuser" - you should see the profile!
3. **Device A**: Add a contact
4. **Device B**: The contact should appear (if logged in as the same user)

## Troubleshooting

### "Database not configured" error
- Make sure `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set in Vercel
- Redeploy after adding environment variables

### CORS errors
- The serverless functions already include CORS headers
- If issues persist, check Supabase RLS policies

### Username already taken
- This is expected - usernames are unique across all users
- The system prevents duplicate usernames

## Local Development

For local development, you can still use the Flask server:

```bash
python api_server.py
```

Or use Vercel CLI to run serverless functions locally:

```bash
vercel dev
```

## Production vs Development

- **Development**: Uses Flask server with SQLite (local only)
- **Production**: Uses Vercel serverless functions with Supabase (shared across all users)

