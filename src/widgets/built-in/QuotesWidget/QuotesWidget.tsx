import React, { useState } from 'react';
import { Quote, RefreshCw, Copy, Check } from 'lucide-react';
import type { WidgetProps } from '@/core/widget';
import type { QuoteItem, QuotesSettings } from './types';

const QUOTES_COLLECTION: QuoteItem[] = [
  { id: '1', text: 'Простота — необходимое условие надежности.', author: 'Эдсгер Дейкстра', category: 'code' },
  { id: '2', text: 'Сначала решите проблему. Затем пишите код.', author: 'Джон Джонсон', category: 'code' },
  { id: '3', text: 'Совершенство достигается не тогда, когда нечего добавить, а когда нечего убрать.', author: 'Антуан де Сент-Экзюпери', category: 'wisdom' },
  { id: '4', text: 'Делайте так просто, как только возможно, но не проще.', author: 'Альберт Эйнштейн', category: 'wisdom' },
  { id: '5', text: 'Лучший способ предсказать будущее — создать его.', author: 'Алан Кей', category: 'wisdom' },
  { id: '6', text: 'Преждевременная оптимизация — корень всех зол.', author: 'Дональд Кнут', category: 'code' },
  { id: '7', text: 'Ваше время ограничено, не тратьте его, живя чужой жизнью.', author: 'Стив Джобс', category: 'motivation' },
  { id: '8', text: 'У вас есть власть над своим разумом, а не над внешними событиями.', author: 'Марк Аврелий', category: 'wisdom' },
  { id: '9', text: 'Разговоры стоят дешево. Покажите мне код.', author: 'Линус Торвальдс', category: 'code' },
  { id: '10', text: 'Не то, что вы имеете, а то, кем вы являетесь, определяет ваше счастье.', author: 'Сенека', category: 'wisdom' },
];

export const QuotesWidget: React.FC<WidgetProps<QuotesSettings>> = ({ settings }) => {
  const category = settings?.category || 'all';

  const quotes = QUOTES_COLLECTION.filter((q) => {
    if (category === 'all') return true;
    return q.category === category;
  });

  const [index, setIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const current = quotes[index % quotes.length] || quotes[0] || QUOTES_COLLECTION[0];

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

      <div className="flex-1 flex flex-col justify-center px-4 pt-1">
        <p className="text-xs sm:text-sm font-medium italic text-fg leading-relaxed">
          «{current.text}»
        </p>
        <span className="text-xs font-semibold text-secondary mt-2 self-end">
          — {current.author}
        </span>
      </div>

      <div className="flex items-center justify-end gap-1 pt-1">
        <button
          type="button"
          aria-label="Копировать цитату"
          onClick={copyQuote}
          className="p-1 rounded-lg text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors cursor-pointer"
        >
          {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
        </button>

        <button
          type="button"
          aria-label="Следующая цитата"
          onClick={nextQuote}
          className="p-1 rounded-lg text-fg-muted hover:text-primary hover:bg-surface-hover transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
