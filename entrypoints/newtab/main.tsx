import React from 'react';
import ReactDOM from 'react-dom/client';
import '@/widgets/plugins'; // Register built-in widgets
import { initializeStores } from '@/stores';
import { initTheme } from '@/lib/theme';
import App from './App';
import './style.css';

initializeStores().then(() => {
  initTheme();
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
