/**
 * Валидатор пользовательского CSS. CSS не исполняет JS, поэтому единственная
 * реальная угроза — сетевая утечка: @import, url() и src в @font-face с внешней
 * схемой заставляют браузер сходить на чужой сервер, и владелец URL узнаёт IP
 * пользователя и время открытия новой вкладки (спека, «Валидация
 * пользовательского CSS»). Защита текстовая и детерминированная: она работает
 * и в Node-тестах, и в браузере. Конструируемый CSSStyleSheet — второй слой под
 * feature-detect: он есть только в браузере и, что важнее, молча выбрасывает
 * @import и не отвергает внешние url(), поэтому основой защиты быть не может.
 */

/** Предел размера. Правило «CSS ограничен по размеру» из спеки. */
export const MAX_CSS_LENGTH = 50_000;

/** Код отклонения — стабильный ключ локализации сообщения на уровне UI. */
export type CssRejectionCode =
  | 'invalid-type'
  | 'too-large'
  | 'import-forbidden'
  | 'legacy-property'
  | 'external-url'
  | 'malformed-url'
  | 'parse-error';

export interface CssAccepted {
  ok: true;
  /** Возвращается байт-в-байт: валидатор ничего не вырезает молча. */
  css: string;
}

export interface CssRejected {
  ok: false;
  code: CssRejectionCode;
  /** Запасной текст для разработчика; пользователю показывается перевод code. */
  message: string;
  /** Уточнение: схема url() или имя свойства. */
  detail?: string;
}

export type CssValidationResult = CssAccepted | CssRejected;

export interface ValidateCssOptions {
  /** Осознанный тумблер внешних ресурсов: добавляет схему https в url() (ADR-007). */
  allowExternal?: boolean;
}

/** Схемы, разрешённые в url() всегда. https добавляет тумблер allowExternal. */
const ALWAYS_ALLOWED: ReadonlySet<string> = new Set(['data', 'chrome-extension']);

/** Убирает блочные комментарии: они не исполняются, но прячут @import и url(). */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ');
}

/** Заменяет строковые литералы пустыми кавычками, сохраняя экранирование. */
function stripStrings(source: string): string {
  return source.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '""');
}

/** Извлекает схему значения url(): data, chrome-extension, https, relative … */
function urlScheme(raw: string): string {
  const value = raw.trim();
  if (value === '') return 'empty';
  if (/^data:/i.test(value)) return 'data';
  if (/^chrome-extension:/i.test(value)) return 'chrome-extension';
  const match = /^([a-z][a-z0-9+.-]*):/i.exec(value);
  if (match) return match[1].toLowerCase();
  if (value.startsWith('//')) return 'protocol-relative';
  return 'relative';
}

function reject(code: CssRejectionCode, message: string, detail?: string): CssRejected {
  return detail === undefined ? { ok: false, code, message } : { ok: false, code, message, detail };
}

/**
 * Проверяет CSS и принимает или отклоняет его целиком, называя нарушенное
 * правило. Молчаливое вырезание запрещено: половинчатый CSS хуже пустого, а
 * пользователь должен понимать, что отклонено (спека, риск «CSS-инъекция»;
 * правило 112). Сброс CSS из настроек доступен всегда.
 */
export function validateCustomCss(input: unknown, options: ValidateCssOptions = {}): CssValidationResult {
  const allowExternal = options.allowExternal === true;

  if (typeof input !== 'string') {
    return reject('invalid-type', 'CSS должен быть строкой.');
  }
  if (input.length > MAX_CSS_LENGTH) {
    return reject('too-large', `CSS длиннее ${MAX_CSS_LENGTH} символов.`, String(input.length));
  }

  const withoutComments = stripComments(input);
  const withoutStrings = stripStrings(withoutComments);

  if (/@import\b/i.test(withoutStrings)) {
    return reject('import-forbidden', 'Правило @import запрещено: оно загружает внешний ресурс.');
  }

  const legacy = /(?:^|[\s;{])(-moz-binding|-ms-behavior|behavior)\s*:/i.exec(withoutStrings);
  if (legacy !== null) {
    return reject('legacy-property', `Свойство ${legacy[1]} запрещено.`, legacy[1].toLowerCase());
  }

  // Число совпадений url(...) сверяется с числом «url(»: расхождение означает
  // незакрытую или вложенную скобку, которую нельзя разобрать надёжно.
  const urlPattern = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)/gi;
  const matches = [...withoutComments.matchAll(urlPattern)];
  const openings = withoutComments.match(/url\(/gi);
  if (matches.length !== (openings === null ? 0 : openings.length)) {
    return reject('malformed-url', 'Значение url() не разобрано: проверьте скобки и кавычки.');
  }
  for (const match of matches) {
    const raw = match[1] ?? match[2] ?? match[3] ?? '';
    const scheme = urlScheme(raw);
    const allowed = ALWAYS_ALLOWED.has(scheme) || (allowExternal && scheme === 'https');
    if (!allowed) {
      return reject('external-url', `Схема url() «${scheme}» запрещена.`, scheme);
    }
  }

  // Второй слой: нативный парсер отсекает синтаксический мусор. Только в браузере
  // (в Node/jsdom нет constructable CSSStyleSheet с replaceSync), поэтому под feature-detect и не как основа защиты.
  if (typeof CSSStyleSheet !== 'undefined' && typeof CSSStyleSheet.prototype?.replaceSync === 'function') {
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(withoutComments);
    } catch (error) {
      return reject('parse-error', 'CSS не разобран браузером.', String(error));
    }
  }

  return { ok: true, css: input };
}
