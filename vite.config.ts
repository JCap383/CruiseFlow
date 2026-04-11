import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

const isNativeBuild = process.env.CAPACITOR_BUILD === 'true';

// Build identifiers — surfaced in the UI (Settings page) so users can
// tell which version of the app they're running. Resolved at build time
// and inlined via Vite's `define` so there's no runtime cost.
const pkg = JSON.parse(
  readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'),
) as { version: string };

let buildCommit = 'unknown';
try {
  buildCommit = execSync('git rev-parse --short HEAD').toString().trim();
} catch {
  // Git may not be available (e.g. in some CI sandboxes); fall through.
}

const buildTime = new Date().toISOString();

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
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_COMMIT__: JSON.stringify(buildCommit),
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
});
