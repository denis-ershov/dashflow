import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing';

/**
 * Идентификаторы и порядок без внешних зависимостей.
 */

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * ULID (https://github.com/ulid/spec): 48 бит времени + 80 бит криптостойкой случайности,
 * 26 символов Crockford Base32. Лексикографический порядок совпадает с порядком создания
 * (с точностью до миллисекунды), поэтому id годится для сортировки и курсоров синхронизации.
 */
export function ulid(now: number = Date.now()): string {
  let time = '';
  let rest = Math.floor(now);
  for (let i = 0; i < 10; i++) {
    time = CROCKFORD.charAt(rest % 32) + time;
    rest = Math.floor(rest / 32);
  }
  const random = crypto.getRandomValues(new Uint8Array(16));
  let tail = '';
  for (const byte of random) tail += CROCKFORD.charAt(byte % 32);
  return time + tail;
}

/**
 * Дробные ключи порядка: между любыми двумя ключами всегда есть место для третьего, поэтому
 * перемещение карточки меняет одну запись, а не перенумеровывает колонку. Алгоритм —
 * fractional-indexing (ADR-017): при добавлении в конец ключ растёт логарифмически
 * (1000 вставок — 3 символа). Сравнение — обычное строковое, как в IndexedDB.
 */
const ORDER_KEY = /^[A-Za-z][0-9A-Za-z]{0,63}$/;

/** Ключ порядка допустим: формат fractional-indexing и не длиннее 64 символов */
export function isValidOrderKey(key: string): boolean {
  if (!ORDER_KEY.test(key)) return false;
  try {
    generateKeyBetween(key, null);
    return true;
  } catch {
    return false;
  }
}

/** Ключ строго между a и b; без a — в начало, без b — в конец */
export function orderBetween(a?: string, b?: string): string {
  return generateKeyBetween(a ?? null, b ?? null);
}

/** n возрастающих ключей между a и b — для массовой вставки (миграция, импорт) */
export function ordersBetween(a: string | undefined, b: string | undefined, n: number): string[] {
  return generateNKeysBetween(a ?? null, b ?? null, n);
}
