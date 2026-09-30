/**
 * Санитизатор логов и стектрейсов для защиты персональных данных пользователя
 * (Privacy by Design, Правила безопасности 32, 53)
 */

const USER_PATH_WIN_REGEX = /[A-Za-z]:\\Users\\[^\\]+/gi;
const USER_PATH_POSIX_REGEX = /(?:\/home|\/Users)\/[^/]+/gi;
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const TOKEN_PARAM_REGEX = /([?&](?:token|key|apikey|secret|auth|password|pwd|access_token)=)[^&]+/gi;

/**
 * Очищает строку от путей файловой системы, содержащих имя пользователя,
 * email-адресов и секретных токенов в URL.
 */
export function sanitizeString(input?: string): string {
  if (!input) return '';

  return input
    .replace(USER_PATH_WIN_REGEX, 'C:\\Users\\[REDACTED]')
    .replace(USER_PATH_POSIX_REGEX, '/home/[REDACTED]')
    .replace(EMAIL_REGEX, '[EMAIL_REDACTED]')
    .replace(TOKEN_PARAM_REGEX, '$1[TOKEN_REDACTED]')
    .slice(0, 4000); // Ограничение длины во избежание переполнения памяти
}

/**
 * Очищает объект метаданных от потенциально приватных данных
 */
export function sanitizeMeta(
  meta?: Record<string, string | number | boolean>,
): Record<string, string | number | boolean> | undefined {
  if (!meta) return undefined;

  const sanitized: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
