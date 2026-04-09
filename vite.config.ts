import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

const isNativeBuild = process.env.CAPACITOR_BUILD === 'true';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Disable PWA service worker for native Capacitor builds
    ...(!isNativeBuild
      ? [
          VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['icons/*.png'],
            manifest: {
              name: 'CruiseFlow',
              short_name: 'CruiseFlow',
              description: 'Your personal cruise ship command center',
              theme_color: '#0ea5e9',
              background_color: '#0c1425',
              display: 'standalone',
              orientation: 'portrait',
              start_url: '/',
              icons: [
                {
                  src: '/icons/icon-192.png',
                  sizes: '192x192',
                  type: 'image/png',
                },
                {
                  src: '/icons/icon-512.png',
                  sizes: '512x512',
                  type: 'image/png',
                  purpose: 'any maskable',
                },
              ],
            },
            workbox: {
              globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
              runtimeCaching: [],
            },
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
