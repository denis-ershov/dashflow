/**
 * Фасад для обратной совместимости с устаревшими модулями локализации.
 * Делегирует вызовы в ядро @/core/i18n.
 */

import {
  t,
  detectBrowserLanguage as coreDetectBrowserLanguage,
  type SupportedLanguage,
  type TranslationKey,
} from '@/core/i18n';

export type { SupportedLanguage };

export function getTranslation(lang: SupportedLanguage, key: string): string {
  return t(key as TranslationKey, undefined, lang);
}

export function detectBrowserLanguage(): SupportedLanguage {
  return coreDetectBrowserLanguage();
}
