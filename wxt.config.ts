import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'DashFlow — Personal Start Page',
    description: 'Персональное рабочее пространство и Dashboard в новой вкладке Chrome.',
    version: '0.1.0',
    permissions: ['storage', 'bookmarks'],
    host_permissions: ['<all_urls>'],
    action: {
      default_title: 'DashFlow',
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
