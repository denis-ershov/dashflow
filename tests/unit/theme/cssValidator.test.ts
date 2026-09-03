import { describe, expect, it } from 'vitest';
import {
  MAX_CSS_LENGTH,
  validateCustomCss,
  type CssRejectionCode,
} from '@/core/theme/cssValidator';

/** Безопасный CSS, который валидатор принимает без тумблера. */
const ACCEPT: Array<{ label: string; css: string }> = [
  { label: 'пустая строка', css: '' },
  { label: 'только пробелы', css: '   \n  ' },
  { label: 'обычное правило', css: '.widget { color: red; }' },
  { label: 'несколько правил', css: 'body{margin:0}\n.a{padding:4px}' },
  { label: 'медиазапрос', css: '@media (min-width: 600px) { .a { color: blue } }' },
  { label: 'data: без кавычек', css: '.a{background:url(data:image/png;base64,iVBORw0KGgo=)}' },
  {
    label: 'data: в двойных кавычках',
    css: '.a{background:url("data:image/png;base64,iVBORw0KGgo=")}',
  },
  {
    label: 'data: в одинарных кавычках',
    css: ".a{background:url('data:image/png;base64,iVBORw0KGgo=')}",
  },
  { label: 'chrome-extension:', css: '.a{background:url(chrome-extension://abc/img.png)}' },
  {
    label: 'CHROME-EXTENSION в верхнем регистре',
    css: '.a{background:url(CHROME-EXTENSION://abc/i.png)}',
  },
  {
    label: 'data: с запятыми и пробелом',
    css: '.a{ background: url( "data:image/svg+xml,%3Csvg%20/%3E" ) }',
  },
  {
    label: 'два разрешённых url',
    css: '.a{background:url(data:,x)}.b{background:url(chrome-extension://i/y.png)}',
  },
  {
    label: '@import внутри комментария',
    css: '/* @import url(https://evil.test/x.css); */ .a{color:red}',
  },
  {
    label: 'внешний url внутри комментария',
    css: '/* url(https://evil.test/p.png) */ .a{color:red}',
  },
  { label: 'слово behavior в имени класса', css: '.behavior-hint{color:red}' },
  { label: 'слово import в имени класса', css: '.import-note{color:red}' },
  { label: '@import в строковом литерале', css: '.a::after{content:"@import"}' },
  { label: '!important не путается с @import', css: '.a{color:red !important}' },
  { label: 'ровно предельная длина', css: `.a{content:"${'x'.repeat(MAX_CSS_LENGTH - 14)}"}` },
  {
    label: 'шрифт с data: в src',
    css: "@font-face{font-family:X;src:url('data:font/woff2;base64,AA')}",
  },
];

/** Отклоняемый без тумблера. css — unknown: один кейс не строка. */
const REJECT: Array<{ label: string; css: unknown; code: CssRejectionCode }> = [
  { label: 'не строка', css: 42, code: 'invalid-type' },
  { label: 'длиннее предела', css: 'a'.repeat(MAX_CSS_LENGTH + 1), code: 'too-large' },
  {
    label: '@import со строкой',
    css: '@import "https://evil.test/x.css";',
    code: 'import-forbidden',
  },
  {
    label: '@import с url()',
    css: '@import url(https://evil.test/x.css);',
    code: 'import-forbidden',
  },
  { label: '@IMPORT в верхнем регистре', css: '@IMPORT "x.css";', code: 'import-forbidden' },
  {
    label: '@import с переводом строки',
    css: '@import\n  url(data:,x);',
    code: 'import-forbidden',
  },
  { label: 'http://', css: '.a{background:url(http://evil.test/p.png)}', code: 'external-url' },
  {
    label: 'https:// без тумблера',
    css: '.a{background:url(https://evil.test/p.png)}',
    code: 'external-url',
  },
  {
    label: 'протокол-относительный',
    css: '.a{background:url(//evil.test/p.png)}',
    code: 'external-url',
  },
  { label: 'относительный путь', css: '.a{background:url(bg.png)}', code: 'external-url' },
  { label: 'blob:', css: '.a{background:url(blob:abc)}', code: 'external-url' },
  { label: 'javascript:', css: '.a{background:url(javascript:alert(1))}', code: 'external-url' },
  { label: 'file:', css: '.a{background:url(file:///etc/passwd)}', code: 'external-url' },
  { label: 'пустой url()', css: '.a{background:url()}', code: 'external-url' },
  {
    label: 'внешний url во втором правиле',
    css: '.a{background:url(data:,x)}.b{background:url(https://e.test/y)}',
    code: 'external-url',
  },
  {
    label: 'внешний src в @font-face',
    css: "@font-face{font-family:X;src:url('https://evil.test/f.woff2')}",
    code: 'external-url',
  },
  {
    label: 'url() внутри content-строки',
    css: '.a::after{content:"url(https://e.test/p)"}',
    code: 'external-url',
  },
  { label: 'behavior', css: '.a{behavior:url(x.htc)}', code: 'legacy-property' },
  { label: 'BEHAVIOR в верхнем регистре', css: '.a{BEHAVIOR:url(x.htc)}', code: 'legacy-property' },
  { label: '-moz-binding', css: '.a{-moz-binding:url(x.xml)}', code: 'legacy-property' },
  { label: '-ms-behavior', css: '.a{-ms-behavior:url(x.htc)}', code: 'legacy-property' },
  {
    label: 'behavior с пробелом до двоеточия',
    css: '.a{ behavior : url(x.htc) }',
    code: 'legacy-property',
  },
  { label: 'незакрытый url(', css: '.a{background:url(data:,x', code: 'malformed-url' },
  {
    label: 'url( без закрытия в середине',
    css: '.a{background:url(data:,x}\n.b{color:red}',
    code: 'malformed-url',
  },
  { label: 'вложенный url(url())', css: '.a{background:url(url(data:,x))}', code: 'malformed-url' },
];

/** С тумблером allowExternal принимаются. */
const ACCEPT_EXTERNAL: Array<{ label: string; css: string }> = [
  { label: 'https:// с тумблером', css: '.a{background:url(https://cdn.test/p.png)}' },
  { label: 'data: с тумблером', css: '.a{background:url(data:,x)}' },
];

/** С тумблером всё равно отклоняются. */
const REJECT_EXTERNAL: Array<{ label: string; css: string; code: CssRejectionCode }> = [
  {
    label: 'http:// даже с тумблером',
    css: '.a{background:url(http://cdn.test/p.png)}',
    code: 'external-url',
  },
  {
    label: '@import даже с тумблером',
    css: '@import url(https://cdn.test/x.css);',
    code: 'import-forbidden',
  },
  {
    label: 'относительный даже с тумблером',
    css: '.a{background:url(bg.png)}',
    code: 'external-url',
  },
  { label: 'behavior даже с тумблером', css: '.a{behavior:url(x.htc)}', code: 'legacy-property' },
];

/** detail несёт схему url() или имя свойства. */
const DETAIL: Array<{ label: string; css: string; detail: string }> = [
  { label: 'схема https', css: '.a{background:url(https://e.test/p)}', detail: 'https' },
  { label: 'схема relative', css: '.a{background:url(p.png)}', detail: 'relative' },
  {
    label: 'схема protocol-relative',
    css: '.a{background:url(//e.test/p)}',
    detail: 'protocol-relative',
  },
  { label: 'свойство behavior', css: '.a{behavior:url(x)}', detail: 'behavior' },
  { label: 'свойство -moz-binding', css: '.a{-moz-binding:url(x)}', detail: '-moz-binding' },
];

describe('validateCustomCss — принимает безопасный CSS', () => {
  it.each(ACCEPT)('принимает: $label', ({ css }) => {
    const result = validateCustomCss(css);
    expect(result.ok).toBe(true);
    // Байт-в-байт: ничего не вырезано молча.
    if (result.ok) expect(result.css).toBe(css);
  });
});

describe('validateCustomCss — отклоняет сетевые утечки и мусор', () => {
  it.each(REJECT)('отклоняет: $label', ({ css, code }) => {
    const result = validateCustomCss(css);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe(code);
  });
});

describe('validateCustomCss — тумблер внешних ресурсов', () => {
  it.each(ACCEPT_EXTERNAL)('с allowExternal принимает: $label', ({ css }) => {
    expect(validateCustomCss(css, { allowExternal: true }).ok).toBe(true);
  });

  it.each(REJECT_EXTERNAL)('с allowExternal всё равно отклоняет: $label', ({ css, code }) => {
    const result = validateCustomCss(css, { allowExternal: true });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe(code);
  });
});

describe('validateCustomCss — detail уточняет причину', () => {
  it.each(DETAIL)('$label', ({ css, detail }) => {
    const result = validateCustomCss(css);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.detail).toBe(detail);
  });
});
