import React, { lazy, Suspense, useState, useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import {
  pickPersistedDashboard,
  useDashboardHydration,
  useDashboardStore,
} from '@/stores/useDashboardStore';
import { useTranslation } from '@/core/i18n';
import { activeHeroSettingsOf, activeLayoutModeOf } from '@/core/storage';
import { GridEngine } from '@/features/dashboard/components/GridEngine';
import { useCommandPaletteHotkey } from '@/features/dashboard/hooks/useCommandPaletteHotkey';
import { useSpaceHotkeys } from '@/features/dashboard/hooks/useSpaceHotkeys';
import { WallpaperBackground } from '@/features/appearance/WallpaperBackground';
import { HeroSection } from '@/features/hero';
import { SpeedDialGrid } from '@/features/speedDial/SpeedDialGrid';
import { FloatingDock, type DockPanel } from '@/features/dock';
import { useAudioStore } from '@/core/audio';
import { useFeatureFlags } from '@/core/featureFlags';
import { useThemeStore } from '@/core/theme/themeStore';
import { Spinner, RootErrorBoundary } from '@/ui/feedback';
import { ToastContainer } from '@/ui/primitives/Toast';
import { Button } from '@/ui/primitives';
import { crashLogger } from '@/core/observability';
import { useUndoHotkey } from '@/features/commands/useUndoHotkey';
import { deleteDashboardEntity } from '@/features/commands/deleteDashboardEntity';
import { StartupLayoutSkeleton } from '@/features/dashboard/StartupLayoutSkeleton';
import {
  readStartupLayoutCache,
  writeStartupLayoutCache,
} from '@/features/dashboard/startupLayoutCache';

const SpacesModal = lazy(() =>
  import('@/features/dashboard/components/SpacesModal').then(({ SpacesModal }) => ({ default: SpacesModal })),
);
const SettingsModal = lazy(() =>
  import('@/features/settings/components/SettingsModal').then(({ SettingsModal }) => ({ default: SettingsModal })),
);
const AddWidgetModal = lazy(() =>
  import('@/features/dashboard/components/AddWidgetModal').then(({ AddWidgetModal }) => ({ default: AddWidgetModal })),
);
const MarketplaceModal = lazy(() =>
  import('@/features/marketplace/components/MarketplaceModal').then(({ MarketplaceModal }) => ({ default: MarketplaceModal })),
);
const AppearanceModal = lazy(() =>
  import('@/features/appearance/AppearanceModal').then(({ AppearanceModal }) => ({ default: AppearanceModal })),
);
const OnboardingDialog = lazy(() =>
  import('@/features/onboarding/OnboardingDialog').then(({ OnboardingDialog }) => ({ default: OnboardingDialog })),
);
const AssignAgentDialog = lazy(() =>
  import('@/features/agents/AssignAgentDialog').then(({ AssignAgentDialog }) => ({
    default: AssignAgentDialog,
  })),
);
const CommandPalette = lazy(() =>
  import('@/features/dashboard/components/CommandPalette').then(({ CommandPalette }) => ({
    default: CommandPalette,
  })),
);
const AddLinkModal = lazy(() =>
  import('@/features/speedDial/AddLinkModal').then(({ AddLinkModal }) => ({
    default: AddLinkModal,
  })),
);
const AmbientSoundDrawer = lazy(() =>
  import('@/features/audio/AmbientSoundDrawer').then(({ AmbientSoundDrawer }) => ({
    default: AmbientSoundDrawer,
  })),
);

function CommandPalettePanel() {
  const open = useDashboardStore((state) => state.isCommandPaletteOpen);
  useCommandPaletteHotkey();
  return <DeferredPanel open={open}><CommandPalette /></DeferredPanel>;
}

/** Загружает панель при первом открытии и сохраняет её состояние при закрытии. */
function DeferredPanel({ open, children }: { open: boolean; children: React.ReactNode }) {
  const [visited, setVisited] = useState(false);
  const { t } = useTranslation();
  if (open && !visited) setVisited(true);
  if (!open && !visited) return null;
  return (
    <Suspense fallback={
      <div role="status" className="fixed inset-x-0 bottom-28 z-50 mx-auto w-fit rounded-lg bg-surface px-4 py-2 text-sm text-fg">
        {t('common.loading')}
      </div>
    }>
      {children}
    </Suspense>
  );
}

/** Модалки, у которых есть своя кнопка в доке */
const DOCK_PANELS: ReadonlyArray<DockPanel> = ['spaces', 'addWidget', 'marketplace', 'appearance', 'settings'];

function DashboardContent() {
  const isInitialized = useAppStore((s) => s.isInitialized);
  const dashboardStatus = useDashboardHydration();
  const initApp = useAppStore((s) => s.initialize);
  const {
    activeModal,
    setActiveModal,
    layoutMode,
    setLayoutMode,
    heroSettings,
    updateHeroSettings,
    speedDialLinks,
    addSpeedDialLink,
    isEditMode,
    toggleEditMode,
    setCommandPaletteOpen,
    activeSpaceId,
  } = useDashboardStore(
    useShallow((s) => ({
      activeModal: s.activeModal,
      setActiveModal: s.setActiveModal,
      layoutMode: activeLayoutModeOf(s),
      setLayoutMode: s.setLayoutMode,
      heroSettings: activeHeroSettingsOf(s),
      updateHeroSettings: s.updateHeroSettings,
      speedDialLinks: s.speedDialLinks,
      addSpeedDialLink: s.addSpeedDialLink,
      isEditMode: s.isEditMode,
      toggleEditMode: s.toggleEditMode,
      setCommandPaletteOpen: s.setCommandPaletteOpen,
      activeSpaceId: s.activeSpaceId,
    })),
  );
  const initializeTheme = useThemeStore((state) => state.initialize);
  const isAudioPlaying = useAudioStore((state) => Object.values(state.activeTracks).some(Boolean));
  const stopAllAudio = useAudioStore((state) => state.stopAll);
  const isAudioEnabled = useFeatureFlags().isEnabled('ambientAudio');
  const { t } = useTranslation();

  const [isAddLinkOpen, setIsAddLinkOpen] = useState(false);
  const [isAudioDrawerOpen, setIsAudioDrawerOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [onboardingCheckComplete, setOnboardingCheckComplete] = useState(false);
  const [startupLayout] = useState(() => readStartupLayoutCache());

  useEffect(() => {
    let active = true;
    void import('@/features/onboarding/onboarding')
      .then(({ shouldShowOnboarding }) => shouldShowOnboarding())
      .then((show) => {
        if (!active) return;
        setIsOnboardingOpen(show);
        setOnboardingCheckComplete(true);
      })
      .catch((error: unknown) => {
        crashLogger.logError(error, 'storage', { stage: 'onboarding-check' });
        if (active) setOnboardingCheckComplete(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (dashboardStatus !== 'ready' || !onboardingCheckComplete || isOnboardingOpen) return;
    const updateCache = () => writeStartupLayoutCache(pickPersistedDashboard(useDashboardStore.getState()));
    updateCache();
    return useDashboardStore.subscribe(updateCache);
  }, [dashboardStatus, onboardingCheckComplete, isOnboardingOpen]);

  // Ctrl+Z / Cmd+Z вне полей ввода — отмена последнего действия с данными
  useUndoHotkey();
  useSpaceHotkeys(isInitialized && dashboardStatus === 'ready');

  useEffect(() => {
    if (dashboardStatus !== 'ready' || !globalThis.chrome?.runtime?.id) return;
    let stop: (() => void) | undefined;
    let disposed = false;
    void import('@/core/hub/tab').then(
      ({ attachHubTab }) => {
        if (!disposed) stop = attachHubTab();
      },
      () => console.warn('[DashFlow] Не удалось загрузить клиент Hub'),
    );
    return () => {
      disposed = true;
      stop?.();
    };
  }, [dashboardStatus]);

  useEffect(() => {
    // Стор запускается на значениях по умолчанию даже при ошибке чтения — её только журналируем
    initApp().catch((error: unknown) => crashLogger.logError(error, 'general', { stage: 'initApp' }));
    initializeTheme();
  }, [initApp, initializeTheme]);

  // Перенос данных 3.8 в Item — в фоне после первого кадра, даже если на дашборде нет
  // виджетов задач, заметок и ссылок (их содержимое уйдёт в архив, а не потеряется)
  useEffect(() => {
    if (dashboardStatus !== 'ready') return;
    const start = () => {
      const bootstrap = async () => {
        const { ensureWorkspaceReady } = await import('@/features/workspace/bindings');
        await ensureWorkspaceReady();
      };
      bootstrap().catch((error: unknown) =>
        crashLogger.logError(error, 'storage', { stage: 'items-migration' }),
      );
    };
    if (typeof window.requestIdleCallback === 'function') {
      const handle = window.requestIdleCallback(start, { timeout: 3000 });
      return () => window.cancelIdleCallback(handle);
    }
    const timer = setTimeout(start, 1000);
    return () => clearTimeout(timer);
  }, [dashboardStatus]);

  // Выключение флага ambientAudio должно глушить уже играющие треки
  useEffect(() => {
    if (!isAudioEnabled) stopAllAudio();
  }, [isAudioEnabled, stopAllAudio]);

  if (dashboardStatus === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-canvas p-4 text-center text-fg">
        <p role="alert">{t('spaces.loadError')}</p>
        <Button onClick={() => void useDashboardStore.persist.rehydrate()}>
          {t('commandPalette.retry')}
        </Button>
      </div>
    );
  }

  if (!isInitialized || dashboardStatus === 'loading' || !onboardingCheckComplete) {
    if (dashboardStatus === 'loading' && onboardingCheckComplete && !isOnboardingOpen && startupLayout) {
      return <StartupLayoutSkeleton layout={startupLayout} label={t('common.loading')} />;
    }
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

  const activeDockPanel: DockPanel | null = isAudioDrawerOpen
    ? 'audio'
    : DOCK_PANELS.find((panel) => panel === activeModal) ?? null;

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
          <section className="w-full pt-[var(--density-hero-start)] pb-[var(--density-hero-end)]">
            <HeroSection
              settings={heroSettings}
              onEngineChange={(eng) => updateHeroSettings({ defaultSearchEngine: eng })}
            />
            {showSpeedDial && (
              <SpeedDialGrid
                links={speedDialLinks}
                onAddClick={() => setIsAddLinkOpen(true)}
                onRemoveLink={(id) => deleteDashboardEntity('speedDial.delete', id)}
              />
            )}
          </section>
        )}

        {/* Модульная сетка виджетов (режимы Modular и Pure Canvas) */}
        {showGrid && (
          <main className="flex-1 w-full px-[var(--density-page-inline)] py-[var(--density-page-block)]">
            <GridEngine key={activeSpaceId} />
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
        onOpenMarketplace={() => setActiveModal('marketplace')}
        onOpenAppearance={() => setActiveModal('appearance')}
        onOpenAudio={isAudioEnabled ? () => setIsAudioDrawerOpen(true) : undefined}
        onOpenSettings={() => setActiveModal('settings')}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onOpenSpaces={() => setActiveModal('spaces')}
        isEditMode={isEditMode}
        onToggleEditMode={toggleEditMode}
        isAudioPlaying={isAudioPlaying}
        activePanel={activeDockPanel}
      />

      {/* Модальные окна и оверлеи */}
      <CommandPalettePanel />
      <DeferredPanel open={activeModal === 'assignAgent'}>
        {activeModal === 'assignAgent' && <AssignAgentDialog onClose={() => setActiveModal(null)} />}
      </DeferredPanel>
      <DeferredPanel open={activeModal === 'spaces'}><SpacesModal /></DeferredPanel>
      <DeferredPanel open={activeModal === 'settings'}><SettingsModal /></DeferredPanel>
      <DeferredPanel open={activeModal === 'addWidget'}><AddWidgetModal /></DeferredPanel>
      <DeferredPanel open={activeModal === 'marketplace'}><MarketplaceModal /></DeferredPanel>
      <DeferredPanel open={activeModal === 'appearance'}>
        <AppearanceModal
          isOpen={activeModal === 'appearance'}
          onClose={() => setActiveModal(null)}
        />
      </DeferredPanel>
      <DeferredPanel open={isAddLinkOpen}>
        <AddLinkModal
          isOpen={isAddLinkOpen}
          onClose={() => setIsAddLinkOpen(false)}
          onAdd={addSpeedDialLink}
        />
      </DeferredPanel>
      <DeferredPanel open={isAudioEnabled && isAudioDrawerOpen}>
        <AmbientSoundDrawer
          isOpen={isAudioEnabled && isAudioDrawerOpen}
          onClose={() => setIsAudioDrawerOpen(false)}
        />
      </DeferredPanel>
      <ToastContainer />
      <Suspense fallback={null}>
        {isOnboardingOpen && <OnboardingDialog onComplete={() => setIsOnboardingOpen(false)} />}
      </Suspense>
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
