import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        // Caching model files (.json, .bin) dan static assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,bin}'],
        // Naikkan limit size caching agar file model weights.bin (~2MB) tercache dengan aman
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      manifest: {
        name: 'Root Fact App',
        short_name: 'RootFact',
        description: 'AI-Powered Plant/Vegetable Fun Facts Assistant',
        theme_color: '#10b981',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        orientation: 'portrait',
        icons: [
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'icons/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    port: 3001,
    host: true
  }
});
