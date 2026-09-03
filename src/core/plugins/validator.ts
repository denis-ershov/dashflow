import { DeclarativePluginManifest, DeclarativePluginType, PluginPermission } from './types';

const ALLOWED_TYPES: DeclarativePluginType[] = ['rss', 'embed', 'links', 'api'];
const ALLOWED_PERMISSIONS: PluginPermission[] = ['storage', 'network', 'bookmarks'];
const ID_REGEX = /^[a-zA-Z0-9_-]{2,32}$/;

export interface ValidationResult {
  valid: boolean;
  manifest?: DeclarativePluginManifest;
  errors?: string[];
}

export const isSecureUrl = (url: string): boolean => {
  if (typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export const validatePluginManifest = (input: unknown): ValidationResult => {
  const errors: string[] = [];

  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['Манифест должен быть JSON-объектом'] };
  }

  const raw = input as Record<string, unknown>;

  // ID validation
  if (typeof raw.id !== 'string' || !ID_REGEX.test(raw.id)) {
    errors.push('Поле id обязательно, должно быть строкой (2-32 символов a-z, 0-9, _, -)');
  }

  // Name, version, author, description
  if (typeof raw.name !== 'string' || raw.name.trim().length === 0) {
    errors.push('Поле name обязательно и не может быть пустым');
  }

  if (typeof raw.version !== 'string' || !/^\d+\.\d+(\.\d+)?$/.test(raw.version)) {
    errors.push('Поле version должно быть семантической версией (например, 1.0.0)');
  }

  if (typeof raw.author !== 'string' || raw.author.trim().length === 0) {
    errors.push('Поле author обязательно');
  }

  if (typeof raw.description !== 'string') {
    errors.push('Поле description должно быть строкой');
  }

  // Type validation
  if (!ALLOWED_TYPES.includes(raw.type as DeclarativePluginType)) {
    errors.push(`Поле type должно быть одним из: ${ALLOWED_TYPES.join(', ')}`);
  }

  // Permissions validation
  if (!Array.isArray(raw.permissions)) {
    errors.push('Поле permissions должно быть массивом строк');
  } else {
    for (const p of raw.permissions) {
      if (!ALLOWED_PERMISSIONS.includes(p as PluginPermission)) {
        errors.push(
          `Недопустимое разрешение: ${String(p)}. Допустимы: ${ALLOWED_PERMISSIONS.join(', ')}`,
        );
      }
    }
  }

  // Size validation
  if (!raw.size || typeof raw.size !== 'object') {
    errors.push('Поле size обязательно');
  } else {
    const s = raw.size as Record<string, unknown>;
    if (typeof s.defaultW !== 'number' || s.defaultW < 1 || s.defaultW > 24) {
      errors.push('size.defaultW должно быть числом от 1 до 24');
    }
    if (typeof s.defaultH !== 'number' || s.defaultH < 1 || s.defaultH > 24) {
      errors.push('size.defaultH должно быть числом от 1 до 24');
    }
  }

  // Config validation according to type
  if (!raw.config || typeof raw.config !== 'object') {
    errors.push('Поле config обязательно');
  } else {
    const cfg = raw.config as Record<string, unknown>;
    const pType = raw.type as DeclarativePluginType;

    if (pType === 'rss') {
      const feed = typeof cfg.feedUrl === 'string' ? cfg.feedUrl : '';
      if (!feed || !isSecureUrl(feed)) {
        errors.push('config.feedUrl должен быть валидным HTTPS URL');
      }
    } else if (pType === 'embed') {
      const url = typeof cfg.url === 'string' ? cfg.url : '';
      if (!url || !isSecureUrl(url)) {
        errors.push('config.url должен быть валидным HTTPS URL');
      }
    } else if (pType === 'api') {
      const ep = typeof cfg.endpoint === 'string' ? cfg.endpoint : '';
      if (!ep || !isSecureUrl(ep)) {
        errors.push('config.endpoint должен быть валидным HTTPS URL');
      }
    } else if (pType === 'links') {
      if (!Array.isArray(cfg.links) || cfg.links.length === 0) {
        errors.push('config.links должен быть непустым массивом ссылок');
      } else {
        for (let i = 0; i < cfg.links.length; i++) {
          const item: unknown = cfg.links[i];
          if (!item || typeof item !== 'object') {
            errors.push(`config.links[${i}] должен быть объектом`);
          } else {
            const itemObj = item as Record<string, unknown>;
            const linkUrl = typeof itemObj.url === 'string' ? itemObj.url : '';
            if (!linkUrl || !isSecureUrl(linkUrl)) {
              errors.push(`config.links[${i}].url должен быть валидным HTTPS URL`);
            }
          }
        }
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    manifest: raw as unknown as DeclarativePluginManifest,
  };
};
