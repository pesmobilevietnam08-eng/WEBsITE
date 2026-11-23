import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      filename: 'sw.js',
      manifestFilename: 'manifest.webmanifest',
      includeAssets: ['robots.txt'],
      manifest: {
        name: 'JPD113 Speaking Trainer',
        short_name: 'JPD113',
        description:
          'Sổ tay luyện thi nói tiếng Nhật JPD113 offline — luyện đọc thành tiếng và vấn đáp có chấm điểm tức thì.',
        lang: 'vi',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#F6F3EC',
        theme_color: '#0A6E72',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        inlineWorkboxRuntime: true,
        globPatterns: ['**/*.{js,css,html,svg,png,webp,avif,woff2}'],
        globIgnores: [
          '**/node_modules/**/*',
          'sw.js',
          'workbox-*.js',
          'icons/icon-192.png',
          'icons/icon-512.png',
          'icons/maskable-512.png',
          'assets/KitchenSinkPage-*.js',
          'assets/KitchenSinkPage-*.css',
        ],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ],
  build: {
    target: 'es2022',
    sourcemap: false,
    cssCodeSplit: true,
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/react-router')) {
            return 'router-vendor';
          }
          if (id.includes('node_modules/zod')) {
            return 'zod-vendor';
          }
          if (id.includes('src/engine/')) {
            return 'grading-engine';
          }
          return undefined;
        },
      },
    },
  },
});
