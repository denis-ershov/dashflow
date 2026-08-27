import { ru } from './locales/ru';
import { en } from './locales/en';
import type { SupportedLanguage, InterpolationParams, NestedKeyOf, PluralCategory } from './types';

export const locales = { ru, en } as const;

export type TranslationSchema = typeof ru;
export type TranslationKey = NestedKeyOf<TranslationSchema>;

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

function resolveNested(obj: unknown, parts: string[]): unknown {
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
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
