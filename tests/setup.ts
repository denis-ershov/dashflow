import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import { useI18nStore } from '@/core/i18n';

/**
 * Тесты пишутся на каноническом языке словаря (русском). jsdom сообщает navigator.language = en-US,
 * поэтому язык фиксируется явно; английский интерфейс проверяется отдельными тестами.
 */
beforeEach(() => {
  useI18nStore.setState({ language: 'ru' });
});

/**
 * Очистка между тестами. Помимо размонтирования React-дерева убираются
 * теги темы и инлайновые стили корня: Theme Engine пишет в document.head,
 * и без этого состояние протекало бы из теста в тест.
 */
afterEach(() => {
  cleanup();
  document.head.querySelectorAll('style[id^="dashflow-"]').forEach((tag) => {
    tag.remove();
  });
  document.documentElement.removeAttribute('style');
  document.body.removeAttribute('style');
});
