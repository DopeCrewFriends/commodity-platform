# SETL - Escrow Platform

A modern, decentralized escrow platform built with React, TypeScript, and Vite.

## Features

- 🔐 Solana wallet integration
- 💼 Profile management
- 📊 Balance tracking with real-time SOL/USDC prices
- 🤝 Contact management
- 📋 Escrow management
- 📈 Trade history
- 🎨 Modern, responsive UI with dark/light mode

## Setup Instructions

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Run Development Server

```bash
npm run dev
```

This will start the Vite dev server on **http://localhost:3000** (or the next available port).

### 3. Build for Production

```bash
npm run build
```

This creates a `dist` folder with optimized production files.

### 4. Preview Production Build

```bash
npm run preview
```

## Architecture

- **Frontend**: React/Vite app
- **API**: Vercel serverless functions in `/api` folder
- **Database**: Supabase (PostgreSQL) - shared across all users and devices

## Quick Setup (5 minutes)

### 1. Install & Configure

```bash
# Install dependencies
npm install

# Create .env file with your Supabase credentials
# (See Step 2 for where to get these)
```

### 2. Set Up Supabase (Free)

1. Go to [supabase.com](https://supabase.com) → Sign up → New project
2. **SQL Editor** → Copy/paste contents of `supabase-setup.sql` → Run
3. **Settings → API** → Copy:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Publishable key**: `sb_publishable_...` (use the publishable key, not secret)

### 3. Add to `.env` file

Create `.env` in project root:
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=sb_publishable_your_key_here
```

### 4. Link Vercel (One-time)

```bash
vercel link
```
Follow prompts (you can create a new project or skip if just testing locally)

### 5. Start Development

```bash
vercel dev
```

Open `http://localhost:3000` and connect your wallet!

---

## Detailed Setup

See [SETUP.md](./SETUP.md) for detailed instructions and troubleshooting.

### 3. Production Deployment

1. **Deploy to Vercel**:
   ```bash
   vercel
   ```

2. **Set environment variables** in Vercel Dashboard:
   - Go to your project settings → Environment Variables
   - Add:
     ```
     SUPABASE_URL=your_supabase_project_url
     SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

3. **Redeploy** after adding environment variables:
   ```bash
   vercel --prod
   ```

The frontend automatically uses the Vercel deployment URL for API calls. No configuration needed!

## Project Structure

```
├── api/                # Vercel serverless functions
│   ├── contacts/       # Contact management endpoints
│   ├── profiles/       # Profile management endpoints
│   └── health.js       # Health check endpoint
├── src/
│   ├── components/     # React components
│   ├── hooks/          # Custom React hooks
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   ├── App.tsx         # Main app component
│   └── main.tsx        # Entry point
├── styles.css          # Global styles
├── supabase-setup.sql  # Database schema
├── vite.config.ts      # Vite configuration
└── package.json        # Dependencies and scripts
```

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Vercel** - Hosting and serverless functions
- **Supabase** - PostgreSQL database
- **@solana/kit** - Solana wallet integration
- **CoinGecko API** - Cryptocurrency price data

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

Free to use and modify for your projects.

