import { ru } from './locales/ru';
import { en } from './locales/en';
import type { SupportedLanguage, InterpolationParams, NestedKeyOf, PluralCategory } from './types';

export const locales = { ru, en } as const;

export type TranslationSchema = typeof ru;
export type TranslationKey = NestedKeyOf<TranslationSchema>;

/** Ключ группы форм множественного числа: объект с полями one/few/many/other */
type PluralKeyOf<T> = {
  [K in keyof T & string]: T[K] extends { readonly other: string }
    ? K
    : T[K] extends object
      ? `${K}.${PluralKeyOf<T[K]>}`
      : never;
}[keyof T & string];

export type PluralKey = PluralKeyOf<TranslationSchema>;

/**
 * Интерполяция параметров вида {{param}} в строку шаблона
 */
export function interpolate(template: string, params?: InterpolationParams): string {
  if (!params) return template;
  return template.replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g, (_match, paramName: string) => {
    if (Object.prototype.hasOwnProperty.call(params, paramName)) {
      const val = params[paramName];
      return val !== undefined && val !== null ? String(val) : '';
    }
    return '';
  });
}

/**
 * Определение категории множественного числа через Intl.PluralRules
 */
export function getPluralForm(count: number, lang: SupportedLanguage = 'ru'): PluralCategory {
  const safeLang = lang === 'ru' ? 'ru' : 'en';
  const rules = new Intl.PluralRules(safeLang);
  return rules.select(count);
}

/**
 * Получение перевода по ключу с безопасным fallback и защитой от показа сырых ключей (Правило 43.12)
 */
export function t(
  key: TranslationKey,
  params?: InterpolationParams,
  lang: SupportedLanguage = 'ru',
): string {
  const activeLocale = locales[lang] || locales.ru;
  const fallbackLocale = locales.ru;

  const parts = (key as string).split('.');

  let resolved = resolveNested(activeLocale, parts);
  if (!resolved && activeLocale !== fallbackLocale) {
    resolved = resolveNested(fallbackLocale, parts);
  }

  if (typeof resolved === 'string') {
    return interpolate(resolved, params);
  }

  // Защита: никогда не возвращать пользователю сырой ключ вроде 'errors.unknown'
  return '—';
}

/**
 * Перевод с учётом множественного числа: форма выбирается по Intl.PluralRules,
 * отсутствующая форма падает на `other`. Параметр {{count}} подставляется автоматически.
 */
export function tp(
  key: PluralKey,
  count: number,
  params?: InterpolationParams,
  lang: SupportedLanguage = 'ru',
): string {
  const form = getPluralForm(count, lang);
  const formKey = `${key}.${form}`;
  const resolvedKey = isTranslationKey(formKey) ? formKey : `${key}.other`;
  return t(resolvedKey as TranslationKey, { count, ...params }, lang);
}

export function isTranslationKey(key: string): key is TranslationKey {
  if (!key || typeof key !== 'string') return false;
  const parts = key.split('.');
  return typeof resolveNested(locales.ru, parts) === 'string';
}

function resolveNested(obj: unknown, parts: string[]): unknown {
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && Object.hasOwn(current, part)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

/**
 * Форматирование даты через стандартный Intl.DateTimeFormat
 */
export function formatDate(
  date: Date | number,
  options?: Intl.DateTimeFormatOptions,
  lang: SupportedLanguage = 'ru',
): string {
  const targetDate = typeof date === 'number' ? new Date(date) : date;
  return new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : 'en-US', options).format(targetDate);
}

/**
 * Форматирование чисел через Intl.NumberFormat
 */
export function formatNumber(
  num: number,
  options?: Intl.NumberFormatOptions,
  lang: SupportedLanguage = 'ru',
): string {
  return new Intl.NumberFormat(lang === 'ru' ? 'ru-RU' : 'en-US', options).format(num);
}

export function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return typeof value === 'string' && Object.hasOwn(locales, value);
}

/**
 * Определение языка системы / браузера
 */
export function detectBrowserLanguage(): SupportedLanguage {
  if (typeof navigator !== 'undefined' && navigator.language) {
    const lang = navigator.language.toLowerCase();
    if (lang.startsWith('ru')) return 'ru';
  }
  return 'en';
}
