import React from 'react';
import { useTranslation } from '@/core/i18n';
import { Drawer } from '@/ui/overlays/Drawer';
import { Slider, Button, Switch } from '@/ui/primitives';
import { useAudioStore, AMBIENT_SOUNDS } from '@/core/audio';
import { Volume2, VolumeX, Square } from 'lucide-react';
import { cn } from '@/ui/lib/cn';

export interface AmbientSoundDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AmbientSoundDrawer: React.FC<AmbientSoundDrawerProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const {
    activeTracks,
    trackVolumes,
    masterVolume,
    isMuted,
    toggleTrack,
    setTrackVolume,
    setMasterVolume,
    toggleMute,
    stopAll,
  } = useAudioStore();

  const isAnyPlaying = Object.values(activeTracks).some(Boolean);

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={t('audio.title')}>
      <div className="flex flex-col gap-6 py-2">
        {/* Мастер-контроль */}
        <div className="glass-panel p-4 rounded-lg border border-line flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
              {t('audio.masterVolume')}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleMute}
                aria-label={isMuted ? t('audio.unmute') : t('audio.mute')}
                className="p-1 rounded-lg text-fg-muted hover:text-fg hover:bg-surface transition-colors cursor-pointer"
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-danger" />
                ) : (
                  <Volume2 className="w-4 h-4 text-primary" />
                )}
              </button>
              {isAnyPlaying && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={stopAll}
                  icon={<Square className="w-4 h-4" />}
                  className="text-xs text-danger hover:bg-danger/10"
                >
                  {t('audio.stopAll')}
                </Button>
              )}
            </div>
          </div>

          <Slider
            min={0}
            max={100}
            step={1}
            value={Math.round(masterVolume * 100)}
            onChange={(val) => setMasterVolume(val / 100)}
            unit="%"
          />
        </div>

        {/* Список звуковых ландшафтов */}
        <div className="flex flex-col gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted px-1">
            {t('audio.layers')}
          </span>

          {AMBIENT_SOUNDS.map((sound) => {
            const isActive = Boolean(activeTracks[sound.id]);
            const currentVolume = trackVolumes[sound.id] ?? 0.5;

            return (
              <div
                key={sound.id}
                className={cn(
                  'glass-panel p-4 rounded-lg border transition-all flex flex-col gap-3',
                  isActive
                    ? 'border-primary/40 shadow-[0_0_16px_var(--dashflow-primary-glow)] bg-primary/5'
                    : 'border-line hover:border-line-hover',
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl select-none" role="img" aria-hidden="true">
                      {sound.icon}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-fg tracking-tight">
                        {t(`audio.sounds.${sound.id}.name`)}
                      </div>
                      <div className="text-xs text-fg-muted mt-1">
                        {t(`audio.sounds.${sound.id}.description`)}
                      </div>
                    </div>
                  </div>

                  <Switch
                    checked={isActive}
                    onChange={() => toggleTrack(sound.id)}
                    aria-label={t('audio.enableLayer', {
                      name: t(`audio.sounds.${sound.id}.name`),
                    })}
                  />
                </div>

                {isActive && (
                  <div className="pt-2 border-t border-line duration-fast">
                    <Slider
                      min={0}
                      max={100}
                      step={1}
                      value={Math.round(currentVolume * 100)}
                      onChange={(val) => setTrackVolume(sound.id, val / 100)}
                      label={t('audio.layerVolume')}
                      unit="%"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Drawer>
  );
};
