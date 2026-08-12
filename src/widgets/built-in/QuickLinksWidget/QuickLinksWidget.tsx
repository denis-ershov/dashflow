import React, { useState, useEffect } from 'react';
import { StorageAdapter } from '@/services/storage/StorageAdapter';
import { Plus, X, Globe } from 'lucide-react';

export interface QuickLinkItem {
  id: string;
  title: string;
  url: string;
}

export const QuickLinksWidget: React.FC = () => {
  const [links, setLinks] = useState<QuickLinkItem[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');

  useEffect(() => {
    StorageAdapter.get<QuickLinkItem[]>('widget_quick_links', [
      { id: '1', title: 'GitHub', url: 'https://github.com' },
      { id: '2', title: 'Google', url: 'https://google.com' },
      { id: '3', title: 'YouTube', url: 'https://youtube.com' },
    ]).then(setLinks);
  }, []);

  const saveLinks = async (newLinks: QuickLinkItem[]) => {
    setLinks(newLinks);
    await StorageAdapter.set('widget_quick_links', newLinks);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const newItem: QuickLinkItem = {
      id: Date.now().toString(),
      title: title.trim(),
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
    <div className="flex flex-col h-full space-y-3">
      {isAdding ? (
        <form onSubmit={handleAdd} className="flex flex-col space-y-2 p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
          <input
            type="text"
            placeholder="Название ссылки"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-[var(--color-bg)] text-xs text-[var(--color-text)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 focus:outline-none"
          />
          <input
            type="text"
            placeholder="URL (напр. github.com)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="bg-[var(--color-bg)] text-xs text-[var(--color-text)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 focus:outline-none"
          />
          <div className="flex justify-end space-x-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-2.5 py-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-3 py-1 text-xs text-white bg-[var(--color-primary)] rounded-lg font-semibold"
            >
              Сохранить
            </button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 overflow-y-auto">
          {links.map((link) => (
            <div
              key={link.id}
              className="group relative flex flex-col items-center justify-center p-2.5 rounded-xl bg-[var(--color-surface)]/60 border border-[var(--color-border)]/60 hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-primary)] transition-all text-center cursor-pointer"
              onClick={() => (window.location.href = link.url)}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeLink(link.id);
                }}
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-0.5 rounded-full text-[var(--color-text-muted)] hover:text-red-400 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>

              <img
                src={getFaviconUrl(link.url)}
                alt={link.title}
                className="w-7 h-7 mb-1.5 rounded-md object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="text-[11px] font-medium text-[var(--color-text)] truncate w-full">
                {link.title}
              </span>
            </div>
          ))}

          <button
            onClick={() => setIsAdding(true)}
            className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors text-center cursor-pointer min-h-[70px]"
          >
            <Plus className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Добавить</span>
          </button>
        </div>
      )}
    </div>
  );
};
