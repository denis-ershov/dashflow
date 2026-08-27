import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'DashFlow — Personal Start Page',
    description: 'Персональное рабочее пространство и Dashboard в новой вкладке Chrome.',
    version: '2.0.0',
    default_locale: 'ru',
    permissions: ['storage', 'bookmarks'],
    host_permissions: [
      'https://api.open-meteo.com/*',
      'https://images.unsplash.com/*',
    ],
    optional_host_permissions: ['https://*/*'],
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'; frame-src https: 'self';",
      sandbox: "sandbox allow-scripts; script-src 'self'; object-src 'none';",
    },
    action: {
      default_title: 'DashFlow',
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
