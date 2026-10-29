import React from 'react';
import { cn } from '@/ui/lib/cn';
import { Plus, ExternalLink, Trash2, Globe } from 'lucide-react';
import type { SpeedDialLink } from '@/core/storage';

export interface SpeedDialGridProps {
  links: SpeedDialLink[];
  onAddClick: () => void;
  onRemoveLink: (id: string) => void;
  className?: string;
}

export const SpeedDialGrid: React.FC<SpeedDialGridProps> = ({
  links,
  onAddClick,
  onRemoveLink,
  className,
}) => {
  const getFaviconUrl = (url: string) => {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      return `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=64`;
    } catch {
      return '';
    }
  };

  return (
    <div
      role="region"
      aria-label="Быстрые ссылки"
      className={cn(
        'w-full max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-3 py-3 px-4',
        className,
      )}
    >
      {links.map((link) => {
        const favicon = getFaviconUrl(link.url);

        return (
          <div key={link.id} className="relative group">
            <a
              href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Открыть ${link.title}`}
              className="glass-pill flex items-center gap-2.5 pl-2 pr-4 py-1.5 active:scale-95 select-none min-h-11"
            >
              <div className="size-7 rounded-full bg-surface flex items-center justify-center overflow-hidden shrink-0 border border-line">
                {favicon ? (
                  <img
                    src={favicon}
                    alt=""
                    className="w-4 h-4 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <Globe className="w-4 h-4 text-fg-muted" />
                )}
              </div>

              <span className="text-xs sm:text-sm font-medium text-fg max-w-30 truncate">
                {link.title}
              </span>

              <ExternalLink className="w-3 h-3 text-fg-dim opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>

            {/* Кнопка быстрого удаления при наведении */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemoveLink(link.id);
              }}
              aria-label={`Удалить ${link.title}`}
              className="absolute -top-1 -right-1 z-(--z-raised,10) w-5 h-5 rounded-full bg-danger text-primary-fg flex items-center justify-center shadow-1 hover:scale-110 active:scale-90 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        );
      })}

      {/* Кнопка добавления ссылки */}
      <button
        type="button"
        onClick={onAddClick}
        aria-label="Добавить быструю ссылку"
        className="glass-pill flex items-center gap-2 px-4 py-1.5 border-dashed! text-fg-muted hover:text-primary active:scale-95 select-none min-h-11 cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        <span className="text-xs font-medium">Добавить</span>
      </button>
    </div>
  );
};
