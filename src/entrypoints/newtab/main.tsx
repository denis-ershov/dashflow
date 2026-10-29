import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { registerBuiltInWidgets } from '@/widgets/built-in';
import { webVitals } from '@/core/observability';
import { featureFlags } from '@/core/featureFlags';
import { usePluginStore } from '@/core/plugins/pluginStore';
import App from './App';
import '@/styles/globals.css';

// Синхронная регистрация встроенных виджетов, плагинов и запуск наблюдаемости Web Vitals
registerBuiltInWidgets();
void usePluginStore.getState().loadPlugins();
// Наблюдатели LCP/CLS работают с buffered: true, поэтому отложенный старт не теряет метрики
void featureFlags.whenReady().then(() => {
  if (featureFlags.isEnabled('webVitalsMonitoring')) webVitals.init();
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 минут
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
