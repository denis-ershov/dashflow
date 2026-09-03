import { describe, it, expect } from 'vitest';
import { ru } from '@/core/i18n/locales/ru';
import { en } from '@/core/i18n/locales/en';
import {
  t,
  formatDate,
  formatNumber,
  detectBrowserLanguage,
  interpolate,
  getPluralForm,
} from '@/core/i18n/i18n';

describe('i18n Core Engine', () => {
  describe('Словари и структура ключей', () => {
    function getLeafKeys(obj: Record<string, unknown>, prefix = ''): string[] {
      let keys: string[] = [];
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          keys = keys.concat(getLeafKeys(value as Record<string, unknown>, fullKey));
        } else {
          keys.push(fullKey);
        }
      }
      return keys.sort();
    }

    it('наборы ключей в ru и en должны полностью совпадать (правило 94)', () => {
      const ruKeys = getLeafKeys(ru);
      const enKeys = getLeafKeys(en);
      expect(ruKeys).toEqual(enKeys);
    });

    it('все 12 виджетов должны иметь имена и описания в словарях', () => {
      const expectedWidgets = [
        'clock',
        'weather',
        'search',
        'bookmarks',
        'todo',
        'notes',
        'quickLinks',
        'iframe',
        'pomodoro',
        'quotes',
        'systemMonitor',
        'rssReader',
      ];

      for (const widgetId of expectedWidgets) {
        expect(ru.widgets).toHaveProperty(widgetId);
        expect(ru.widgetDesc).toHaveProperty(widgetId);
        expect(en.widgets).toHaveProperty(widgetId);
        expect(en.widgetDesc).toHaveProperty(widgetId);
      }
    });
  });

  describe('Функция t() и интерполяция', () => {
    it('должна возвращать точный перевод для ru и en', () => {
      expect(t('app.title', undefined, 'ru')).toBe('DashFlow');
      expect(t('app.subtitle', undefined, 'ru')).toBe('Персональное рабочее пространство');
      expect(t('app.subtitle', undefined, 'en')).toBe('Personal Start Page');
    });

    it('должна выполнять интерполяцию параметров {{param}}', () => {
      const template = 'Привет, {{name}}! У вас {{count}} новых задач.';
      const res = interpolate(template, { name: 'Алексей', count: 5 });
      expect(res).toBe('Привет, Алексей! У вас 5 новых задач.');
    });

    it('должна корректно обрабатывать отсутствующие параметры при интерполяции', () => {
      const template = 'Значение: {{val}}';
      const res = interpolate(template, {});
      expect(res).toBe('Значение: ');
    });

    it('при отсутствии ключа в указанном языке должна использовать fallback на ru', () => {
      // @ts-expect-error Тестирование fallback на неизвестный ключ
      const res = t('app.title', undefined, 'invalid-lang');
      expect(res).toBe('DashFlow');
    });

    it('при полном отсутствии ключа не должна отдавать сырой ключ пользователю (правило 43.12)', () => {
      // @ts-expect-error Тестирование отсутствующего ключа
      const res = t('non_existent.deeply.nested.key', undefined, 'ru');
      expect(res).not.toBe('non_existent.deeply.nested.key');
      expect(res.length).toBeGreaterThan(0);
    });
  });

  describe('Плюрализация через Intl.PluralRules', () => {
    it('должна правильно определять категории для русского языка (one, few, many)', () => {
      expect(getPluralForm(1, 'ru')).toBe('one');
      expect(getPluralForm(2, 'ru')).toBe('few');
      expect(getPluralForm(5, 'ru')).toBe('many');
      expect(getPluralForm(21, 'ru')).toBe('one');
      expect(getPluralForm(24, 'ru')).toBe('few');
    });

    it('должна правильно определять категории для английского языка (one, other)', () => {
      expect(getPluralForm(1, 'en')).toBe('one');
      expect(getPluralForm(2, 'en')).toBe('other');
      expect(getPluralForm(5, 'en')).toBe('other');
    });
  });

  describe('Форматирование Intl дат и чисел', () => {
    it('должна форматировать дату согласно переданной локали', () => {
      const date = new Date('2026-08-27T12:00:00Z');
      const formattedRu = formatDate(
        date,
        { month: 'long', year: 'numeric', timeZone: 'UTC' },
        'ru',
      );
      const formattedEn = formatDate(
        date,
        { month: 'long', year: 'numeric', timeZone: 'UTC' },
        'en',
      );

      expect(formattedRu.toLowerCase()).toContain('август');
      expect(formattedEn.toLowerCase()).toContain('august');
    });

    it('должна форматировать числа согласно локали', () => {
      const num = 1234567.89;
      const formattedRu = formatNumber(num, { maximumFractionDigits: 2 }, 'ru');
      const formattedEn = formatNumber(num, { maximumFractionDigits: 2 }, 'en');

      expect(formattedRu).toMatch(/1[\s\u00A0\u202F]234[\s\u00A0\u202F]567,89/);
      expect(formattedEn).toBe('1,234,567.89');
    });
  });

  describe('detectBrowserLanguage()', () => {
    it('должна определять ru для русских локалей браузера', () => {
      const origLang = navigator.language;
      Object.defineProperty(navigator, 'language', { value: 'ru-RU', configurable: true });
      expect(detectBrowserLanguage()).toBe('ru');
      Object.defineProperty(navigator, 'language', { value: origLang, configurable: true });
    });

    it('должна определять en для остальных локалей браузера', () => {
      const origLang = navigator.language;
      Object.defineProperty(navigator, 'language', { value: 'fr-FR', configurable: true });
      expect(detectBrowserLanguage()).toBe('en');
      Object.defineProperty(navigator, 'language', { value: origLang, configurable: true });
    });
  });
});
