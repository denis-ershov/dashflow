/**
 * Разрешает только http(s)-ссылки: отсекает javascript:, data:, file: и мусорный ввод.
 */
export function isSafeHttpUrl(urlStr?: string): boolean {
  if (!urlStr) return false;
  try {
    const parsed = new URL(urlStr);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Короткое имя сайта для подписи: адрес без схемы и `www.`, только хост.
 * `https://www.habr.com/ru/rss` → `habr.com`. Для пустой строки — пустая строка.
 */
export function displayHost(urlStr: string): string {
  return urlStr.replace(/^https?:\/\/(www\.)?/i, '').split('/')[0] ?? '';
}
