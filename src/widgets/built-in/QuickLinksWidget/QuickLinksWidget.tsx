import React, { useState, useEffect } from 'react';
import { Plus, X, Globe } from 'lucide-react';
import type { WidgetProps } from '@/core/widget';
import { StorageAdapter } from '@/core/storage/StorageAdapter';
import { STORAGE_KEYS } from '@/core/storage/keys';
import { Button } from '@/ui/primitives';
import { cn } from '@/ui/lib/cn';
import type { QuickLinkItem, QuickLinksSettings } from './types';

const DEFAULT_LINKS: QuickLinkItem[] = [
  { id: '1', title: 'GitHub', url: 'https://github.com' },
  { id: '2', title: 'Google', url: 'https://google.com' },
  { id: '3', title: 'YouTube', url: 'https://youtube.com' },
];

export const QuickLinksWidget: React.FC<WidgetProps<QuickLinksSettings>> = ({ settings }) => {
  const showTitles = settings?.showTitles ?? true;
  const openInNewTab = settings?.openInNewTab !== false;
  const shape = settings?.shape || 'squircle';
  const columns = settings?.columns || 4;
  const showDomain = Boolean(settings?.showDomain);

  const [links, setLinks] = useState<QuickLinkItem[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');

  const shapeClass = {
    squircle: 'rounded-2xl',
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

  useEffect(() => {
    StorageAdapter.get<QuickLinkItem[]>(STORAGE_KEYS.QUICK_LINKS, DEFAULT_LINKS).then(setLinks);
  }, []);

  const saveLinks = async (newLinks: QuickLinkItem[]) => {
    setLinks(newLinks);
    await StorageAdapter.set(STORAGE_KEYS.QUICK_LINKS, newLinks);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    const cleanUrl = url.trim();
    if (!cleanTitle || !cleanUrl) return;

    let formattedUrl = cleanUrl;
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    try {
      const parsed = new URL(formattedUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return;
      }
    } catch {
      return;
    }

    const newItem: QuickLinkItem = {
      id: Date.now().toString(),
      title: cleanTitle,
      url: formattedUrl,
    };

    saveLinks([...links, newItem]);
    setTitle('');
    setUrl('');
    setIsAdding(false);
  };

  const removeLink = (id: string) => {
    saveLinks(links.filter((l) => l.id !== id));
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
          <span className="text-xs font-semibold text-fg">Новая ссылка</span>
          <input
            type="text"
            placeholder="Название ссылки (напр. GitHub)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-surface text-xs text-fg placeholder:text-fg-muted border border-line rounded-lg px-3 py-1.5 focus-visible:outline-none focus-visible:border-primary"
            autoFocus
          />
          <input
            type="text"
            placeholder="URL (напр. github.com)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="bg-surface text-xs text-fg placeholder:text-fg-muted border border-line rounded-lg px-3 py-1.5 focus-visible:outline-none focus-visible:border-primary"
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button
              size="sm"
              variant="ghost"
              type="button"
              onClick={() => setIsAdding(false)}
            >
              Отмена
            </Button>
            <Button size="sm" variant="primary" type="submit">
              Сохранить
            </Button>
          </div>
        </form>
      ) : (
        <div className={cn('grid gap-2 overflow-y-auto flex-1 min-h-0 p-1', colClass)}>
          {links.map((link) => (
            <div
              key={link.id}
              onClick={() => {
                if (openInNewTab) {
                  window.open(link.url, '_blank');
                } else {
                  window.location.href = link.url;
                }
              }}
              className="group relative flex flex-col items-center justify-center p-2 rounded-xl bg-surface hover:bg-surface-hover border border-line hover:border-line-hover transition-all cursor-pointer text-center"
            >
              <div className={cn('w-10 h-10 bg-surface-elevated flex items-center justify-center overflow-hidden mb-1.5 border border-line shadow-xs group-hover:scale-105 transition-transform', shapeClass)}>
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
                <span className="text-[11px] font-medium text-fg truncate w-full group-hover:text-primary transition-colors">
                  {link.title}
                </span>
              )}

              {showDomain && (
                <span className="text-[9px] text-fg-muted truncate w-full">
                  {getDomain(link.url)}
                </span>
              )}

              <button
                type="button"
                aria-label="Удалить ссылку"
                onClick={(e) => {
                  e.stopPropagation();
                  removeLink(link.id);
                }}
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 text-fg-muted hover:text-danger rounded-lg hover:bg-danger/10 transition-all cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          <button
            type="button"
            aria-label="Добавить ссылку"
            onClick={() => setIsAdding(true)}
            className="flex flex-col items-center justify-center p-2 rounded-xl border border-dashed border-line hover:border-primary text-fg-muted hover:text-primary transition-all cursor-pointer min-h-[64px]"
          >
            <Plus className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Добавить</span>
          </button>
        </div>
      )}
    </div>
  );
};
