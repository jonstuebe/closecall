/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { cloudflare } from '@cloudflare/vite-plugin';
import type { Plugin } from 'vite';

import pkg from './package.json' with { type: 'json' };
import puzzles from './worker/puzzles.json' with { type: 'json' };
import { RUNWAY_WARNING_DAYS, parseDateKey, puzzleNumber } from './worker/puzzles.ts';

const THEME_COLOR = '#10161b';

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    // Vitest only needs React; the Worker runtime is for dev, preview and build.
    !process.env.VITEST && cloudflare(),
    puzzleRunway(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Close Call',
        short_name: 'Close Call',
        description: 'A daily guessing game: name the mystery animal, photographed way too close.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: THEME_COLOR,
        background_color: THEME_COLOR,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Photos are deliberately left out: precaching them would ship every answer.
        globPatterns: ['**/*.{js,css,html,svg,json,webmanifest}', 'icons/*.png', '**/bricolage-grotesque-latin-wght-normal-*.woff2'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Today's photo, cached on first view so the game keeps playing offline.
            urlPattern: /^\/photos\/.+/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'closecall-photos',
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  test: {
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
  },
});

/** Warns on every build (and so every deploy) when the Puzzles are about to run out. */
function puzzleRunway(): Plugin {
  return {
    name: 'closecall:puzzle-runway',
    apply: 'build',
    buildStart() {
      // Runs once per environment; report from the client build only.
      if (this.environment.name !== 'client') return;
      const today = new Date().toISOString().slice(0, 10);
      const left = puzzles.length - puzzleNumber(parseDateKey(today)!);
      if (left < RUNWAY_WARNING_DAYS) {
        this.warn(`Only ${Math.max(0, left)} Puzzles left after today (${puzzles.length} in worker/puzzles.json). Add more before players see "Back tomorrow".`);
      }
    },
  };
}
