import type { SupportedLanguage } from '@/core/i18n';
import type { QuoteItem } from './types';

/**
 * Контент, а не интерфейс: подборка цитат на каждом поддерживаемом языке.
 * Английский текст — оригинал или устоявшийся перевод.
 */
interface LocalizedQuote {
  id: string;
  text: Record<SupportedLanguage, string>;
  author: Record<SupportedLanguage, string>;
  category: NonNullable<QuoteItem['category']>;
}

const QUOTES: readonly LocalizedQuote[] = [
  {
    id: '1',
    text: { ru: 'Простота — необходимое условие надёжности.', en: 'Simplicity is prerequisite for reliability.' },
    author: { ru: 'Эдсгер Дейкстра', en: 'Edsger W. Dijkstra' },
    category: 'code',
  },
  {
    id: '2',
    text: { ru: 'Сначала решите проблему. Затем пишите код.', en: 'First, solve the problem. Then, write the code.' },
    author: { ru: 'Джон Джонсон', en: 'John Johnson' },
    category: 'code',
  },
  {
    id: '3',
    text: {
      ru: 'Совершенство достигается не тогда, когда нечего добавить, а когда нечего убрать.',
      en: 'Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away.',
    },
    author: { ru: 'Антуан де Сент-Экзюпери', en: 'Antoine de Saint-Exupéry' },
    category: 'wisdom',
  },
  {
    id: '4',
    text: {
      ru: 'Делайте так просто, как только возможно, но не проще.',
      en: 'Everything should be made as simple as possible, but not simpler.',
    },
    author: { ru: 'Альберт Эйнштейн', en: 'Albert Einstein' },
    category: 'wisdom',
  },
  {
    id: '5',
    text: {
      ru: 'Лучший способ предсказать будущее — создать его.',
      en: 'The best way to predict the future is to invent it.',
    },
    author: { ru: 'Алан Кей', en: 'Alan Kay' },
    category: 'wisdom',
  },
  {
    id: '6',
    text: { ru: 'Преждевременная оптимизация — корень всех зол.', en: 'Premature optimization is the root of all evil.' },
    author: { ru: 'Дональд Кнут', en: 'Donald Knuth' },
    category: 'code',
  },
  {
    id: '7',
    text: {
      ru: 'Ваше время ограничено, не тратьте его, живя чужой жизнью.',
      en: "Your time is limited, so don't waste it living someone else's life.",
    },
    author: { ru: 'Стив Джобс', en: 'Steve Jobs' },
    category: 'motivation',
  },
  {
    id: '8',
    text: {
      ru: 'У вас есть власть над своим разумом, а не над внешними событиями.',
      en: 'You have power over your mind — not outside events.',
    },
    author: { ru: 'Марк Аврелий', en: 'Marcus Aurelius' },
    category: 'wisdom',
  },
  {
    id: '9',
    text: { ru: 'Разговоры стоят дёшево. Покажите мне код.', en: 'Talk is cheap. Show me the code.' },
    author: { ru: 'Линус Торвальдс', en: 'Linus Torvalds' },
    category: 'code',
  },
  {
    id: '10',
    text: {
      ru: 'Не то, что вы имеете, а то, кем вы являетесь, определяет ваше счастье.',
      en: 'It is not what you have, but who you are, that determines your happiness.',
    },
    author: { ru: 'Сенека', en: 'Seneca' },
    category: 'wisdom',
  },
];

export function getQuotes(lang: SupportedLanguage): QuoteItem[] {
  return QUOTES.map((q) => ({ id: q.id, text: q.text[lang], author: q.author[lang], category: q.category }));
}
