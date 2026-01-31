import path from 'node:path';
import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
  }),
  manifest: {
    name: 'DashFlow',
    description: 'A clean, customizable New Tab dashboard with widgets',
    permissions: ['storage', 'geolocation'],
    host_permissions: [
      'https://api.open-meteo.com/*',
      'https://geocoding-api.open-meteo.com/*',
    ],
    // Explicit CSP – matches Chrome MV3 minimum; see docs/SECURITY_AUDIT.md
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'",
    },
  },
});
