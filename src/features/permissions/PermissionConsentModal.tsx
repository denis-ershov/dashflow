import React from 'react';
import { ShieldAlert, Globe, Bookmark, HardDrive, MapPin, AlertTriangle } from 'lucide-react';
import { Modal } from '@/ui/overlays/Modal';
import { Button } from '@/ui/primitives/Button';
import { useTranslation } from '@/core/i18n';
import { PermissionType, PERMISSION_DEFINITIONS } from '@/core/permissions/types';

export interface PermissionConsentModalProps {
  isOpen: boolean;
  widgetId: string;
  widgetTitle: string;
  author?: string;
  permissions: string[];
  onAllow: () => void;
  onDeny: () => void;
}

const PERMISSION_ICONS: Record<PermissionType, React.ReactNode> = {
  storage: <HardDrive className="w-5 h-5 text-primary" />,
  network: <Globe className="w-5 h-5 text-secondary" />,
  bookmarks: <Bookmark className="w-5 h-5 text-warning" />,
  geolocation: <MapPin className="w-5 h-5 text-danger" />,
};

export const PermissionConsentModal: React.FC<PermissionConsentModalProps> = ({
  isOpen,
  widgetTitle,
  author,
  permissions,
  onAllow,
  onDeny,
}) => {
  const { t } = useTranslation();

  const validPerms = permissions.filter((p): p is PermissionType => p in PERMISSION_DEFINITIONS);

  return (
    <Modal isOpen={isOpen} onClose={onDeny} title={t('permissions.title')} maxWidth="md">
      <div className="space-y-5 select-none">
        {/* Заголовок виджета */}
        <div className="p-3.5 rounded-xl bg-surface border border-line flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-fg truncate">{widgetTitle}</h4>
            <p className="text-xs text-fg-muted">
              {author ? `Автор: ${author}` : t('permissions.subtitle')}
            </p>
          </div>
        </div>

        {/* Список запрашиваемых разрешений */}
        <div className="space-y-2">
          <span className="text-xs font-medium text-fg-muted uppercase tracking-wider">
            Запрашиваемые права доступа:
          </span>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {validPerms.map((perm) => {
              const def = PERMISSION_DEFINITIONS[perm];
              const icon = PERMISSION_ICONS[perm];
              // @ts-expect-error key lookup
              const title = t(def.titleKey);
              // @ts-expect-error key lookup
              const desc = t(def.descriptionKey);

              return (
                <div
                  key={perm}
                  className="flex items-start gap-3 p-3 rounded-lg bg-surface/50 border border-line"
                >
                  <div className="p-1.5 rounded bg-surface shrink-0 mt-0.5">{icon}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-fg">{title}</span>
                      {def.isSensitive && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-warning/10 text-warning border border-warning/20">
                          Чувствительное
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-fg-muted mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Предупреждение безопасности */}
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-warning/10 border border-warning/20 text-warning text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">{t('permissions.warning')}</p>
        </div>

        {/* Кнопки действий (зоны нажатия >= 44x44 px) */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onDeny} className="min-h-[44px]">
            {t('permissions.deny')}
          </Button>
          <Button variant="primary" onClick={onAllow} className="min-h-[44px]">
            {t('permissions.allow')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
