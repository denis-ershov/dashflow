import { useTranslation } from '@/core/i18n';
import { useHubStatus } from './useHubStatus';

export function HubDiagnostics() {
  const { t, formatDate } = useTranslation();
  const status = useHubStatus();

  return (
    <section
      className="space-y-2 rounded-xl border border-line bg-surface p-4"
      aria-labelledby="hub-diagnostics-title"
    >
      <h3 id="hub-diagnostics-title" className="text-sm font-semibold text-fg">
        {t('hub.title')}
      </h3>
      <p className="text-sm text-fg-muted" role="status">
        {t(`hub.${status.state}`)}
      </p>
      {status.origin && <p className="break-all text-xs text-fg-muted">{status.origin}</p>}
      {status.issue && <p className="text-xs text-warning">{t(`hub.issue.${status.issue}`)}</p>}
      {status.lastSync !== undefined && (
        <p className="text-xs text-fg-muted">
          {t('hub.lastSync')}:{' '}
          {formatDate(status.lastSync, { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      )}
      {status.retryAt !== undefined && (
        <p className="text-xs text-fg-muted">
          {t('hub.retryAt')}: {formatDate(status.retryAt, { timeStyle: 'short' })}
        </p>
      )}
    </section>
  );
}
