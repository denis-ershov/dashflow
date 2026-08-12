import React, { useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { getTranslation } from '@/services/localization/i18n';
import { Sparkles, ShieldCheck } from 'lucide-react';
import { GridEngine } from '@/features/dashboard/components/GridEngine';
import { FloatingToolbar } from '@/features/dashboard/components/FloatingToolbar';
import { CommandPalette } from '@/features/dashboard/components/CommandPalette';
import { SettingsModal } from '@/features/settings/components/SettingsModal';
import { AddWidgetModal } from '@/features/dashboard/components/AddWidgetModal';
import { MarketplaceModal } from '@/features/marketplace/components/MarketplaceModal';
import { ThemesModal } from '@/features/themes/components/ThemesModal';
import { useThemeStore } from '@/features/themes/stores/useThemeStore';

export default function App() {
  const { language, isInitialized, initialize: initApp } = useAppStore();
  const { initializeDashboard } = useDashboardStore();
  const { initializeTheme } = useThemeStore();

  useEffect(() => {
    initApp();
    initializeDashboard();
    initializeTheme();
  }, [initApp, initializeDashboard, initializeTheme]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] text-[var(--color-text)]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium tracking-wide opacity-80">
            {getTranslation(language, 'common.loading')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-text)] p-6 transition-colors duration-200 relative pb-24">
      {/* Шапка приложения */}
      <header className="flex items-center justify-between pb-6 mb-6 border-b border-[var(--color-border)]">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center shadow-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{getTranslation(language, 'app.title')}</h1>
            <p className="text-xs text-[var(--color-text-muted)]">
              {getTranslation(language, 'app.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[var(--color-surface)] text-[var(--color-secondary)] border border-[var(--color-border)]">
            <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
            UI System & Grid Engine Active
          </span>
        </div>
      </header>

      {/* Движок сетки и виджетов */}
      <main className="flex-1 w-full max-w-7xl mx-auto">
        <GridEngine />
      </main>

      {/* Элементы управления и оверлеи */}
      <FloatingToolbar />
      <CommandPalette />
      <SettingsModal />
      <AddWidgetModal />
      <MarketplaceModal />
      <ThemesModal />
    </div>
  );
}
