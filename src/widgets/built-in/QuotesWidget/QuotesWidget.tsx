import React, { useState } from 'react';
import { Quote, RefreshCw } from 'lucide-react';

export interface QuotesWidgetProps {
  instanceId: string;
}

const DEFAULT_QUOTES = [
  { text: 'Простота — необходимое условие надежности.', author: 'Эдсгер Дейкстра' },
  { text: 'Сначала решите проблему. Затем пишите код.', author: 'Джон Джонсон' },
  { text: 'Код — это поэзия, создающая логику из хаоса.', author: 'DashFlow' },
  { text: 'Делайте так просто, как только возможно, но не проще.', author: 'Альберт Эйнштейн' },
  { text: 'Лучший способ предсказать будущее — создать его.', author: 'Алан Кей' },
];

export const QuotesWidget: React.FC = () => {
  const [index, setIndex] = useState(0);

  const nextQuote = () => {
    setIndex((prev) => (prev + 1) % DEFAULT_QUOTES.length);
  };

  const current = DEFAULT_QUOTES[index];

  return (
    <div className="flex flex-col justify-between h-full relative group">
      <Quote className="w-6 h-6 text-[var(--color-primary)] opacity-30 absolute top-0 left-0" />
      <div className="flex-1 flex flex-col justify-center px-4 pt-2">
        <p className="text-xs sm:text-sm font-medium italic text-[var(--color-text)] leading-relaxed">
          «{current.text}»
        </p>
        <span className="text-[11px] font-semibold text-[var(--color-secondary)] mt-2 self-end">
          — {current.author}
        </span>
      </div>

      <button
        onClick={nextQuote}
        className="self-end p-1 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
        title="Следующая цитата"
      >
        <RefreshCw className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
