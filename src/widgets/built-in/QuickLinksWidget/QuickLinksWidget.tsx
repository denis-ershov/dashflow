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
  const [links, setLinks] = useState<QuickLinkItem[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');

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

  const getFaviconUrl = (domainUrl: string) => {
    try {
      const hostname = new URL(domainUrl).hostname;
      return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
    } catch {
      return '';
    }
  };

  return (
    <div className="flex flex-col h-full gap-2.5 p-1 select-none">
      {isAdding ? (
        <form onSubmit={handleAdd} className="flex flex-col gap-2 p-3 rounded-lg bg-surface border border-line">
          <input
            type="text"
            placeholder="Название ссылки"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-surface text-xs text-fg placeholder:text-fg-muted border border-line rounded px-2.5 py-1.5 focus-visible:outline-none focus-visible:border-primary"
          />
          <input
            type="text"
            placeholder="URL (напр. github.com)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="bg-surface text-xs text-fg placeholder:text-fg-muted border border-line rounded px-2.5 py-1.5 focus-visible:outline-none focus-visible:border-primary"
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
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 overflow-y-auto p-1">
          {links.map((link) => (
            <div
              key={link.id}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  window.open(link.url, '_blank', 'noopener,noreferrer');
                }
              }}
              onClick={() => window.open(link.url, '_blank', 'noopener,noreferrer')}
              className="group relative flex flex-col items-center justify-center p-2 rounded-lg bg-surface/70 border border-line/60 hover:bg-surface-hover hover:border-primary transition-all text-center cursor-pointer min-h-[58px]"
            >
              <button
                type="button"
                aria-label={`Удалить ссылку ${link.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  removeLink(link.id);
                }}
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-0.5 rounded text-fg-muted hover:text-danger hover:bg-danger/10 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>

              <img
                src={getFaviconUrl(link.url)}
                alt=""
                aria-hidden="true"
                className="w-6 h-6 mb-1 rounded object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              {showTitles && (
                <span className="text-[11px] font-medium text-fg truncate w-full px-1">
                  {link.title}
                </span>
              )}
            </div>
          ))}

          <button
            type="button"
            aria-label="Добавить ссылку"
            onClick={() => setIsAdding(true)}
            className="flex flex-col items-center justify-center p-2 rounded-lg border border-dashed border-line hover:border-primary text-fg-muted hover:text-primary transition-colors text-center cursor-pointer min-h-[58px]"
          >
            <Plus className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] font-medium">Добавить</span>
          </button>
        </div>
      )}
    </div>
  );
};
