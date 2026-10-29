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
