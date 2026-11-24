import { useRef, useState } from 'react';
import { BookmarkPlus, ExternalLink } from 'lucide-react';
import { useTranslation } from '@/core/i18n';
import { Modal } from '@/ui/overlays';
import { Button } from '@/ui/primitives';
import { saveArticle } from './saveArticle';
import type { RssItem } from './types';

interface Props {
  item: RssItem;
  openInNewTab: boolean;
  readError: boolean;
  onClose: () => void;
}

export function RssArticleDialog({ item, openInNewTab, readError, onClose }: Props) {
  const { t, formatDate } = useTranslation();
  const [saveState, setSaveState] = useState<'saving' | 'saved' | 'existing' | 'error'>();
  const saving = useRef(false);
  const save = async () => {
    if (saving.current) return;
    saving.current = true;
    setSaveState('saving');
    try {
      setSaveState(await saveArticle(item, t('rss.untitled')));
    } catch {
      setSaveState('error');
    } finally {
      saving.current = false;
    }
  };

  return (
    <Modal isOpen title={t('rss.readerTitle')} maxWidth="xl" onClose={onClose}>
      <article className="min-w-0 space-y-4 wrap-anywhere">
        <h4 className="text-xl font-semibold text-fg">{item.title || t('rss.untitled')}</h4>
        <ul className="flex flex-wrap gap-2 text-xs text-fg-muted">
          {item.feedName && <li>{item.feedName}</li>}
          {item.author && <li>{item.author}</li>}
          {Boolean(item.timestamp) && (
            <li><time dateTime={new Date(item.timestamp!).toISOString()}>
              {formatDate(item.timestamp!, { dateStyle: 'medium', timeStyle: 'short' })}
            </time></li>
          )}
        </ul>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-fg">
          {item.readerText || item.description || t('rss.noDescription')}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => void save()}
            size="sm"
            variant="secondary"
            loading={saveState === 'saving'}
            disabled={saveState === 'saved' || saveState === 'existing'}
            icon={<BookmarkPlus aria-hidden="true" className="size-4" />}
          >
            {t('rss.readLater')}
          </Button>
          {item.link !== '#' && (
            <a
              className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm text-primary hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-primary"
              href={item.link}
              target={openInNewTab ? '_blank' : '_self'}
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
            >
              <ExternalLink aria-hidden="true" className="size-4" />
              {t('rss.openSource')}
            </a>
          )}
        </div>
        {readError && <p role="alert" className="text-xs text-danger">{t('rss.readError')}</p>}
        {saveState === 'error' && <p role="alert" className="text-xs text-danger">{t('rss.saveError')}</p>}
        <p role="status" className="text-xs text-fg-muted">
          {saveState === 'saved' ? t('rss.savedForLater') : saveState === 'existing' ? t('rss.alreadySaved') : ''}
        </p>
      </article>
    </Modal>
  );
}
