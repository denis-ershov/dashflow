import React from 'react';
import { cn } from '@/ui/lib/cn';
import {
  LayoutGrid,
  Sparkles,
  Plus,
  ShoppingBag,
  Palette,
  Volume2,
  Settings,
  Search,
  Lock,
  Unlock,
  Layers,
} from 'lucide-react';
import { Tooltip } from '@/ui/primitives';
import { useTranslation } from '@/core/i18n';
import { useHubStatus } from '@/features/hub/useHubStatus';

/** Панель или режим, который сейчас открыт кнопкой дока — подсвечивается как активный */
export type DockPanel =
  'spaces' | 'addWidget' | 'marketplace' | 'appearance' | 'audio' | 'settings';

export interface FloatingDockProps {
  layoutMode: 'zen' | 'modular' | 'canvas';
  onToggleLayoutMode: () => void;
  onOpenAddWidget: () => void;
  onOpenMarketplace?: () => void;
  onOpenAppearance: () => void;
  /** Не передан — кнопка звуков скрыта (флаг ambientAudio выключен) */
  onOpenAudio?: () => void;
  onOpenSettings: () => void;
  onOpenCommandPalette: () => void;
  onOpenSpaces?: () => void;
  isEditMode?: boolean;
  onToggleEditMode?: () => void;
  isAudioPlaying?: boolean;
  activePanel?: DockPanel | null;
  className?: string;
}

type DockButtonTone = 'default' | 'active' | 'primary' | 'warning';

interface DockButtonProps {
  label: string;
  tooltip?: string;
  icon: React.ReactNode;
  onClick: () => void;
  tone?: DockButtonTone;
  /** Для кнопок-переключателей: aria-pressed */
  pressed?: boolean;
}

const TONE_CLASSES: Record<DockButtonTone, string> = {
  default: 'text-fg-muted hover:text-fg hover:bg-surface-hover',
  active: 'text-primary bg-primary/15',
  primary: 'bg-primary text-primary-fg shadow-1 hover:bg-primary-hover',
  warning: 'bg-warning/20 text-warning ring-1 ring-inset ring-warning/40',
};

const DockButton: React.FC<DockButtonProps> = ({
  label,
  tooltip = label,
  icon,
  onClick,
  tone = 'default',
  pressed,
}) => (
  <div className="flex">
    <Tooltip content={tooltip}>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-pressed={pressed}
        className={cn(
          'relative size-11 rounded-sm flex items-center justify-center cursor-pointer transition-colors duration-fast',
          TONE_CLASSES[tone],
        )}
      >
        {icon}
      </button>
    </Tooltip>
  </div>
);

const DockDivider: React.FC = () => (
  <div aria-hidden="true" className="hidden sm:block w-px h-5 bg-line mx-1" />
);

const ICON = 'size-5';

export const FloatingDock: React.FC<FloatingDockProps> = ({
  layoutMode,
  onToggleLayoutMode,
  onOpenAddWidget,
  onOpenMarketplace,
  onOpenAppearance,
  onOpenAudio,
  onOpenSettings,
  onOpenCommandPalette,
  onOpenSpaces,
  isEditMode = false,
  onToggleEditMode,
  isAudioPlaying = false,
  activePanel = null,
  className,
}) => {
  const { t } = useTranslation();
  const hubStatus = useHubStatus();
  const toneFor = (panel: DockPanel): DockButtonTone =>
    activePanel === panel ? 'active' : 'default';
  const isZen = layoutMode === 'zen';
  const canEditGrid = onToggleEditMode && (layoutMode === 'modular' || layoutMode === 'canvas');
  const settingsLabel =
    hubStatus.state === 'disconnected'
      ? t('dock.settings')
      : `${t('dock.settings')}: ${t(`hub.${hubStatus.state}`)}`;
  const hubStatusTone =
    hubStatus.state === 'connected'
      ? 'bg-success'
      : hubStatus.state === 'connecting'
        ? 'bg-primary'
        : 'bg-warning';

  return (
    <nav
      aria-label={t('dock.label')}
      className={cn(
        'fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-(--z-rail,30)',
        'bg-surface/95 backdrop-blur-md border border-line-hover rounded-md p-1 flex flex-wrap items-center justify-center gap-1 shadow-3 select-none',
        'w-max max-w-[calc(100%-1rem)]',
        className,
      )}
    >
      <DockButton
        label={isZen ? t('dock.zenOff') : t('dock.zenOn')}
        tooltip={isZen ? t('dock.zenOff') : t('dock.zenOnHint')}
        icon={isZen ? <Sparkles className={ICON} /> : <LayoutGrid className={ICON} />}
        onClick={onToggleLayoutMode}
        tone={isZen ? 'primary' : 'default'}
        pressed={isZen}
      />

      <DockDivider />

      {onOpenSpaces && (
        <DockButton
          label={t('spaces.title')}
          icon={<Layers className={ICON} />}
          onClick={onOpenSpaces}
          tone={toneFor('spaces')}
        />
      )}

      <DockButton
        label={t('dock.addWidget')}
        icon={<Plus className={ICON} />}
        onClick={onOpenAddWidget}
        tone={toneFor('addWidget')}
      />

      {onOpenMarketplace && (
        <DockButton
          label={t('dock.catalog')}
          tooltip={t('dock.catalogHint')}
          icon={<ShoppingBag className={ICON} />}
          onClick={onOpenMarketplace}
          tone={toneFor('marketplace')}
        />
      )}

      <DockButton
        label={t('dock.commandPalette')}
        tooltip={t('dock.commandPaletteHint')}
        icon={<Search className={ICON} />}
        onClick={onOpenCommandPalette}
      />

      <DockButton
        label={t('dock.appearance')}
        tooltip={t('dock.appearanceHint')}
        icon={<Palette className={ICON} />}
        onClick={onOpenAppearance}
        tone={toneFor('appearance')}
      />

      {onOpenAudio && (
        <DockButton
          label={t('dock.audio')}
          tooltip={isAudioPlaying ? t('dock.audioPlaying') : t('dock.audio')}
          icon={<Volume2 className={ICON} />}
          onClick={onOpenAudio}
          tone={isAudioPlaying || activePanel === 'audio' ? 'active' : 'default'}
        />
      )}

      {canEditGrid && (
        <DockButton
          label={isEditMode ? t('dock.finishEditing') : t('dock.editGrid')}
          icon={isEditMode ? <Unlock className={ICON} /> : <Lock className={ICON} />}
          onClick={onToggleEditMode}
          tone={isEditMode ? 'warning' : 'default'}
          pressed={isEditMode}
        />
      )}

      <DockDivider />

      <DockButton
        label={settingsLabel}
        tooltip={settingsLabel}
        icon={
          <>
            <Settings className={ICON} />
            {hubStatus.state !== 'disconnected' && (
              <span
                aria-hidden="true"
                className={`absolute end-1 top-1 size-2 rounded-full ring-2 ring-canvas ${hubStatusTone}`}
              />
            )}
          </>
        }
        onClick={onOpenSettings}
        tone={toneFor('settings')}
      />
    </nav>
  );
};
