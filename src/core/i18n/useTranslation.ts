import { useCallback } from 'react';
import { useI18nStore } from './i18nStore';
import {
  t,
  tp,
  formatDate,
  formatNumber,
  getPluralForm,
  type PluralKey,
  type TranslationKey,
} from './i18n';
import type { InterpolationParams, PluralCategory } from './types';

/**
 * Хук реактивного доступа к локализации и функциям форматирования DashFlow
 */
export function useTranslation() {
  const language = useI18nStore((s) => s.language);
  const setLanguage = useI18nStore((s) => s.setLanguage);

  const translate = useCallback(
    (key: TranslationKey, params?: InterpolationParams): string => t(key, params, language),
    [language],
  );

  const translatePlural = useCallback(
    (key: PluralKey, count: number, params?: InterpolationParams): string =>
      tp(key, count, params, language),
    [language],
  );

  const formatD = useCallback(
    (date: Date | number, options?: Intl.DateTimeFormatOptions): string =>
      formatDate(date, options, language),
    [language],
  );

  const formatN = useCallback(
    (value: number, options?: Intl.NumberFormatOptions): string =>
      formatNumber(value, options, language),
    [language],
  );

  const plural = useCallback(
    (count: number): PluralCategory => getPluralForm(count, language),
    [language],
  );

  return {
    language,
    setLanguage,
    t: translate,
    tp: translatePlural,
    formatDate: formatD,
    formatNumber: formatN,
    getPluralForm: plural,
  };
}
