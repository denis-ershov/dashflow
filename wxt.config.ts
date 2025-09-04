import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'DashFlow',
    description: 'Создай свой поток продуктивности. Персональная стартовая страница с виджетами и настройками.',
    version: '1.0.0',
    permissions: [
      'storage',
      'tabs',
      'bookmarks',
      'geolocation',
      'activeTab',
      'background'
    ],
    optional_permissions: [
      'https://api.openweathermap.org/*',
      'https://api.weatherapi.com/*',
      'https://api.exchangerate-api.com/*',
      'https://api.coingecko.com/*'
    ],
    chrome_url_overrides: {
      newtab: 'newtab.html'
    },
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'; frame-src 'self' https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;"
    }
  },
  vite: () => ({
    css: {
      postcss: {
        plugins: [
          require('tailwindcss'),
          require('autoprefixer')
        ]
      }
    },
    resolve: {
      alias: {
        '@': new URL('./src', import.meta.url).pathname
      }
    }
  })
});