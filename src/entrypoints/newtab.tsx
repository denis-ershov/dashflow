import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../store/themeStore';
import { useDashboardStore } from '../store/dashboardStore';
import Dashboard from '../components/Dashboard';
import '../utils/i18n';
import '../styles/globals.css';

const App: React.FC = () => {
  const { i18n } = useTranslation();
  const { initializeTheme } = useThemeStore();
  const { widgets, customCSS } = useDashboardStore();

  useEffect(() => {
    // Инициализация темы
    initializeTheme();
    
    // Применение кастомного CSS
    if (customCSS) {
      const style = document.createElement('style');
      style.id = 'custom-dashboard-css';
      style.textContent = customCSS;
      document.head.appendChild(style);
      
      return () => {
        const existingStyle = document.getElementById('custom-dashboard-css');
        if (existingStyle) {
          existingStyle.remove();
        }
      };
    }
  }, [initializeTheme, customCSS]);

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg transition-colors duration-300">
      <Dashboard />
    </div>
  );
};

// Создаем root элемент
const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = ReactDOM.createRoot(container);
root.render(<App />);