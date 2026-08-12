import React from 'react';
import { useThemeStore } from '../stores/useThemeStore';
import { Button } from '@/components/ui/Button';

export const CustomThemeBuilder: React.FC = () => {
  const { colors, setCustomColor } = useThemeStore();

  const colorFields: Array<{ key: keyof typeof colors; label: string }> = [
    { key: 'bg', label: 'Фон приложения (Background)' },
    { key: 'surface', label: 'Поверхность карточек (Surface)' },
    { key: 'primary', label: 'Основной акцент (Primary)' },
    { key: 'secondary', label: 'Вторичный акцент (Secondary)' },
    { key: 'text', label: 'Цвет текста (Text)' },
    { key: 'textMuted', label: 'Приглушенный текст (Muted)' },
    { key: 'border', label: 'Границы блоков (Border)' },
  ];

  return (
    <div className="space-y-4 p-4 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]">
      <h4 className="text-xs font-semibold text-[var(--color-secondary)] uppercase tracking-wider">
        Конструктор Цветовой Палитры
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {colorFields.map((field) => (
          <div key={field.key} className="flex items-center justify-between p-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
            <span className="text-xs font-medium text-[var(--color-text)] truncate mr-2">{field.label}</span>
            <input
              type="color"
              value={colors[field.key].startsWith('#') ? colors[field.key] : '#12232e'}
              onChange={(e) => setCustomColor(field.key, e.target.value)}
              className="w-8 h-8 rounded-lg cursor-pointer border border-[var(--color-border)] bg-transparent p-0"
            />
          </div>
        ))}
      </div>
    </div>
  );
};
