import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api/rpc2': {
        target: 'https://rpc.bitnetmoney.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/rpc2/, '') || '/',
        secure: true,
      },
      '^/api/rpc(?:/|$)': {
        target: 'https://rpc.bitnetmoney.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/rpc/, '') || '/',
        secure: true,
      },
      '/api/nestex': {
        target: 'https://api.nestex.one',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nestex/, '') || '/',
        secure: true,
      },
      '/api/explorer': {
        target: 'https://explorer.bitnetmoney.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/explorer/, '') || '/',
        secure: true,
      },
      '/api/stats': {
        target: 'https://stats.explorer.bitnetmoney.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/stats/, '') || '/',
        secure: true,
      },
      '/api/bitnet-explorer': {
        target: 'https://explorer.bitnetmoney.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/bitnet-explorer/, '') || '/',
        secure: true,
      },
      '/api/coolpool': {
        target: 'https://coolpool.top',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/coolpool/, '') || '/',
        secure: true,
      }
    }
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-ethers': ['ethers'],
          'vendor-icons': ['lucide-react'],
        }
      }
    }
  }
});
