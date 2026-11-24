import React from 'react';
import { useTranslation } from '@/core/i18n';
import { Input } from '@/ui/primitives';
import { isAllowedNexusUrl } from './nexusChatApi';
import type { NexusChatSettings } from './types';

export interface NexusChatSettingsFormProps {
  settings: NexusChatSettings;
  onChange: (newSettings: NexusChatSettings) => void;
}

/**
 * Форма настроек виджета Nexus Chat: маскирует Bearer-токен (type="password")
 * и валидирует URL подключения.
 */
export const NexusChatSettingsForm: React.FC<NexusChatSettingsFormProps> = ({
  settings,
  onChange,
}) => {
  const { t } = useTranslation();

  const endpointValue = settings.chatEndpointUrl ?? '';
  const adminValue = settings.adminUrl ?? '';
  const tokenValue = settings.bearerToken ?? '';
  const modelValue = settings.model ?? 'nexus-default';

  const endpointInvalid = endpointValue.trim().length > 0 && !isAllowedNexusUrl(endpointValue);
  const adminInvalid = adminValue.trim().length > 0 && !isAllowedNexusUrl(adminValue);

  const update = (patch: Partial<NexusChatSettings>) => {
    onChange({
      ...settings,
      ...patch,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 pb-4 border-b border-line/50">
        <h4 className="text-xs font-bold text-fg tracking-wide uppercase flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary" />
          {t('widgetSettings.sections.data')}
        </h4>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col">
            <Input
              type="url"
              autoComplete="off"
              label={t('widgetFields.nexusChat.chatEndpointUrl.label')}
              placeholder={t('widgetFields.nexusChat.chatEndpointUrl.placeholder')}
              value={endpointValue}
              error={endpointInvalid ? t('nexusChat.invalidEndpoint') : undefined}
              onChange={(event) => update({ chatEndpointUrl: event.target.value })}
            />
            <p className="text-xs text-fg-muted mt-1 leading-relaxed">
              {t('widgetFields.nexusChat.chatEndpointUrl.help')}
            </p>
          </div>

          <div className="flex flex-col">
            <Input
              type="url"
              autoComplete="off"
              label={t('widgetFields.nexusChat.adminUrl.label')}
              placeholder={t('widgetFields.nexusChat.adminUrl.placeholder')}
              value={adminValue}
              error={adminInvalid ? t('nexusChat.invalidEndpoint') : undefined}
              onChange={(event) => update({ adminUrl: event.target.value })}
            />
            <p className="text-xs text-fg-muted mt-1 leading-relaxed">
              {t('widgetFields.nexusChat.adminUrl.help')}
            </p>
          </div>

          <div className="flex flex-col">
            <Input
              type="password"
              autoComplete="off"
              spellCheck={false}
              label={t('widgetFields.nexusChat.bearerToken.label')}
              placeholder={t('widgetFields.nexusChat.bearerToken.placeholder')}
              value={tokenValue}
              onChange={(event) => update({ bearerToken: event.target.value })}
            />
            <p className="text-xs text-fg-muted mt-1 leading-relaxed">
              {t('widgetFields.nexusChat.bearerToken.help')}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h4 className="text-xs font-bold text-fg tracking-wide uppercase flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary" />
          {t('widgetSettings.sections.behavior')}
        </h4>
        <div className="flex flex-col">
          <Input
            type="text"
            label={t('widgetFields.nexusChat.model.label')}
            placeholder={t('widgetFields.nexusChat.model.placeholder')}
            value={modelValue}
            onChange={(event) => update({ model: event.target.value })}
          />
          <p className="text-xs text-fg-muted mt-1 leading-relaxed">
            {t('widgetFields.nexusChat.model.help')}
          </p>
        </div>
      </div>
    </div>
  );
};
