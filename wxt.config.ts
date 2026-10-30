import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';
import pkg from './package.json';

// https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  // С WXT 0.20 public по умолчанию в корне проекта; иконки и _locales лежат в src/public
  publicDir: 'src/public',
  modules: ['@wxt-dev/module-react'],
  manifest: (env) => {
    const isDev = env.mode === 'development';
    // Сайты RSS-лент: доступ запрашивается по клику только к адресам лент пользователя
    const optionalHosts = ['https://*/*', 'http://*/*'];
    // Закладки, вкладки и недавно закрытые вкладки — тоже по запросу (browserPermissions.ts).
    // Геолокация в манифест не входит: она не может быть необязательной в Chrome,
    // а navigator.geolocation на странице расширения сам спрашивает пользователя.
    const optionalApis = ['bookmarks', 'tabs', 'sessions'];

    return {
      name: '__MSG_extensionName__',
      description: '__MSG_extensionDescription__',
      version: pkg.version,
      default_locale: 'en',
      permissions: ['storage'],
      host_permissions: [
        'https://api.open-meteo.com/*',
        'https://geocoding-api.open-meteo.com/*',
        'https://api.bigdatacloud.net/*',
        'https://nominatim.openstreetmap.org/*',
      ],
      // В MV2 (Firefox) отдельного optional_host_permissions нет — хосты входят в optional_permissions
      optional_permissions:
        env.manifestVersion === 2 ? [...optionalApis, ...optionalHosts] : optionalApis,
      ...(env.manifestVersion === 3 ? { optional_host_permissions: optionalHosts } : {}),
      content_security_policy: {
        extension_pages: isDev
          ? "script-src 'self' 'wasm-unsafe-eval' http://localhost:* http://127.0.0.1:*; object-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; frame-src https: 'self';"
          : "script-src 'self'; object-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; frame-src https: 'self';",
        sandbox: "sandbox allow-scripts; script-src 'self'; object-src 'none';",
      },
      icons: {
        16: 'icons/icon-16.png',
        32: 'icons/icon-32.png',
        48: 'icons/icon-48.png',
        128: 'icons/icon-128.png',
      },
      action: {
        default_title: 'DashFlow',
        default_icon: {
          16: 'icons/icon-16.png',
          32: 'icons/icon-32.png',
          48: 'icons/icon-48.png',
          128: 'icons/icon-128.png',
        },
      },
      browser_specific_settings: {
        gecko: {
          id: 'dashflow@addon',
          strict_min_version: '109.0',
          // Обязательно для новых дополнений AMO с 03.11.2025. Виджет погоды (есть в раскладке
          // по умолчанию) отправляет в Open-Meteo и геокодеры координаты — найденные или выбранного
          // города; больше никакие данные с устройства не уходят
          data_collection_permissions: {
            required: ['locationInfo'],
          },
        },
      },
    };
  },
  vite: () => ({
    plugins: [tailwindcss()],
    build: {
      // Главный чанк новой вкладки на Vite 7 — 742 КБ (иконки ≈12 КБ, основное — React и код
      // приложения). Разбор и бюджеты — этап 7 ROADMAP; лимит не даёт расти дальше незаметно
      chunkSizeWarningLimit: 760,
    },
  }),
});
