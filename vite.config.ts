import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Avoid port 3000: many tools use it; Vite would silently jump to 3001 while the browser stays on 3000 → blank/wrong page.
// vercel.json runs `vite --port 5173 --strictPort`, which matches this default.
const devPort = (() => {
  const p = process.env.PORT
  if (process.env.VERCEL && p && /^\d+$/.test(p)) return Number(p)
  return 5173
})()

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['@solana/web3.js', 'buffer'],
    alias: {
      buffer: 'buffer',
    },
  },
  optimizeDeps: {
    include: ['@solana/web3.js', '@coral-xyz/anchor', '@solana/spl-token', 'buffer'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  define: {
    'process.env': {},
  },
  server: {
    host: true,
    port: devPort,
    // Fail loudly if the port is taken instead of switching ports without you noticing.
    strictPort: true,
  },
  build: {
    rollupOptions: {
      external: (id) => {
        if (id.includes('/api/') || id.includes('\\api\\') || id.startsWith('./api/') || id.startsWith('../api/')) {
          return true;
        }
        return false;
      }
    }
  }
})
