# Quick Setup Guide

## Step 1: Install Dependencies
```bash
npm install
```

## Step 2: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) → Create account → New project
2. Go to **SQL Editor** → Run the SQL from `supabase-setup.sql`
3. Go to **Settings → API** → Copy:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **Publishable key** (starts with `sb_publishable_...`)

## Step 3: Configure Environment

Create `.env` file in the project root:
```env
# Frontend (Vite) - must be prefixed with VITE_
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_your_key_here

# Backend (Vercel serverless functions) - no prefix needed
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=sb_publishable_your_key_here
```

**Note:** For now, you can use the same values for both (frontend and backend). The `VITE_` prefix is required for Vite to expose variables to the browser.

## Step 4: Link to Vercel (One-time setup)

```bash
vercel link
```
- Choose "Set up and deploy" → "Link to existing project" → Create new project
- Or skip if you just want local dev

## Step 5: Start Development Server

**Important:** You must use `vercel dev` (not `pnpm dev`) to enable API routes:

```bash
pnpm dev:vercel
```

Or directly:
```bash
vercel dev
```

**That's it!** The app should be running at `http://localhost:3000`

You should see "Detected Serverless Functions" in the terminal when it starts.

## Troubleshooting

### API routes not working?
- Make sure you're running `vercel dev` (not `npm run dev`)
- Check that `.env` file exists with your Supabase credentials
- Verify `vercel link` was completed

### Still stuck on loading?
- Check browser console for errors
- Check terminal where `vercel dev` is running for errors
- Verify Supabase credentials in `.env` are correct

### Database connection issues?
- Make sure you ran the SQL from `supabase-setup.sql` in Supabase SQL Editor
- Verify your Supabase project is active (not paused)

