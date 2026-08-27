import React from 'react';
import { Drawer } from '@/ui/overlays';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { WidgetRegistry } from '@/widgets/core/WidgetRegistry';
import { Button } from '@/ui/primitives';
import { RssSettingsForm } from '@/plugins/rss-reader/RssSettingsForm';
import { BookmarksSettingsForm } from '@/widgets/built-in/BookmarksWidget/BookmarksSettingsForm';

export interface WidgetSettingsDrawerProps {
  instanceId: string | null;
  onClose: () => void;
}

export const WidgetSettingsDrawer: React.FC<WidgetSettingsDrawerProps> = ({
  instanceId,
  onClose,
}) => {
  const { widgets, updateWidgetSettings } = useDashboardStore();

  if (!instanceId) return null;

  const instance = widgets.find((w) => w.instanceId === instanceId);
  if (!instance) return null;

  const definition = WidgetRegistry.get(instance.widgetId);
  const currentSettings = (instance.settings || {}) as Record<string, unknown>;

  // Особенные формы настроек для сложных виджетов
  if (instance.widgetId === 'rssReader') {
    return (
      <Drawer
        isOpen={!!instanceId}
        onClose={onClose}
        title="Настройки RSS Ридера"
        subtitle="Мульти-микс источников и стили вида"
      >
        <RssSettingsForm instanceId={instanceId} onClose={onClose} />
      </Drawer>
    );
  }

  if (instance.widgetId === 'bookmarks') {
    return (
      <Drawer
        isOpen={!!instanceId}
        onClose={onClose}
        title="Настройки Загладок"
        subtitle="Синхронизация с Chrome и стили представления"
      >
        <BookmarksSettingsForm instanceId={instanceId} onClose={onClose} />
      </Drawer>
    );
  }

  const handleFieldChange = (fieldId: string, value: unknown) => {
    updateWidgetSettings(instanceId, {
      ...currentSettings,
      [fieldId]: value,
    });
  };

  const titleName = definition?.name || definition?.nameKey || instance.widgetId;

  return (
    <Drawer
      isOpen={!!instanceId}
      onClose={onClose}
      title={`Настройки: ${titleName}`}
      subtitle="Индивидуальная конфигурация виджета"
    >
      <div className="space-y-4">
        {!definition?.settingsSchema || (definition.settingsSchema as unknown[]).length === 0 ? (
          <p className="text-xs text-[var(--color-text-muted)] py-4 text-center">
            Для данного виджета не предусмотрено дополнительных параметров.
          </p>
        ) : (
          (definition.settingsSchema as Array<Record<string, unknown>>).map((field) => {
            const fieldId = String(field.id || field.key || '');
            const fieldLabel = String(field.label || field.labelKey || '');
            const val =
              currentSettings[fieldId] !== undefined
                ? currentSettings[fieldId]
                : field.defaultValue;

            return (
              <div key={fieldId} className="space-y-1">
                <label className="text-xs font-semibold text-[var(--color-text)]">
                  {fieldLabel}
                </label>

                {field.type === 'text' && (
                  <input
                    type="text"
                    value={typeof val === 'string' ? val : ''}
                    onChange={(e) => handleFieldChange(fieldId, e.target.value)}
                    className="w-full bg-[var(--color-surface)] text-xs text-[var(--color-text)] border border-[var(--color-border)] rounded-xl px-3 py-2 focus:outline-none focus:border-[var(--color-primary)]"
                  />
                )}

                {field.type === 'number' && (
                  <input
                    type="number"
                    value={typeof val === 'number' ? val : 0}
                    onChange={(e) => handleFieldChange(fieldId, Number(e.target.value))}
                    className="w-full bg-[var(--color-surface)] text-xs text-[var(--color-text)] border border-[var(--color-border)] rounded-xl px-3 py-2 focus:outline-none focus:border-[var(--color-primary)]"
                  />
                )}

                {field.type === 'boolean' && (
                  <label className="flex items-center space-x-2 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(val)}
                      onChange={(e) => handleFieldChange(fieldId, e.target.checked)}
                      className="w-4 h-4 rounded text-[var(--color-primary)]"
                    />
                    <span className="text-xs text-[var(--color-text-muted)]">Включить / Активировать</span>
                  </label>
                )}

                {field.type === 'select' && (
                  <select
                    value={typeof val === 'string' || typeof val === 'number' ? val : ''}
                    onChange={(e) => handleFieldChange(fieldId, e.target.value)}
                    className="w-full bg-[var(--color-surface)] text-xs text-[var(--color-text)] border border-[var(--color-border)] rounded-xl px-3 py-2 focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
                  >
                    {(field.options as Array<{ label?: string; labelKey?: string; value: string | number }> | undefined)?.map((opt) => (
                      <option key={String(opt.value)} value={opt.value}>
                        {opt.label || opt.labelKey || String(opt.value)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            );
          })
        )}

        <div className="pt-4 border-t border-[var(--color-border)] flex justify-end">
          <Button size="sm" variant="primary" onClick={onClose}>
            Готово
          </Button>
        </div>
      </div>
    </Drawer>
  );
};
