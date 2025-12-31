import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Custom plugin to ignore API directory - must run early
    {
      name: 'ignore-api',
      enforce: 'pre', // Run before other plugins
      configureServer(server) {
        // Don't intercept API routes - let Vercel handle them
        // Vercel dev should proxy these automatically
      },
      resolveId(id, importer) {
        // Ignore any imports that reference api directory (with or without query params)
        // Check both the id and remove query parameters
        const cleanId = id.split('?')[0];
        const hasApi = cleanId.includes('/api/') || cleanId.includes('\\api\\') || cleanId.startsWith('api/') || id.includes('/api/');
        
        if (hasApi) {
          // Return null to skip processing, but mark as external
          return { id: id, external: true };
        }
        return null;
      },
      load(id) {
        // Don't load API files - let Vercel handle them
        // Returning null means Vite won't try to process it
        if (id.includes('/api/') || id.includes('\\api\\')) {
          return null; // Don't process, let it 404 or pass to Vercel
        }
        return null;
      },
      transformIndexHtml(html) {
        // Don't transform HTML for API routes
        return html;
      }
    }
  ],
  server: {
    port: 3000,
    open: true,
    fs: {
      // Deny access to api directory from Vite dev server
      deny: [resolve(__dirname, 'api')]
    },
    watch: {
      // Ignore api directory from file watching
      ignored: [/api/]
    }
  },
  build: {
    rollupOptions: {
      external: (id) => {
        // Exclude API serverless functions from bundling
        if (id.includes('/api/') || id.includes('\\api\\') || id.startsWith('./api/') || id.startsWith('../api/')) {
          return true;
        }
        return false;
      }
    }
  },
  resolve: {
    // Prevent Vite from trying to resolve API files as modules
    alias: {}
  },
  // Exclude api from optimization
  optimizeDeps: {
    exclude: []
  },
})

