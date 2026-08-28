import React, { useState, useEffect } from 'react';
import { Drawer } from '@/ui/overlays/Drawer';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { WidgetRegistry } from '@/core/widget/registry';
import { WidgetSettingsForm } from '@/core/widget/WidgetSettingsForm';
import { Button } from '@/ui/primitives/Button';
import { useTranslation } from '@/core/i18n';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { Spinner } from '@/ui/feedback/Spinner';

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

  const instance = instances.find((w) => w.instanceId === instanceId);
  const definition = instance ? WidgetRegistry.get(instance.widgetId) : null;
  const currentSettings = (instance?.settings || {}) as Record<string, unknown>;

  const [CustomSettingsComp, setCustomSettingsComp] = useState<React.ComponentType<any> | null>(null);
  const [isLoadingComp, setIsLoadingComp] = useState(false);

  useEffect(() => {
    if (definition?.loadSettings) {
      setIsLoadingComp(true);
      definition
        .loadSettings()
        .then((mod) => {
          setCustomSettingsComp(() => mod.default);
        })
        .catch((err) => {
          console.error('[WidgetSettingsDrawer] Failed to load custom settings component:', err);
          setCustomSettingsComp(null);
        })
        .finally(() => {
          setIsLoadingComp(false);
        });
    } else {
      setCustomSettingsComp(null);
      setIsLoadingComp(false);
    }
  }, [definition]);

  if (!instanceId || !instance) return null;

  const handleSettingsChange = (newSettings: Record<string, unknown>) => {
    updateWidgetSettings(instanceId, newSettings);
  };

  const widgetName = definition?.nameKey ? t(definition.nameKey) : definition?.name || instance.widgetId;
  const hasSettings = (definition?.settingsSchema && definition.settingsSchema.length > 0) || !!definition?.loadSettings;

  return (
    <Drawer
      isOpen={!!instanceId}
      onClose={onClose}
      title={`Настройки: ${widgetName}`}
      subtitle="Индивидуальная конфигурация параметров виджета"
    >
      <div className="p-4 flex flex-col justify-between h-full">
        <div className="space-y-4">
          {isLoadingComp ? (
            <div className="flex items-center justify-center p-8">
              <Spinner size="md" />
            </div>
          ) : CustomSettingsComp ? (
            <CustomSettingsComp
              settings={currentSettings}
              onChange={handleSettingsChange}
            />
          ) : hasSettings && definition?.settingsSchema ? (
            <WidgetSettingsForm
              schema={definition.settingsSchema}
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
