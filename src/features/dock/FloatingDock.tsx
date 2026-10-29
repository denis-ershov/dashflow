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
} from 'lucide-react';
import { Tooltip } from '@/ui/primitives';
import { useTranslation } from '@/core/i18n';

/** Панель или режим, который сейчас открыт кнопкой дока — подсвечивается как активный */
export type DockPanel = 'addWidget' | 'marketplace' | 'appearance' | 'audio' | 'settings';

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
  /** Классы обёртки, например чтобы скрыть кнопку на узких экранах */
  wrapperClassName?: string;
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
  wrapperClassName,
}) => (
  <div className={cn('flex', wrapperClassName)}>
    <Tooltip content={tooltip}>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-pressed={pressed}
        className={cn(
          'size-11 rounded-full flex items-center justify-center cursor-pointer transition-colors duration-fast active:scale-95',
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
  isEditMode = false,
  onToggleEditMode,
  isAudioPlaying = false,
  activePanel = null,
  className,
}) => {
  const { t } = useTranslation();
  const toneFor = (panel: DockPanel): DockButtonTone =>
    activePanel === panel ? 'active' : 'default';
  const isZen = layoutMode === 'zen';
  const canEditGrid = onToggleEditMode && (layoutMode === 'modular' || layoutMode === 'canvas');

  return (
    <nav
      aria-label={t('dock.label')}
      className={cn(
        'fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-(--z-rail,30)',
        'glass-pill p-1 sm:p-1.5 flex items-center gap-0.5 sm:gap-1 shadow-3 select-none',
        'max-w-[calc(100vw-1.5rem)]',
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

      {/* Палитра команд рассчитана на клавиатуру (Ctrl+K) — на телефоне не нужна и не помещается */}
      <DockButton
        label={t('dock.commandPalette')}
        tooltip={t('dock.commandPaletteHint')}
        icon={<Search className={ICON} />}
        onClick={onOpenCommandPalette}
        wrapperClassName="hidden sm:flex"
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
        label={t('dock.settings')}
        icon={<Settings className={ICON} />}
        onClick={onOpenSettings}
        tone={toneFor('settings')}
      />
    </nav>
  );
};
