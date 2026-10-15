import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import tailwind from '@tailwindcss/vite';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    tailwind(),
    {
      name: 'voyageur-rewrite',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url?.startsWith('/voyageur') && !req.url.includes('.')) req.url = '/voyageur.html';
          if (req.url?.startsWith('/centre') && !req.url.includes('.')) req.url = '/centre.html';
          next();
        });
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Mahatta Conducteur', short_name: 'Mahatta', display: 'fullscreen', orientation: 'landscape',
        background_color: '#07101E', theme_color: '#0A1830',
        icons: [{ src: '/logo.png', sizes: '250x131', type: 'image/png' }],
      },
      workbox: { navigateFallbackDenylist: [/^\/api/, /^\/socket\.io/, /^\/voyageur/, /^\/centre/] },
    }),
  ],
  build: { rollupOptions: { input: { main: resolve('index.html'), voyageur: resolve('voyageur.html'), centre: resolve('centre.html') } } },
  server: { port: 5173, host: true, proxy: { '/api': 'http://localhost:3001', '/socket.io': { target: 'http://localhost:3001', ws: true } } },
});
