import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import ts from 'typescript';

/**
 * Страж правила 43.1: тексты интерфейса живут только в словарях src/core/i18n/locales.
 * Проверяются строковые литералы, части шаблонных строк и JSX-текст (комментарии — нет).
 * Кириллица в них означает захардкоженную строку для пользователя.
 */

const ROOT = resolve(__dirname, '../../..');
const SRC = join(ROOT, 'src');
const CYRILLIC = /[Ѐ-ӿ]/;

/**
 * Не интерфейс. Каждое исключение — с причиной; новые файлы сюда добавлять только осознанно.
 */
const NON_UI_FILES: ReadonlyMap<string, string> = new Map([
  [
    'src/entrypoints/background.ts',
    'логи service worker и ответы на сообщения, пользователю не показываются',
  ],
  ['src/core/plugins/validator.ts', 'диагностика манифеста для авторов плагинов'],
  ['src/core/plugins/pluginStore.ts', 'диагностика манифеста для авторов плагинов'],
  ['src/core/plugins/SandboxBridge.ts', 'ответы RPC коду плагина в песочнице'],
  ['src/core/storage/StorageAdapter.ts', 'внутренние ошибки хранилища для журнала диагностики'],
  ['src/core/storage/errors.ts', 'внутренние ошибки хранилища для журнала диагностики'],
  ['src/core/network/resilientFetch.ts', 'сетевые ошибки для журнала диагностики'],
  ['src/core/theme/applyTheme.ts', 'инварианты Theme Engine (throw при ошибке программиста)'],
  ['src/core/theme/color.ts', 'инварианты цветовой математики'],
  ['src/core/theme/tokens.ts', 'инварианты токенов'],
  [
    'src/core/theme/cssValidator.ts',
    'запасной текст для разработчика; пользователю показывается перевод code',
  ],
  ['src/widgets/built-in/RssWidget/presets.ts', 'данные: реальные названия русскоязычных RSS-лент'],
]);

/** Временная граница этапа E: виджеты переводятся вторым шагом */
const PENDING_DIRS = ['src/widgets/built-in/'];

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? listFiles(full) : [full];
  });
}

function isInsideConsoleCall(node: ts.Node): boolean {
  for (let current = node.parent; current; current = current.parent) {
    if (
      ts.isCallExpression(current) &&
      ts.isPropertyAccessExpression(current.expression) &&
      ts.isIdentifier(current.expression.expression) &&
      current.expression.expression.text === 'console'
    ) {
      return true;
    }
  }
  return false;
}

function findHardcodedStrings(file: string): string[] {
  const text = readFileSync(file, 'utf8');
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const hits: string[] = [];

  const visit = (node: ts.Node) => {
    const literal =
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node) ||
      ts.isJsxText(node);
    if (literal && CYRILLIC.test(node.text) && !isInsideConsoleCall(node)) {
      const { line } = source.getLineAndCharacterOfPosition(node.getStart());
      hits.push(
        `${relative(ROOT, file).replace(/\\/g, '/')}:${line + 1} ${node.text.trim().slice(0, 60)}`,
      );
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return hits;
}

describe('Локализация: нет захардкоженных строк интерфейса', () => {
  const files = listFiles(SRC)
    .filter((f) => /\.tsx?$/.test(f) && !f.endsWith('.d.ts'))
    .map((f) => ({ abs: f, rel: relative(ROOT, f).replace(/\\/g, '/') }))
    .filter(({ rel }) => !rel.startsWith('src/core/i18n/locales/'))
    .filter(({ rel }) => !NON_UI_FILES.has(rel))
    .filter(({ rel }) => !PENDING_DIRS.some((dir) => rel.startsWith(dir)));

  it('кириллица в литералах и JSX есть только в словарях и в файлах-исключениях', () => {
    const hits = files.flatMap(({ abs }) => findHardcodedStrings(abs));
    expect(hits).toEqual([]);
  });

  it('у каждого исключения есть причина и файл существует', () => {
    for (const [file, reason] of NON_UI_FILES) {
      expect(reason.length, file).toBeGreaterThan(10);
      expect(() => statSync(join(ROOT, file)), file).not.toThrow();
    }
  });
});
