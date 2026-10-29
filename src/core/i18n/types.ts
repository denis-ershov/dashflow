export type SupportedLanguage = 'ru' | 'en';

/**
 * Форма словаря другого языка: те же ключи, что у русского (канонического), но любые строки.
 * Пропущенный или лишний ключ в en — ошибка компиляции, а не только упавший тест.
 */
export type LocaleShape<T> = {
  readonly [K in keyof T]: T[K] extends string ? string : LocaleShape<T[K]>;
};

export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

export type InterpolationParams = Record<string, string | number | boolean>;

export type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object ? `${K}.${NestedKeyOf<T[K]>}` : `${K}`;
    }[keyof T & string]
  : never;
