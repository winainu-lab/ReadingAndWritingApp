import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-icon.svg'],
      manifest: {
        name: 'อ่านคล่อง — ระบบนิเทศและประเมินการอ่าน',
        short_name: 'อ่านคล่อง',
        description: 'ระบบนิเทศและประเมินการอ่านสำหรับการใช้งานภาคสนาม',
        lang: 'th',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#fffaf0',
        theme_color: '#7d4418',
        icons: [
          { src: 'pwa-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'pwa-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
