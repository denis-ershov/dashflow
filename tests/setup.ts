import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

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
