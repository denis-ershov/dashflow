import React from 'react';
import { Drawer } from '@/ui/overlays/Drawer';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { WidgetRegistry } from '@/core/widget/registry';
import { WidgetSettingsForm } from '@/core/widget/WidgetSettingsForm';
import { Button } from '@/ui/primitives/Button';
import { useTranslation } from '@/core/i18n';
import { EmptyState } from '@/ui/feedback/EmptyState';

export interface WidgetSettingsDrawerProps {
  instanceId: string | null;
  onClose: () => void;
}

export const WidgetSettingsDrawer: React.FC<WidgetSettingsDrawerProps> = ({
  instanceId,
  onClose,
}) => {
  const { t } = useTranslation();
  const { instances, updateWidgetSettings } = useDashboardStore();

  if (!instanceId) return null;

  const instance = instances.find((w) => w.instanceId === instanceId);
  if (!instance) return null;

  const definition = WidgetRegistry.get(instance.widgetId);
  const currentSettings = (instance.settings || {}) as Record<string, unknown>;

  const handleSettingsChange = (newSettings: Record<string, unknown>) => {
    updateWidgetSettings(instanceId, newSettings);
  };

  // @ts-expect-error key lookup
  const widgetName = definition?.nameKey ? t(definition.nameKey) : definition?.name || instance.widgetId;
  const hasSettings = definition?.settingsSchema && definition.settingsSchema.length > 0;

  return (
    <Drawer
      isOpen={!!instanceId}
      onClose={onClose}
      title={`Настройки: ${widgetName}`}
      subtitle="Индивидуальная конфигурация параметров виджета"
    >
      <div className="p-4 flex flex-col justify-between h-full">
        <div className="space-y-4">
          {hasSettings ? (
            <WidgetSettingsForm
              schema={definition.settingsSchema!}
              values={currentSettings}
              onChange={handleSettingsChange}
            />
          ) : (
            <EmptyState
              title="Нет настроек"
              description="Для данного виджета не предусмотрено дополнительных параметров"
            />
          )}
        </div>

        <div className="pt-4 border-t border-line flex justify-end">
          <Button variant="primary" size="sm" onClick={onClose}>
            Готово
          </Button>
        </div>
      </div>
    </Drawer>
  );
};
