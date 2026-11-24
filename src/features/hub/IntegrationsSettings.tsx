import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import {
  HUB_INTEGRATIONS,
  HUB_INTEGRATION_POLL,
  readIntegrationStatus,
  type HubIntegrationStatus,
  type IntegrationId,
} from '@/core/hub/integrations';
import { useTranslation } from '@/core/i18n';
import { asRecord } from '@/core/network/jsonReaders';
import { Button } from '@/ui/primitives';
import { useHubStatus } from './useHubStatus';

async function readStatus() {
  const { ok, integrations } = asRecord(
    await browser.runtime.sendMessage({ type: HUB_INTEGRATIONS }),
  );
  if (ok !== true || !Array.isArray(integrations)) throw new Error('HUB_INTEGRATIONS_UNAVAILABLE');
  return integrations.map(readIntegrationStatus);
}

export function IntegrationsSettings() {
  const { t, formatDate } = useTranslation();
  const status = useHubStatus();
  const connected = status.state === 'connected';
  const [integrations, setIntegrations] = useState<HubIntegrationStatus[]>();
  const [failed, setFailed] = useState(false);
  const [request, setRequest] = useState<IntegrationId>();

  useEffect(() => {
    if (!connected || !browser?.runtime?.id) return;
    let active = true;
    const refresh = async () => {
      try {
        const result = await readStatus();
        if (active) {
          setIntegrations(result);
          setFailed(false);
        }
      } catch {
        if (active) setFailed(true);
      }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 10_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [connected]);

  async function poll(id: IntegrationId) {
    setRequest(id);
    try {
      const response = asRecord(
        await browser.runtime.sendMessage({ type: HUB_INTEGRATION_POLL, id }),
      );
      if (response.ok !== true) throw new Error('HUB_INTEGRATION_UNAVAILABLE');
      setIntegrations(await readStatus());
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setRequest(undefined);
    }
  }

  if (!connected)
    return (
      <p role="status" className="text-sm text-fg-muted">
        {t('integrations.connect')}
      </p>
    );

  return (
    <section className="space-y-3" aria-label={t('integrations.title')}>
      <p className="text-sm text-fg-muted">{t('integrations.configuration')}</p>
      {failed && (
        <p role="alert" className="text-sm text-danger">
          {t('integrations.loadError')}
        </p>
      )}
      {!integrations && !failed && <p role="status">{t('common.loading')}</p>}
      {integrations?.map((entry) => (
        <article key={entry.id} className="space-y-2 rounded-xl border border-line bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-fg">{t(`integrations.names.${entry.id}`)}</h3>
            <span className="text-sm text-fg-muted">{t(`integrations.states.${entry.state}`)}</span>
          </div>
          <dl className="space-y-1 text-sm text-fg-muted">
            {entry.lastSuccessAt && (
              <div>
                <dt>{t('integrations.lastSuccess')}</dt>
                <dd className="text-fg">
                  {formatDate(new Date(entry.lastSuccessAt), {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </dd>
              </div>
            )}
            {entry.lastError && (
              <div>
                <dt>{t('integrations.lastError')}</dt>
                <dd className="text-danger">{t(`integrations.errors.${entry.lastError}`)}</dd>
              </div>
            )}
          </dl>
          {entry.state !== 'disabled' && (
            <Button
              variant="secondary"
              size="sm"
              disabled={
                request !== undefined ||
                entry.state === 'polling' ||
                entry.lastError === 'CONFIGURATION'
              }
              loading={request === entry.id}
              onClick={() => void poll(entry.id)}
            >
              {t('integrations.poll')}
            </Button>
          )}
        </article>
      ))}
    </section>
  );
}
