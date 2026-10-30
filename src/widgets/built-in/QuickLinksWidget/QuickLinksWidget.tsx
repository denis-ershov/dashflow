import React, { useMemo, useState } from 'react';
import { useI18nStore, useTranslation } from '@/core/i18n';
import { Plus, X, Globe } from 'lucide-react';
import type { WidgetProps } from '@/core/widget';
import { Button } from '@/ui/primitives';
import { ErrorState, Skeleton } from '@/ui/feedback';
import { cn } from '@/ui/lib/cn';
import type { QuickLinksSettings } from './types';
import { runLogged } from '@/core/observability';
import { LINK_STATUS, itemRepository, useItems, type ItemDraft } from '@/core/items';
import { isSafeHttpUrl } from '@/core/network';
import { commandBus } from '@/core/commands';
import { dispatchWithUndoToast } from '@/features/commands/undo';
import { legacyLabels } from '@/features/settings/backupFile';
import { createSeeds, isFirstUseOf, useInstanceTarget } from '@/features/workspace/bindings';

/**
 * Ссылки — Item (kind: 'link') на доске экземпляра виджета; добавление и удаление — команды
 * (удаление отменяется из тоста).
 */

const DEFAULT_LINKS = [
  { title: 'GitHub', url: 'https://github.com' },
  { title: 'Google', url: 'https://google.com' },
  { title: 'YouTube', url: 'https://youtube.com' },
];

/** Новая доска ссылок экземпляра; в новом профиле — со стартовыми ссылками */
async function createLinksBoard(): Promise<string> {
  const labels = legacyLabels(useI18nStore.getState().language);
  const firstUse = await isFirstUseOf('link');
  const board = await itemRepository.createBoard({
    title: labels.links,
    columns: [{ id: LINK_STATUS, title: labels.links }],
  });
  if (firstUse) {
    const seeds: ItemDraft[] = DEFAULT_LINKS.map((link) => ({
      kind: 'link',
      ...link,
      status: LINK_STATUS,
      boardId: board.id,
    }));
    await createSeeds(seeds);
  }
  return board.id;
}

export const QuickLinksWidget: React.FC<WidgetProps<QuickLinksSettings>> = ({
  instanceId,
  settings,
}) => {
  const { t } = useTranslation();
  const showTitles = settings?.showTitles ?? true;
  const openInNewTab = settings?.openInNewTab !== false;
  const shape = settings?.shape || 'squircle';
  const columns = settings?.columns || 4;
  const showDomain = Boolean(settings?.showDomain);

  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');

  const shapeClass = {
    squircle: 'rounded-lg',
    circle: 'rounded-full',
    square: 'rounded-lg',
  }[shape];

  const colClass =
    {
      2: 'grid-cols-2',
      3: 'grid-cols-2 sm:grid-cols-3',
      4: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
      6: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6',
    }[columns] || 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';

  const getDomain = (rawUrl: string) => {
    try {
      return new URL(rawUrl).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  };

  const board = useInstanceTarget(instanceId, 'boardId', createLinksBoard);
  const linkQuery = useMemo(() => ({ boardId: board.id ?? '', kind: 'link' as const }), [board.id]);
  const linkItems = useItems(itemRepository, linkQuery, { enabled: board.id !== null });
  const links = linkItems.items.flatMap((item) =>
    item.url ? [{ id: item.id, title: item.title, url: item.url }] : [],
  );

  const run = (task: Promise<unknown>) => runLogged(task, 'storage', { widget: 'quickLinks' });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    const cleanUrl = url.trim();
    if (!cleanTitle || !cleanUrl) return;

    const formattedUrl = /^https?:\/\//i.test(cleanUrl) ? cleanUrl : `https://${cleanUrl}`;
    if (!isSafeHttpUrl(formattedUrl) || !board.id) return;

    run(
      commandBus.dispatch('item.create', {
        kind: 'link',
        title: cleanTitle,
        url: formattedUrl,
        status: LINK_STATUS,
        boardId: board.id,
      }),
    );
    setTitle('');
    setUrl('');
    setIsAdding(false);
  };

  const removeLink = (id: string) => {
    run(dispatchWithUndoToast('item.delete', { id }));
  };

  const getFaviconUrl = (siteUrl: string) => {
    try {
      const u = new URL(siteUrl);
      return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`;
    } catch {
      return '';
    }
  };

  return (
    <div className="flex flex-col h-full w-full p-2 select-none">
      {isAdding ? (
        <form onSubmit={handleAdd} className="flex flex-col gap-2 p-2 bg-surface/50 rounded-xl border border-line">
          <span className="text-xs font-semibold text-fg">{t('quickLinks.newLink')}</span>
          <input
            type="text"
            placeholder={t('quickLinks.titlePlaceholder')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-surface text-xs placeholder:text-fg-muted border border-line rounded-lg px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            autoFocus
          />
          <input
            type="text"
            placeholder={t('quickLinks.urlPlaceholder')}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="bg-surface text-xs placeholder:text-fg-muted border border-line rounded-lg px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button
              size="sm"
              variant="ghost"
              type="button"
              onClick={() => setIsAdding(false)}
            >
              {t('quickLinks.cancel')}
            </Button>
            <Button size="sm" variant="primary" type="submit">
              {t('quickLinks.save')}
            </Button>
          </div>
        </form>
      ) : board.error || linkItems.error ? (
        <div className="flex-1 min-h-0 flex">
          <ErrorState
            className="m-auto"
            title={t('quickLinks.loadErrorTitle')}
            message={t('quickLinks.loadError')}
            onRetry={linkItems.reload}
          />
        </div>
      ) : board.id === null || linkItems.loading ? (
        <div className={cn('grid gap-2 flex-1 min-h-0 p-1', colClass)} aria-busy="true">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      ) : (
        <div className={cn('grid gap-2 overflow-y-auto flex-1 min-h-0 p-1', colClass)}>
          {links.map((link) => (
            <div key={link.id} className="group relative">
              {/* Настоящая ссылка: работает с клавиатуры, средней кнопкой и из контекстного меню */}
              <a
                href={link.url}
                target={openInNewTab ? '_blank' : undefined}
                rel={openInNewTab ? 'noopener noreferrer' : undefined}
                className="flex h-full flex-col items-center justify-center p-2 rounded-xl bg-surface hover:bg-surface-hover border border-line hover:border-line-hover transition-all cursor-pointer text-center focus-visible:outline-2 focus-visible:outline-primary"
              >
              <div className={cn('w-10 h-10 bg-surface-active flex items-center justify-center overflow-hidden mb-1.5 border border-line shadow-xs group-hover:scale-105 transition-transform', shapeClass)}>
                {getFaviconUrl(link.url) ? (
                  <img
                    src={getFaviconUrl(link.url)}
                    alt=""
                    className="w-5 h-5 object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <Globe className="w-4 h-4 text-fg-muted" />
                )}
              </div>

              {showTitles && (
                <span className="text-2xs font-medium text-fg truncate w-full group-hover:text-primary transition-colors">
                  {link.title}
                </span>
              )}

              {showDomain && (
                <span className="text-2xs text-fg-muted truncate w-full">
                  {getDomain(link.url)}
                </span>
              )}
              </a>

              <button
                type="button"
                aria-label={t('quickLinks.remove')}
                onClick={() => removeLink(link.id)}
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-1 text-fg-muted hover:text-danger rounded-lg hover:bg-danger/10 transition-all cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          <button
            type="button"
            aria-label={t('quickLinks.addLabel')}
            onClick={() => setIsAdding(true)}
            className="flex flex-col items-center justify-center p-2 rounded-xl border border-dashed border-line hover:border-primary text-fg-muted hover:text-primary transition-all cursor-pointer min-h-16"
          >
            <Plus className="w-5 h-5 mb-1" />
            <span className="text-2xs font-medium">{t('quickLinks.add')}</span>
          </button>
        </div>
      )}
    </div>
  );
};
