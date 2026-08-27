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
import { AppearanceModal } from '@/features/appearance';
import { useThemeStore } from '@/core/theme/themeStore';
import { Spinner } from '@/ui/feedback';

export default function App() {
  const { language, isInitialized, initialize: initApp } = useAppStore();
  const { activeModal, setActiveModal, initializeDashboard } = useDashboardStore();
  const initializeTheme = useThemeStore((state) => state.initialize);

  useEffect(() => {
    initApp();
    initializeDashboard();
    initializeTheme();
  }, [initApp, initializeDashboard, initializeTheme]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas text-fg">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm font-medium tracking-wide text-fg-muted">
            {getTranslation(language, 'common.loading')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-fg p-6 transition-colors duration-normal relative pb-24">
      {/* Шапка приложения */}
      <header className="flex items-center justify-between pb-6 mb-6 border-b border-line">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-1 text-primary-fg">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{getTranslation(language, 'app.title')}</h1>
            <p className="text-xs text-fg-muted">
              {getTranslation(language, 'app.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-surface text-secondary border border-line">
            <ShieldCheck className="w-4 h-4 mr-1.5" />
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
      <AppearanceModal isOpen={activeModal === 'themes'} onClose={() => setActiveModal(null)} />
    </div>
  );
}
