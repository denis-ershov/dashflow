export type SupportedLanguage = 'ru' | 'en';

export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

export type InterpolationParams = Record<string, string | number | boolean>;

export type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object ? `${K}.${NestedKeyOf<T[K]>}` : `${K}`;
    }[keyof T & string]
  : never;
