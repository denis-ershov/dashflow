import { readFile, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';

const output = new URL('../.output/', import.meta.url);
const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const budgets = { javascript: 250_000, stylesheet: 30_000, archive: 2_000_000 };

function attribute(tag, name) {
  return new RegExp(`\\b${name}="([^"]+)"`).exec(tag)?.[1];
}

function startupFiles(html) {
  const javascript = new Set();
  const stylesheet = new Set();
  for (const match of html.matchAll(/<(script|link)\b[^>]*>/gi)) {
    const [tag, element] = match;
    const src = attribute(tag, 'src');
    const href = attribute(tag, 'href');
    const rel = attribute(tag, 'rel');
    if (element === 'script' && attribute(tag, 'type') === 'module' && src) javascript.add(src);
    if (element === 'link' && rel === 'modulepreload' && href) javascript.add(href);
    if (element === 'link' && rel === 'stylesheet' && href) stylesheet.add(href);
  }
  if (!javascript.size || !stylesheet.size) throw new Error('Не найдены ресурсы новой вкладки');
  return { javascript, stylesheet };
}

async function compressedSize(bundle, paths) {
  const files = await Promise.all(
    [...paths].map(async (path) => {
      const url = new URL(path.replace(/^\//, ''), bundle);
      if (!url.href.startsWith(bundle.href)) {
        throw new Error('Ресурс новой вкладки находится вне папки сборки');
      }
      return gzipSync(await readFile(url), { level: 9 }).byteLength;
    }),
  );
  return files.reduce((sum, length) => sum + length, 0);
}

let overBudget = false;
function check(target, measure, bytes, limit) {
  console.log(`${target} · ${measure} · ${bytes} / ${limit} Б`);
  if (bytes > limit) overBudget = true;
}

try {
  for (const [browser, directory] of [
    ['chrome', 'chrome-mv3'],
    ['firefox', 'firefox-mv2'],
  ]) {
    const bundle = new URL(`${directory}/`, output);
    const assets = startupFiles(await readFile(new URL('newtab.html', bundle), 'utf8'));
    check(
      browser,
      'стартовый JS gzip',
      await compressedSize(bundle, assets.javascript),
      budgets.javascript,
    );
    check(browser, 'CSS gzip', await compressedSize(bundle, assets.stylesheet), budgets.stylesheet);
    const archive = new URL(`dashflow-${version}-${browser}.zip`, output);
    check(browser, 'архив', (await stat(archive)).size, budgets.archive);
  }
  if (overBudget) {
    console.error('Сборка превысила бюджет размера.');
    process.exitCode = 1;
  }
} catch (error) {
  console.error('Не удалось проверить бюджет расширения.', error);
  process.exitCode = 1;
}
