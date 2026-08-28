import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useTranslation } from '@/core/i18n';
import { GridEngine } from '@/features/dashboard/components/GridEngine';
import { CommandPalette } from '@/features/dashboard/components/CommandPalette';
import { SettingsModal } from '@/features/settings/components/SettingsModal';
import { AddWidgetModal } from '@/features/dashboard/components/AddWidgetModal';
import { MarketplaceModal } from '@/features/marketplace/components/MarketplaceModal';
import { AppearanceModal, WallpaperBackground } from '@/features/appearance';
import { HeroSection } from '@/features/hero';
import { SpeedDialGrid, AddLinkModal } from '@/features/speedDial';
import { FloatingDock } from '@/features/dock';
import { AmbientSoundDrawer } from '@/features/audio';
import { useAudioStore } from '@/core/audio';
import { useThemeStore } from '@/core/theme/themeStore';
import { Spinner, RootErrorBoundary } from '@/ui/feedback';
import { ToastContainer } from '@/ui/primitives/Toast';

function DashboardContent() {
  const { isInitialized, initialize: initApp } = useAppStore();
  const {
    activeModal,
    setActiveModal,
    initializeDashboard,
    layoutMode,
    setLayoutMode,
    heroSettings,
    updateHeroSettings,
    speedDialLinks,
    addSpeedDialLink,
    removeSpeedDialLink,
    isEditMode,
    toggleEditMode,
    setCommandPaletteOpen,
  } = useDashboardStore();
  const initializeTheme = useThemeStore((state) => state.initialize);
  const isAudioPlaying = useAudioStore((state) => Object.values(state.activeTracks).some(Boolean));
  const { t } = useTranslation();

  const [isAddLinkOpen, setIsAddLinkOpen] = useState(false);
  const [isAudioDrawerOpen, setIsAudioDrawerOpen] = useState(false);

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
            {t('common.loading')}
          </p>
        </div>
      </div>
    );
  }

  const showHero = layoutMode === 'modular' || layoutMode === 'zen';
  const showSpeedDial = (layoutMode === 'modular' || layoutMode === 'zen') && heroSettings?.showSpeedDial !== false;
  const showGrid = layoutMode === 'modular' || layoutMode === 'canvas';

  return (
    <div className="min-h-screen flex flex-col text-fg transition-colors duration-normal relative pb-36 sm:pb-32">
      {/* Слой фонового изображения и затемнения (Wallpaper Engine) */}
      <WallpaperBackground />

      <div className="relative z-10 flex-1 flex flex-col w-full">
        {/* Центральная Hero-зона */}
        {showHero && (
          <section className="w-full pt-8 pb-4">
            <HeroSection
              settings={heroSettings}
              onEngineChange={(eng) => updateHeroSettings({ defaultSearchEngine: eng })}
            />
            {showSpeedDial && (
              <SpeedDialGrid
                links={speedDialLinks}
                onAddClick={() => setIsAddLinkOpen(true)}
                onRemoveLink={removeSpeedDialLink}
              />
            )}
          </section>
        )}

        {/* Модульная сетка виджетов (режимы Modular и Pure Canvas) */}
        {showGrid && (
          <main className="flex-1 w-full px-3 sm:px-6 py-4">
            <GridEngine />
          </main>
        )}
      </div>

      {/* Плавающий нижний бар управления (Floating Dock) */}
      <FloatingDock
        layoutMode={layoutMode}
        onToggleLayoutMode={() => {
          if (layoutMode === 'modular') setLayoutMode('canvas');
          else if (layoutMode === 'canvas') setLayoutMode('zen');
          else setLayoutMode('modular');
        }}
        onOpenAddWidget={() => setActiveModal('addWidget')}
        onOpenAppearance={() => setActiveModal('themes')}
        onOpenAudio={() => setIsAudioDrawerOpen(true)}
        onOpenSettings={() => setActiveModal('settings')}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        isEditMode={isEditMode}
        onToggleEditMode={toggleEditMode}
        isAudioPlaying={isAudioPlaying}
      />

      {/* Модальные окна и оверлеи */}
      <CommandPalette />
      <SettingsModal />
      <AddWidgetModal />
      <MarketplaceModal />
      <AppearanceModal
        isOpen={activeModal === 'themes' || activeModal === 'appearance'}
        onClose={() => setActiveModal(null)}
      />
      <AddLinkModal
        isOpen={isAddLinkOpen}
        onClose={() => setIsAddLinkOpen(false)}
        onAdd={addSpeedDialLink}
      />
      <AmbientSoundDrawer
        isOpen={isAudioDrawerOpen}
        onClose={() => setIsAudioDrawerOpen(false)}
      />
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <RootErrorBoundary>
      <DashboardContent />
    </RootErrorBoundary>
  );
}
