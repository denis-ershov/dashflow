import { useState } from 'react';
import { useTranslation } from '@/core/i18n';
import { Button } from '@/ui/primitives';
import { useHubStatus } from '@/features/hub/useHubStatus';
import { useHubAgents, type HubAgentPreview } from './useHubAgents';

function isoDate(value: string, endOfDay = false): string | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`);
  if (Number.isNaN(date.valueOf())) return undefined;
  return endOfDay
    ? new Date(Math.min(Date.now(), date.valueOf())).toISOString()
    : date.toISOString();
}

export function AgentsSettings() {
  const { t, formatDate, formatNumber } = useTranslation();
  const status = useHubStatus();
  const hub = useHubAgents(status.state === 'connected');
  const [range, setRange] = useState<Record<string, { since: string; until: string }>>({});
  const [previews, setPreviews] = useState<Record<string, HubAgentPreview>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);

  const updateRange = (id: string, key: 'since' | 'until', value: string) => {
    setRange((current) => ({
      ...current,
      [id]: { since: '', until: '', ...current[id], [key]: value },
    }));
    setPreviews((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const preview = async (id: string) => {
    const selected = range[id];
    const since = isoDate(selected?.since ?? '');
    const until = isoDate(selected?.until ?? '', true);
    if (busy) return;
    if (!since || (selected?.until && !until) || (until && until < since)) {
      setOperationError(id);
      return;
    }
    setBusy(id);
    setOperationError(null);
    try {
      const result = await hub.previewRollback(id, since, until);
      setPreviews((current) => ({ ...current, [id]: result }));
    } catch {
      setOperationError(id);
    } finally {
      setBusy(null);
    }
  };

  const rollback = async (id: string) => {
    const result = previews[id];
    if (busy || !result?.eligible) return;
    setBusy(id);
    if (await hub.rollback(id, result))
      setPreviews((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    setBusy(null);
  };

  const revoke = async (id: string) => {
    setBusy(id);
    await hub.revoke(id);
    setBusy(null);
  };

  return (
    <section className="space-y-4" aria-labelledby="agents-settings-title">
      <div className="space-y-1">
        <h3 id="agents-settings-title" className="text-sm font-semibold text-fg">
          {t('agents.title')}
        </h3>
        <p className="text-xs text-fg-muted">{t('agents.description')}</p>
      </div>
      {status.state !== 'connected' ? (
        <p
          className="rounded-lg border border-line bg-surface p-4 text-sm text-fg-muted"
          role="status"
        >
          {t('agents.disconnected')}
        </p>
      ) : hub.loading ? (
        <p
          className="rounded-lg border border-line bg-surface p-4 text-sm text-fg-muted"
          role="status"
          aria-busy="true"
        >
          {t('agents.loading')}
        </p>
      ) : hub.issue ? (
        <div
          className="rounded-lg border border-warning/30 bg-warning/10 p-4 space-y-3"
          role="alert"
        >
          <p className="text-sm text-fg">{t('agents.error')}</p>
          <Button size="sm" variant="secondary" onClick={() => void hub.refresh()}>
            {t('agents.retry')}
          </Button>
        </div>
      ) : hub.agents.length === 0 ? (
        <p
          className="rounded-lg border border-line bg-surface p-4 text-sm text-fg-muted"
          role="status"
        >
          {t('agents.empty')}
        </p>
      ) : (
        <div className="space-y-3">
          {hub.agents.map((agent) => {
            const selected = range[agent.id] ?? { since: '', until: '' };
            const result = previews[agent.id];
            const revoked = Boolean(agent.revokedAt);
            return (
              <article
                key={agent.id}
                className="space-y-3 rounded-xl border border-line bg-surface p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <h4 className="break-words text-sm font-semibold text-fg">{agent.name}</h4>
                    <p className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-xs text-fg-muted">
                      <span>{t('agents.id')}</span>
                      <code className="wrap-anywhere">{agent.id}</code>
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs ${revoked ? 'bg-surface text-fg-muted' : 'bg-success/10 text-success'}`}
                  >
                    {t(revoked ? 'agents.revoked' : 'agents.active')}
                  </span>
                </div>
                <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                  <div>
                    <dt className="text-fg-muted">{t('agents.createdAt')}</dt>
                    <dd className="text-fg">
                      {formatDate(new Date(agent.createdAt), {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-fg-muted">{t('agents.lastUsedAt')}</dt>
                    <dd className="text-fg">
                      {agent.lastUsedAt
                        ? formatDate(new Date(agent.lastUsedAt), {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : t('agents.never')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-fg-muted">{t('agents.createdItems')}</dt>
                    <dd className="text-fg">{formatNumber(agent.createdItems)}</dd>
                  </div>
                  {agent.expiresAt && (
                    <div>
                      <dt className="text-fg-muted">{t('agents.expiresAt')}</dt>
                      <dd className="text-fg">
                        {formatDate(new Date(agent.expiresAt), {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </dd>
                    </div>
                  )}
                </dl>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-fg">{t('agents.scopes')}</p>
                  <ul className="flex flex-wrap gap-2" aria-label={t('agents.scopes')}>
                    {agent.scopes.map((scope) => (
                      <li
                        key={scope}
                        className="rounded-md border border-line px-2 py-1 font-mono text-xs text-fg-muted"
                      >
                        {scope}
                      </li>
                    ))}
                  </ul>
                </div>
                {!revoked && (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      if (busy) return;
                      if (!window.confirm(t('agents.confirmRevoke', { name: agent.name }))) return;
                      void revoke(agent.id);
                    }}
                    loading={busy === agent.id}
                  >
                    {t('agents.revoke')}
                  </Button>
                )}
                <div className="border-t border-line pt-3 space-y-3">
                  <p className="text-xs font-semibold text-fg">{t('agents.rollbackTitle')}</p>
                  <p className="text-xs text-fg-muted">{t('agents.rollbackHint')}</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="space-y-1 text-xs text-fg">
                      <span>{t('agents.since')}</span>
                      <input
                        type="date"
                        value={selected.since}
                        onChange={(event) =>
                          updateRange(agent.id, 'since', event.currentTarget.value)
                        }
                        className="min-h-11 w-full rounded-lg border border-line bg-canvas px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary"
                      />
                    </label>
                    <label className="space-y-1 text-xs text-fg">
                      <span>{t('agents.until')}</span>
                      <input
                        type="date"
                        value={selected.until}
                        onChange={(event) =>
                          updateRange(agent.id, 'until', event.currentTarget.value)
                        }
                        className="min-h-11 w-full rounded-lg border border-line bg-canvas px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary"
                      />
                    </label>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={
                      !selected.since || Boolean(selected.until && selected.until < selected.since)
                    }
                    loading={busy === agent.id}
                    onClick={() => void preview(agent.id)}
                  >
                    {t('agents.preview')}
                  </Button>
                  {operationError === agent.id && (
                    <p role="alert" className="text-sm text-danger">
                      {t('agents.operationError')}
                    </p>
                  )}
                  {result && (
                    <div
                      className="space-y-2 rounded-lg border border-warning/30 bg-warning/10 p-3"
                      role="status"
                    >
                      <p className="text-xs font-semibold text-fg">{t('agents.previewReady')}</p>
                      <p className="text-xs text-fg">
                        {t('agents.previewCounts', {
                          matched: result.matched,
                          eligible: result.eligible,
                          skipped: result.skipped,
                        })}
                      </p>
                      <p className="text-xs text-fg-muted">
                        {formatDate(new Date(result.since), { dateStyle: 'medium' })} –{' '}
                        {formatDate(new Date(result.until), { dateStyle: 'medium' })}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={!result.eligible}
                          loading={busy === agent.id}
                          onClick={() => void rollback(agent.id)}
                        >
                          {t('agents.confirmRollback')}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            setPreviews((current) => {
                              const next = { ...current };
                              delete next[agent.id];
                              return next;
                            })
                          }
                        >
                          {t('agents.cancel')}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
