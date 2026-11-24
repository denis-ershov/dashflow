import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { CAPTURE_SOURCE, type CapturePage } from '@/core/capture/model';
import { useTranslation } from '@/core/i18n';
import { itemRepository } from '@/core/items/instance';
import { QUICK_CAPTURE_LIMIT, parseQuickCapture } from '@/core/items/quickParse';
import { ItemValidationError } from '@/core/items/validation';
import { Button } from '@/ui/primitives/Button';
import { Input } from '@/ui/primitives/Input';

export function QuickCaptureForm({
  page,
  checkingPage = false,
  onClose,
}: {
  page?: CapturePage;
  checkingPage?: boolean;
  onClose: () => void;
}) {
  const { language, t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const inFlight = useRef(false);
  const fieldId = useId();
  const [text, setText] = useState('');
  const [attached, setAttached] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<'invalid' | 'saveError'>();

  useEffect(() => {
    if (saved) close.current?.focus();
    else input.current?.focus();
  }, [saved]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || saved) return;
    inFlight.current = true;
    setSaving(true);
    setError(undefined);
    try {
      const raw = text.trim();
      const attachment = attached ? page : undefined;
      if (!raw && attachment) {
        await itemRepository.create(
          { ...attachment, kind: 'link', status: 'inbox' },
          CAPTURE_SOURCE,
        );
      } else {
        const draft = parseQuickCapture(raw, { locale: language });
        await itemRepository.create(
          { ...draft, url: attachment?.url, kind: 'task', status: 'inbox' },
          CAPTURE_SOURCE,
        );
      }
      setSaved(true);
    } catch (reason) {
      setError(reason instanceof ItemValidationError ? 'invalid' : 'saveError');
      input.current?.focus();
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-md space-y-4 p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-fg">{t('capture.title')}</h1>
      {saved ? (
        <div className="space-y-4">
          <p role="status" className="text-sm text-success">
            {t('capture.saved')}
          </p>
          <Button ref={close} variant="secondary" onClick={onClose}>
            {t('capture.close')}
          </Button>
        </div>
      ) : (
        <form className="space-y-3" onSubmit={(event) => void submit(event)}>
          <Input
            ref={input}
            id={fieldId}
            label={t('capture.input')}
            placeholder={t('capture.hint')}
            value={text}
            maxLength={QUICK_CAPTURE_LIMIT}
            readOnly={saving}
            aria-invalid={error === 'invalid' || undefined}
            aria-describedby={error ? `${fieldId}-status` : undefined}
            onChange={(event) => {
              setText(event.currentTarget.value);
              setError(undefined);
            }}
          />
          {checkingPage && (
            <p role="status" className="text-sm text-fg-muted">
              {t('capture.checkingPage')}
            </p>
          )}
          {page && (
            <label className="flex min-h-11 min-w-0 items-start gap-3 rounded-lg border border-line p-3 text-sm text-fg">
              <input
                type="checkbox"
                className="mt-0.5 size-5 shrink-0 accent-primary"
                checked={attached}
                disabled={saving}
                onChange={(event) => setAttached(event.currentTarget.checked)}
              />
              <span className="min-w-0 wrap-anywhere">
                {t('capture.attach')}
                <span className="block text-xs text-fg-muted">
                  {page.title} · {new URL(page.url).hostname}
                </span>
              </span>
            </label>
          )}
          {error && (
            <p id={`${fieldId}-status`} role="alert" className="text-sm text-danger">
              {t(`capture.${error}`)}
            </p>
          )}
          <Button type="submit" loading={saving} disabled={!text.trim() && !attached}>
            {t('capture.save')}
          </Button>
        </form>
      )}
    </main>
  );
}
