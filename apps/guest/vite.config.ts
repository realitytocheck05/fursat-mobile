import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { fursat } from "../../packages/brand/src/fursat";

const c = fursat.tokens.color;

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/apple-touch-icon.png"],
      manifest: {
        id: "/",
        name: fursat.name,
        short_name: fursat.shortName,
        description: "Menu, table ordering, reservations and parties at Fursat Kitchen | Bar, Capital Park, Madhapur.",
        start_url: "/?source=pwa",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: c.surface,
        theme_color: c.surface,
        categories: ["food", "lifestyle"],
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        shortcuts: [
          { name: "Menu", url: "/?view=menu", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
          { name: "Reserve a table", url: "/reserve", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,webp,woff2,json}"],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: "/index.html",
        runtimeCaching: [
          { urlPattern: ({ url }) => url.pathname.startsWith("/data/"), handler: "StaleWhileRevalidate", options: { cacheName: "menu-data" } },
          { urlPattern: ({ url }) => url.origin.includes("fonts.g"), handler: "CacheFirst", options: { cacheName: "fonts", expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } } },
        ],
      },
    }),
  ],
  build: { target: "es2022", sourcemap: false },
});
