import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Mahatta Conducteur', short_name: 'Mahatta', display: 'fullscreen', orientation: 'landscape',
        background_color: '#07101E', theme_color: '#0A1830',
        icons: [{ src: '/logo.png', sizes: '250x131', type: 'image/png' }],
      },
      workbox: { navigateFallbackDenylist: [/^\/api/, /^\/socket\.io/] },
    }),
  ],
  server: { port: 5173, host: true, proxy: { '/api': 'http://localhost:3001', '/socket.io': { target: 'http://localhost:3001', ws: true } } },
});
