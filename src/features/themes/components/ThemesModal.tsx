import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useThemeStore, PRESET_THEMES } from '@/features/themes/stores/useThemeStore';
import { CustomThemeBuilder } from './CustomThemeBuilder';
import { CssEditorModal } from './CssEditorModal';
import { Check, Palette, Image as ImageIcon, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const ThemesModal: React.FC = () => {
  const { activeModal, setActiveModal } = useDashboardStore();
  const { activeThemeId, setThemePreset, setBackground } = useThemeStore();
  const [isCssOpen, setIsCssOpen] = useState(false);

  const isOpen = activeModal === 'themes';

  const wallpapers = [
    { name: 'Dark Radial Glow', type: 'gradient' as const, value: 'radial-gradient(circle at 50% 0%, #1e293b 0%, #0f172a 100%)' },
    { name: 'Deep Space', type: 'gradient' as const, value: 'linear-gradient(135deg, #090d16 0%, #171026 100%)' },
    { name: 'Emerald Forest', type: 'gradient' as const, value: 'linear-gradient(135deg, #022c22 0%, #064e3b 100%)' },
    { name: 'Unsplash Nature', type: 'unsplash' as const, value: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1600&q=80' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setActiveModal(null)}
      title="Темы & Внешний вид (Themes & Customization)"
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Готовые пресеты тем */}
        <div>
          <div className="flex items-center space-x-2 text-sm font-semibold text-[var(--color-secondary)] mb-3">
            <Palette className="w-4 h-4" />
            <span>Готовые Пресеты Тем</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {PRESET_THEMES.map((preset) => {
              const isSelected = activeThemeId === preset.id;

              return (
                <button
                  key={preset.id}
                  onClick={() => setThemePreset(preset.id)}
                  className={`flex flex-col p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/30 bg-[var(--color-surface)]'
                      : 'border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-border-hover)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-[var(--color-text)]">{preset.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-[var(--color-primary)]" />}
                  </div>

                  <div className="flex space-x-1.5 mt-1">
                    <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: preset.colors.bg }} />
                    <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: preset.colors.surface }} />
                    <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: preset.colors.primary }} />
                    <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: preset.colors.secondary }} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Конструктор кастомных тем */}
        <CustomThemeBuilder />

        {/* Выбор фона / обоев */}
        <div className="pt-2 border-t border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2 text-sm font-semibold text-[var(--color-secondary)]">
              <ImageIcon className="w-4 h-4" />
              <span>Обои и Градиенты Фона</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {wallpapers.map((wp, idx) => (
              <button
                key={idx}
                onClick={() => setBackground({ type: wp.type, value: wp.value })}
                className="h-16 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-all overflow-hidden relative flex items-end p-2 cursor-pointer shadow-sm"
                style={{
                  background: wp.type === 'gradient' ? wp.value : `url('${wp.value}') center/cover`,
                }}
              >
                <span className="text-[10px] font-semibold text-white bg-black/60 px-1.5 py-0.5 rounded-md backdrop-blur-sm truncate w-full">
                  {wp.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Кнопка вызова CSS редактора */}
        <div className="pt-4 border-t border-[var(--color-border)] flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-[var(--color-text)]">Пользовательский CSS Editor</p>
            <p className="text-[10px] text-[var(--color-text-muted)]">Переопределение стилей элементов произвольным CSS кодом</p>
          </div>
          <Button size="sm" variant="secondary" icon={<Code2 className="w-4 h-4" />} onClick={() => setIsCssOpen(true)}>
            Открыть CSS Редактор
          </Button>
        </div>

        <CssEditorModal isOpen={isCssOpen} onClose={() => setIsCssOpen(false)} />
      </div>
    </Modal>
  );
};
