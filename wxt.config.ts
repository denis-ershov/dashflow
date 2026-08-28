import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: (env) => {
    const isDev = env.mode === 'development';

    return {
      name: 'DashFlow — Personal Start Page',
      description: 'Персональное рабочее пространство и Dashboard в новой вкладке Chrome.',
      version: '3.7.0',
      default_locale: 'ru',
      permissions: ['storage', 'bookmarks', 'geolocation'],
      host_permissions: [
        'https://api.open-meteo.com/*',
        'https://geocoding-api.open-meteo.com/*',
        'https://api.bigdatacloud.net/*',
        'https://nominatim.openstreetmap.org/*',
        'https://images.unsplash.com/*',
        'https://*/*',
        'http://*/*',
      ],
      content_security_policy: {
        extension_pages: isDev
          ? "script-src 'self' 'wasm-unsafe-eval' http://localhost:* http://127.0.0.1:*; object-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; frame-src https: 'self';"
          : "script-src 'self'; object-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; frame-src https: 'self';",
        sandbox: "sandbox allow-scripts; script-src 'self'; object-src 'none';",
      },
      action: {
        default_title: 'DashFlow',
      },
    };
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
