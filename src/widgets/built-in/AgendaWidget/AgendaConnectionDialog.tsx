import { useState, type FormEvent } from 'react';
import { CALENDAR_URL_LIMIT, readCalendarUrl } from '@/core/calendar/calendarFeed';
import { useTranslation, type TranslationKey } from '@/core/i18n';
import { originPatternFor, requestBrowserPermissions } from '@/core/permissions/browserPermissions';
import { Modal } from '@/ui/overlays';
import { Button, Input } from '@/ui/primitives';
import { setCalendarConnection } from './calendarConnection';

export function AgendaConnectionDialog({
  connected,
  onClose,
}: {
  connected: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TranslationKey>();

  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const url = readCalendarUrl(input);
    const origin = url && originPatternFor(url);
    if (!origin || !url) {
      setError('agenda.invalidUrl');
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      if (!(await requestBrowserPermissions({ origins: [origin] }))) {
        setError('agenda.permission');
        return;
      }
      setCalendarConnection(url);
      onClose();
    } catch {
      setError('agenda.saveError');
    } finally {
      setBusy(false);
    }
  }

  function disconnect() {
    try {
      setCalendarConnection(undefined);
      onClose();
    } catch {
      setError('agenda.saveError');
    }
  }

  return (
    <Modal
      isOpen
      onClose={() => {
        if (!busy) onClose();
      }}
      title={t('agenda.calendar')}
      maxWidth="sm"
    >
      <form className="space-y-3" onSubmit={(event) => void connect(event)}>
        <Input
          label={t('agenda.url')}
          type="password"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          maxLength={CALENDAR_URL_LIMIT}
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
            setError(undefined);
          }}
          disabled={busy}
          required
        />
        <p className="text-xs text-fg-muted">{t('agenda.privacy')}</p>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {t(error)}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          {connected && (
            <Button variant="ghost" disabled={busy} onClick={disconnect}>
              {t('agenda.disconnect')}
            </Button>
          )}
          <Button type="submit" loading={busy} disabled={!input.trim()}>
            {t('agenda.connect')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
