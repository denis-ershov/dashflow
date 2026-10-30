/**
 * Безопасное чтение JSON из внешних API. Ответ стороннего сервиса — недоверенные данные:
 * вместо приведения `as SomeType` каждое поле читается с проверкой типа, а неожиданная
 * форма превращается в undefined, а не в исключение где-то в рендере.
 */

export type JsonRecord = Record<string, unknown>;

/** Объект или пустой объект для всего остального (null, массив, примитив) */
export function asRecord(value: unknown): JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

/** Конечное число или undefined (NaN и Infinity отбрасываются) */
export function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/** Непустая строка или undefined */
export function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/** Массив или пустой массив */
export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Число из ряда значений (например, почасового прогноза) по индексу */
export function numberAt(series: unknown, index: number): number | undefined {
  return Array.isArray(series) ? asNumber(series[index]) : undefined;
}

/** Строка из ряда значений по индексу */
export function stringAt(series: unknown, index: number): string | undefined {
  return Array.isArray(series) ? asString(series[index]) : undefined;
}
