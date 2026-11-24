import { useRef, useState, type FormEvent } from 'react';
import { browser } from 'wxt/browser';
import {
  HUB_DEFAULT_ORIGIN,
  HUB_DISCONNECT,
  HUB_PAIR,
  HUB_RETRY,
  normalizeHubOrigin,
  type HubFailure,
} from '@/core/hub/model';
import { originPatternFor } from '@/core/permissions/browserPermissions';
import { Button } from '@/ui/primitives';
import { useTranslation, type TranslationKey } from '@/core/i18n';
import { useHubStatus } from './useHubStatus';

const HUB_FAILURES = new Set<HubFailure>([
  'address',
  'permissions',
  'pairing',
  'unauthorized',
  'network',
  'data',
  'size',
]);

function extensionOrigin(): string {
  try {
    const { protocol, host } = new URL(browser.runtime.getURL('/'));
    return `${protocol}//${host}`;
  } catch {
    return '';
  }
}

function issueFrom(value: unknown): HubFailure {
  if (typeof value === 'object' && value !== null && 'issue' in value) {
    const issue = value.issue;
    if (typeof issue === 'string' && HUB_FAILURES.has(issue as HubFailure)) {
      return issue as HubFailure;
    }
  }
  return 'data';
}

function statusKey(state: ReturnType<typeof useHubStatus>['state']): TranslationKey {
  return `hub.${state}` as TranslationKey;
}

export function HubSettings() {
  const { t, formatDate } = useTranslation();
  const status = useHubStatus();
  const [origin, setOrigin] = useState(HUB_DEFAULT_ORIGIN);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [formIssue, setFormIssue] = useState<HubFailure | null>(null);
  const busyRef = useRef(false);

  const runControl = async (type: typeof HUB_DISCONNECT | typeof HUB_RETRY) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setFormIssue(null);
    try {
      const result: unknown = await browser.runtime.sendMessage({ type });
      if (
        typeof result !== 'object' ||
        result === null ||
        !('ok' in result) ||
        result.ok !== true
      ) {
        setFormIssue(issueFrom(result));
      }
    } catch {
      setFormIssue('network');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const connect = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busyRef.current) return;
    const normalizedOrigin = normalizeHubOrigin(origin);
    if (!normalizedOrigin) {
      setFormIssue('address');
      return;
    }
    if (!/^\d{6}$/u.test(code)) {
      setFormIssue('pairing');
      return;
    }
    const pattern = originPatternFor(normalizedOrigin);
    if (!pattern) {
      setFormIssue('address');
      return;
    }

    busyRef.current = true;
    setBusy(true);
    setFormIssue(null);
    let permissionRequest: Promise<boolean>;
    try {
      permissionRequest = browser.permissions.request({ origins: [pattern] });
    } catch {
      busyRef.current = false;
      setBusy(false);
      setFormIssue('permissions');
      return;
    }

    void permissionRequest
      .then(async (granted) => {
        if (!granted) {
          setFormIssue('permissions');
          return;
        }
        const result: unknown = await browser.runtime.sendMessage({
          type: HUB_PAIR,
          origin: normalizedOrigin,
          code,
        });
        if (
          typeof result !== 'object' ||
          result === null ||
          !('ok' in result) ||
          result.ok !== true
        ) {
          setFormIssue(issueFrom(result));
        } else {
          setCode('');
        }
      })
      .catch(() => setFormIssue('network'))
      .finally(() => {
        busyRef.current = false;
        setBusy(false);
      });
  };

  return (
    <section
      className="space-y-3 rounded-xl border border-line bg-surface p-4"
      aria-labelledby="hub-settings-title"
    >
      <div className="space-y-1">
        <h3 id="hub-settings-title" className="text-sm font-semibold text-fg">
          {t('hub.title')}
        </h3>
        <p className="text-xs text-fg-muted">{t('hub.description')}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-fg" role="status">
          <span
            aria-hidden="true"
            className={`size-2 rounded-full ${
              status.state === 'connected'
                ? 'bg-success'
                : status.state === 'offline' || status.state === 'error'
                  ? 'bg-warning'
                  : status.state === 'connecting'
                    ? 'bg-primary'
                    : 'bg-fg-dim'
            }`}
          />
          {t(statusKey(status.state))}
        </span>
        {status.origin && (
          <span className="max-w-full break-all text-xs text-fg-muted">{status.origin}</span>
        )}
      </div>

      {status.issue && (
        <p className="text-xs text-warning" role="alert">
          {t(`hub.issue.${status.issue}`)}
        </p>
      )}
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

      {status.state === 'disconnected' ? (
        <form className="space-y-3" onSubmit={connect}>
          <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-fg">
            {t('hub.privacy')}
          </p>
          <label className="block space-y-1 text-xs font-medium text-fg" htmlFor="hub-origin">
            <span>{t('hub.endpoint')}</span>
            <input
              id="hub-origin"
              type="url"
              autoComplete="url"
              value={origin}
              onChange={(event) => setOrigin(event.currentTarget.value)}
              className="min-h-11 w-full rounded-lg border border-line bg-canvas px-3 text-sm text-fg focus-visible:outline-2 focus-visible:outline-primary"
              required
            />
          </label>
          <div className="space-y-1">
            <p className="text-xs text-fg-muted">{t('hub.pairInstructions')}</p>
            <code className="block select-all break-all rounded-lg bg-canvas p-2 text-xs text-fg">
              {t('hub.pairCommand')} {extensionOrigin() || t('hub.extensionOrigin')}
            </code>
            <p className="text-xs text-fg-muted">
              {t('hub.extensionOrigin')}:{' '}
              <code className="select-all">{extensionOrigin() || t('hub.extensionOrigin')}</code>
            </p>
            <p className="text-xs text-fg-muted">{t('hub.pairingHelp')}</p>
          </div>
          <label className="block space-y-1 text-xs font-medium text-fg" htmlFor="hub-code">
            <span>{t('hub.code')}</span>
            <input
              id="hub-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(event) =>
                setCode(event.currentTarget.value.replace(/\D/gu, '').slice(0, 6))
              }
              className="min-h-11 w-full rounded-lg border border-line bg-canvas px-3 font-mono text-base tracking-[0.3em] text-fg focus-visible:outline-2 focus-visible:outline-primary"
              required
            />
          </label>
          <Button type="submit" className="min-h-11 w-full" loading={busy} disabled={busy}>
            {t('hub.pair')}
          </Button>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          {status.state !== 'connected' && (
            <Button
              variant="secondary"
              className="min-h-11"
              loading={busy && status.state !== 'connecting'}
              disabled={busy || status.state === 'connecting'}
              onClick={() => void runControl(HUB_RETRY)}
            >
              {t('hub.retry')}
            </Button>
          )}
          <Button
            variant="ghost"
            className="min-h-11"
            loading={busy && status.state === 'connected'}
            disabled={busy}
            onClick={() => void runControl(HUB_DISCONNECT)}
          >
            {t('hub.disconnect')}
          </Button>
        </div>
      )}

      {formIssue && (
        <p className="text-xs text-danger" role="alert">
          {t(`hub.issue.${formIssue}`)}
        </p>
      )}
    </section>
  );
}
