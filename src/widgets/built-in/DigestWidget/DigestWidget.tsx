import { useRef, useState } from 'react';
import { browser } from 'wxt/browser';
import { useTranslation } from '@/core/i18n';
import { itemRepository, type Item, useItems } from '@/core/items';
import { asRecord } from '@/core/network/jsonReaders';
import {
  DIGEST_READ,
  DIGEST_SOURCE,
  GENERATE_DIGEST_MESSAGE,
  morningRunTime,
} from '@/core/digest/model';
import { MarkdownPreview } from '@/ui/feedback/MarkdownPreview';
import { Button } from '@/ui/primitives/Button';
import { useDigestSchedule } from './useDigestSchedule';

const ARCHIVE_PAGE_SIZE = 20;

function DigestBody({
  digest,
  onRead,
  busy,
}: {
  digest: Item;
  onRead: (id: string) => void;
  busy: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="min-w-0 space-y-2 wrap-anywhere">
      {digest.body && <MarkdownPreview text={digest.body} allowLinks />}
      {digest.status !== DIGEST_READ && (
        <Button
          type="button"
          variant="secondary"
          className="min-h-11 whitespace-normal"
          disabled={busy}
          onClick={() => onRead(digest.id)}
        >
          {t('digest.markRead')}
        </Button>
      )}
    </div>
  );
}

function ArchivedDigest({ digest, onRead, busy }: Parameters<typeof DigestBody>[0]) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <details
      className="min-w-0 rounded-xl border border-line px-3"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="min-h-11 cursor-pointer py-3 wrap-anywhere text-sm text-fg focus-visible:outline-2 focus-visible:outline-primary">
        {digest.title}
        {digest.status !== DIGEST_READ && (
          <span className="ms-2 text-xs font-medium text-fg-muted">{t('digest.unread')}</span>
        )}
      </summary>
      {open && (
        <div className="pb-3">
          <DigestBody digest={digest} onRead={onRead} busy={busy} />
        </div>
      )}
    </details>
  );
}

export function DigestWidget() {
  const { t, formatDate } = useTranslation();
  const { items, loading, error } = useItems(itemRepository, {
    kind: 'digest',
    sort: 'createdAt',
    includeArchived: true,
  });
  const schedule = useDigestSchedule();
  const generateButton = useRef<HTMLButtonElement>(null);
  const [archiveLimit, setArchiveLimit] = useState(ARCHIVE_PAGE_SIZE);
  const [pending, setPending] = useState<'generate' | 'read' | null>(null);
  const [feedback, setFeedback] = useState<'available' | 'generationError' | 'readError' | null>(
    null,
  );
  const latest = items.find((item) => item.status !== DIGEST_READ && !item.archivedAt);
  const archive = items.filter((item) => item.id !== latest?.id);
  const time = formatDate(morningRunTime(new Date()), { hour: 'numeric', minute: '2-digit' });

  async function act(action: () => Promise<void>, failure: 'generationError' | 'readError') {
    setPending(failure === 'generationError' ? 'generate' : 'read');
    setFeedback(null);
    try {
      await action();
    } catch {
      setFeedback(failure);
    } finally {
      setPending(null);
    }
  }

  function generate() {
    void act(async () => {
      const response = asRecord(await browser.runtime.sendMessage(GENERATE_DIGEST_MESSAGE));
      if (response.success !== true) throw new Error('digest-generation-failed');
      setFeedback('available');
    }, 'generationError');
  }

  function markRead(id: string) {
    void act(async () => {
      await itemRepository.update(id, { status: DIGEST_READ }, DIGEST_SOURCE);
      requestAnimationFrame(() => {
        if (document.activeElement === document.body) generateButton.current?.focus();
      });
    }, 'readError');
  }

  return (
    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto space-y-4 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          ref={generateButton}
          type="button"
          className="min-h-11 max-w-full whitespace-normal"
          disabled={pending !== null}
          loading={pending === 'generate'}
          onClick={generate}
        >
          {t(pending === 'generate' ? 'digest.generating' : 'digest.generate')}
        </Button>
        <label className="flex min-h-11 min-w-0 items-center gap-2 text-sm text-fg-muted">
          <input
            type="checkbox"
            className="size-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-primary"
            checked={schedule.enabled === true}
            disabled={schedule.pending || schedule.enabled === null}
            onChange={(event) => void schedule.update(event.currentTarget.checked)}
          />
          {t('digest.daily', { time })}
        </label>
      </div>
      {schedule.error && (
        <p role="alert" className="text-sm text-danger">
          {t('digest.scheduleError')}
        </p>
      )}
      {feedback && (
        <p role={feedback === 'available' ? 'status' : 'alert'} className="text-sm text-fg-muted">
          {t(`digest.${feedback}`)}
        </p>
      )}
      {loading && (
        <p role="status" className="text-sm text-fg-muted">
          {t('digest.loading')}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {t('digest.loadError')}
        </p>
      )}
      {!loading && !error && !latest && (
        <div role="status" className="space-y-1 text-sm">
          <p className="font-medium text-fg">
            {t(items.length ? 'digest.noUnread' : 'digest.empty')}
          </p>
          <p className="text-fg-muted">
            {t(items.length ? 'digest.noUnreadHint' : 'digest.emptyHint')}
          </p>
        </div>
      )}
      {latest && (
        <article className="min-w-0 rounded-xl border border-line p-3">
          <h3 className="mb-2 wrap-anywhere font-semibold text-fg">{latest.title}</h3>
          <DigestBody digest={latest} onRead={markRead} busy={pending !== null} />
        </article>
      )}
      {archive.length > 0 && (
        <section aria-label={t('digest.archive')} className="space-y-2">
          <h3 className="text-sm font-semibold text-fg">{t('digest.archive')}</h3>
          {archive.slice(0, archiveLimit).map((digest) => (
            <ArchivedDigest
              key={digest.id}
              digest={digest}
              onRead={markRead}
              busy={pending !== null}
            />
          ))}
          {archive.length > archiveLimit && (
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 whitespace-normal"
              onClick={() => setArchiveLimit((value) => value + ARCHIVE_PAGE_SIZE)}
            >
              {t('digest.more')}
            </Button>
          )}
        </section>
      )}
    </div>
  );
}
