import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: true,
      port: 3000,
      cors: true,
      allowedHosts: [
        'causatively-gonangial-jennefer.ngrok-free.dev',
        '.ngrok-free.dev',
        '.ngrok-free.app',
        '.ngrok.io',
      ],
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, ''),
        },
        '/auth': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
        '/parcels': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
        '/locations': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
        '/admin': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
        '/citizen': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
        '/integrations': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
      },
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
