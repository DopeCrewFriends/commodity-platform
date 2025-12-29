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
pnpm dev
```

This will start the Vite dev server on **http://localhost:3000** (or the next available port).

### 3. Build for Production

```bash
pnpm build
```

This creates a `dist` folder with optimized production files.

### 4. Preview Production Build

```bash
pnpm preview
```

## API Configuration

The frontend connects to an API server for online features (contacts, profiles). 

### Local Development

1. **Terminal 1** - API Server:
   ```bash
   python api_server.py
   ```
   Runs on http://localhost:5000

2. **Terminal 2** - Vite Dev Server:
   ```bash
   pnpm dev
   ```
   Runs on http://localhost:3000

### Production Deployment

For production, you need to:

1. **Host the API server** on a platform that supports persistent databases:
   - **Recommended**: Railway, Render, Fly.io, or DigitalOcean
   - These support Flask apps with SQLite or PostgreSQL
   - Vercel is not recommended for this Flask API (use serverless functions instead)

2. **Set the API URL** in your environment:
   - Create a `.env` file (or set in Vercel dashboard):
     ```
     VITE_API_URL=https://your-api-domain.com
     ```
   - Or update `src/utils/api.ts` with your API URL

3. **Deploy the frontend** to Vercel:
   ```bash
   pnpm build
   ```
   Then deploy the `dist` folder to Vercel

## Project Structure

```
├── src/
│   ├── components/     # React components
│   ├── hooks/          # Custom React hooks
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   ├── App.tsx         # Main app component
│   └── main.tsx        # Entry point
├── styles.css          # Global styles
├── vite.config.ts      # Vite configuration
└── package.json        # Dependencies and scripts
```

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **@solana/kit** - Solana wallet integration
- **CoinGecko API** - Cryptocurrency price data

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

Free to use and modify for your projects.

