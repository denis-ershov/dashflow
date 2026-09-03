import type { WidgetSettingFieldSchema } from './types';

/**
 * Валидирует и санитизирует настройки виджета по схеме.
 * Защищает от некорректных типов данных, NaN, выхода за границы min/max и чужих значений options.
 * Гарантированно возвращает безопасный объект настроек без исключений (Правило 25).
 */
export function validateWidgetSettings<S>(
  rawSettings: unknown,
  schema?: WidgetSettingFieldSchema<S>[],
): S {
  if (!schema || schema.length === 0) {
    if (rawSettings && typeof rawSettings === 'object' && !Array.isArray(rawSettings)) {
      return { ...(rawSettings as S) };
    }
    return {} as S;
  }

  const rawObj: Record<string, unknown> =
    rawSettings && typeof rawSettings === 'object' && !Array.isArray(rawSettings)
      ? (rawSettings as Record<string, unknown>)
      : {};

  const result: Record<string, unknown> = {};

  for (const field of schema) {
    const key = field.key as string;
    const val = rawObj[key];

    if (val === undefined || val === null) {
      result[key] = field.defaultValue;
      continue;
    }

    switch (field.type) {
      case 'text':
      case 'color': {
        if (typeof val === 'string') {
          result[key] = val;
        } else {
          result[key] = field.defaultValue;
        }
        break;
      }

      case 'number':
      case 'slider': {
        if (typeof val === 'number' && !Number.isNaN(val) && Number.isFinite(val)) {
          if (field.min !== undefined && val < field.min) {
            result[key] = field.defaultValue;
          } else if (field.max !== undefined && val > field.max) {
            result[key] = field.defaultValue;
          } else {
            result[key] = val;
          }
        } else {
          result[key] = field.defaultValue;
        }
        break;
      }

      case 'boolean': {
        if (typeof val === 'boolean') {
          result[key] = val;
        } else {
          result[key] = field.defaultValue;
        }
        break;
      }

      case 'select': {
        if (typeof val === 'string' || typeof val === 'number') {
          if (field.options && field.options.length > 0) {
            const allowed = field.options.map((opt) => opt.value);
            if (allowed.includes(val)) {
              result[key] = val;
            } else {
              result[key] = field.defaultValue;
            }
          } else {
            result[key] = val;
          }
        } else {
          result[key] = field.defaultValue;
        }
        break;
      }

      case 'multiselect': {
        if (Array.isArray(val)) {
          if (field.options && field.options.length > 0) {
            const allowed = field.options.map((opt) => opt.value);
            const filtered = val.filter(
              (item): item is string | number =>
                (typeof item === 'string' || typeof item === 'number') && allowed.includes(item),
            );
            result[key] = filtered;
          } else {
            result[key] = val;
          }
        } else {
          result[key] = field.defaultValue;
        }
        break;
      }

      default: {
        result[key] = val;
        break;
      }
    }
  }

  return result as S;
}
