import React, { useState } from 'react';
import { Quote, RefreshCw, Copy, Check } from 'lucide-react';
import type { WidgetProps } from '@/core/widget';
import { cn } from '@/ui/lib/cn';
import type { QuotesSettings } from './types';
import { getQuotes } from './quotes';
import { useTranslation } from '@/core/i18n';
import { runLogged } from '@/core/observability';

export const QuotesWidget: React.FC<WidgetProps<QuotesSettings>> = ({ settings }) => {
  const category = settings?.category || 'all';
  const textAlign = settings?.textAlign || 'center';
  const showAuthor = settings?.showAuthor !== false;
  const showCopyButton = settings?.showCopyButton !== false;
  const fontStyle = settings?.fontStyle || 'serif';
  const autoRefreshInterval = Number(settings?.autoRefreshInterval || 0);

  const { t, language } = useTranslation();
  const collection = getQuotes(language);
  const quotes = collection.filter((q) => {
    if (category === 'all') return true;
    return q.category === category;
  });

  const [index, setIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const current = quotes[index % quotes.length] || quotes[0] || collection[0];

  const fontClass = {
    serif: 'font-serif text-sm sm:text-base italic',
    sans: 'font-sans text-xs sm:text-sm font-medium not-italic tracking-wide',
    mono: 'font-mono text-xs not-italic leading-relaxed',
  }[fontStyle] || 'font-serif text-sm sm:text-base italic';

  // Автоматическая смена цитаты по интервалу
  React.useEffect(() => {
    if (autoRefreshInterval <= 0) return;
    const intervalMs = autoRefreshInterval * 60 * 60 * 1000;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % quotes.length);
      setCopied(false);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [autoRefreshInterval, quotes.length]);

  const nextQuote = () => {
    setIndex((prev) => (prev + 1) % quotes.length);
    setCopied(false);
  };

  const copyQuote = async () => {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(`«${current.text}» — ${current.author}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Игнорируем в окружениях без clipboard
    }
  };

  return (
    <div className="flex flex-col justify-between h-full p-3 relative group select-none">
      <Quote className="w-6 h-6 text-primary opacity-20 absolute top-2 left-2 pointer-events-none" />

      <div
        className={cn(
          'flex-1 flex flex-col justify-center px-4 pt-1',
          textAlign === 'left' ? 'items-start text-left' : 'items-center text-center',
        )}
      >
        <p className={cn('text-fg leading-relaxed', fontClass)}>
          «{current.text}»
        </p>
        {showAuthor && (
          <span className="text-xs font-semibold text-secondary mt-2 self-end">
            — {current.author}
          </span>
        )}
      </div>

      <div className="flex items-center justify-end gap-1 pt-1">
        {showCopyButton && (
          <button
            type="button"
            aria-label={t('quotes.copy')}
            onClick={() => runLogged(copyQuote())}
            className="p-1 rounded-lg text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
          </button>
        )}

        <button
          type="button"
          aria-label={t('quotes.next')}
          onClick={nextQuote}
          className="p-1 rounded-lg text-fg-muted hover:text-primary hover:bg-surface-hover transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
