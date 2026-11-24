/* global window, document, getComputedStyle, MutationObserver, requestAnimationFrame */
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const extensionPath = fileURLToPath(new URL('../.output/chrome-mv3/', import.meta.url));
const samples = parseCount('--samples=', 5, 3, 10);
const widgetTarget = parseCount('--widgets=', 24, 20, 100);
const profileDirs = new Set();
let measuredBrowserVersion = 'unavailable';

function parseCount(prefix, fallback, minimum, maximum) {
  const entry = process.argv.find((argument) => argument.startsWith(prefix));
  const value = entry ? Number(entry.slice(prefix.length)) : fallback;
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${prefix.slice(0, -1)} must be an integer between ${minimum} and ${maximum}`);
  }
  return value;
}

function initializeObservers() {
  const state = { lcpMs: 0, firstControlMs: null, lcpElement: null };
  Object.defineProperty(window, '__dashflowProfile', { value: state });
  if (PerformanceObserver.supportedEntryTypes.includes('largest-contentful-paint')) {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        state.lcpMs = entry.startTime;
        state.lcpElement = entry.element?.tagName?.toLowerCase() ?? null;
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  }
  const findControl = () => {
    if (state.firstControlMs !== null) return;
    const selector = 'button,input:not([type="hidden"]),select,textarea,a[href]';
    const control = [...document.querySelectorAll(`#root ${selector}`)].find((element) => {
      const style = getComputedStyle(element);
      return (
        element.getClientRects().length > 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        !element.hasAttribute('disabled')
      );
    });
    if (control) state.firstControlMs = performance.now();
  };
  new MutationObserver(findControl).observe(document, {
    childList: true,
    subtree: true,
    attributes: true,
  });
  requestAnimationFrame(findControl);
}

async function createContext() {
  const profilePath = await mkdtemp(path.join(os.tmpdir(), 'dashflow-profile-'));
  profileDirs.add(profilePath);
  const context = await chromium.launchPersistentContext(profilePath, {
    channel: 'chromium',
    headless: false,
    locale: 'en-US',
    viewport: { width: 1365, height: 900 },
    deviceScaleFactor: 1,
    offline: true,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--disable-background-networking',
      '--disable-component-update',
      '--no-first-run',
    ],
  });
  measuredBrowserVersion = context.browser()?.version() ?? measuredBrowserVersion;
  await context.route(/^https?:\/\//, (route) => route.abort());
  return { context, profilePath };
}

async function extensionId(context) {
  const worker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent('serviceworker', { timeout: 15_000 }));
  const id = new URL(worker.url()).host;
  if (!id) throw new Error('Could not determine the loaded extension id');
  return id;
}

async function waitForPageReady(page) {
  await page.waitForSelector('#root button, #root input, #root select, #root a[href]', {
    state: 'visible',
    timeout: 20_000,
  });
  await page.waitForFunction(
    () => Number.isFinite(window.__dashflowProfile?.firstControlMs),
    undefined,
    { timeout: 20_000 },
  );
  await page.waitForFunction(() => window.__dashflowProfile?.lcpMs > 0, { timeout: 20_000 });
  await page.waitForTimeout(350);
}

async function readPageMetrics(page) {
  return page.evaluate(() => {
    const profile = window.__dashflowProfile;
    return {
      lcpMs: profile.lcpMs,
      firstControlMs: profile.firstControlMs,
      lcpElement: profile.lcpElement,
      domNodes: document.querySelectorAll('*').length,
      widgetNodes: document.querySelectorAll('.react-grid-item').length,
    };
  });
}

async function measureColdWarmPair() {
  const { context, profilePath } = await createContext();
  try {
    const page = await context.newPage();
    await page.addInitScript(initializeObservers);
    const id = await extensionId(context);
    const url = `chrome-extension://${id}/newtab.html`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await waitForPageReady(page);
    const cold = await readPageMetrics(page);

    const skip = page.getByRole('button', { name: /skip setup|пропустить настройку/i });
    if (await skip.isVisible().catch(() => false)) {
      await skip.click();
      await page.getByRole('dialog').waitFor({ state: 'detached', timeout: 10_000 });
    }

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForPageReady(page);
    const warm = await readPageMetrics(page);
    return { cold, warm };
  } finally {
    await context.close();
    await removeOwnedProfile(profilePath);
  }
}

async function addSyntheticWidgets(page, target) {
  for (let index = 0; index < target; index += 1) {
    const addWidget = page.getByRole('button', { name: /add (your first )?widget/i }).first();
    await addWidget.click();
    const firstCatalogCard = page.getByRole('dialog').locator('.grid.grid-cols-1 > div').first();
    await firstCatalogCard.getByRole('button', { name: 'Add', exact: true }).click();
    await page.waitForFunction(
      (count) => document.querySelectorAll('.react-grid-item').length >= count,
      index + 1,
      { timeout: 20_000 },
    );
  }
}

async function measureDenseDashboard(target) {
  const { context, profilePath } = await createContext();
  let cdp;
  try {
    const page = await context.newPage();
    await page.addInitScript(initializeObservers);
    const id = await extensionId(context);
    await page.goto(`chrome-extension://${id}/newtab.html`, { waitUntil: 'domcontentloaded' });
    await waitForPageReady(page);

    const skip = page.getByRole('button', { name: /skip setup|пропустить настройку/i });
    if (await skip.isVisible().catch(() => false)) {
      await skip.click();
      await page.getByRole('dialog').waitFor({ state: 'detached', timeout: 10_000 });
    }
    await addSyntheticWidgets(page, target);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForPageReady(page);
    await page.waitForFunction(
      (count) => document.querySelectorAll('.react-grid-item').length >= count,
      target,
      { timeout: 30_000 },
    );
    await page.waitForTimeout(500);

    cdp = await context.newCDPSession(page);
    await cdp.send('Runtime.enable');
    await cdp.send('HeapProfiler.enable');
    const measurements = [];
    for (let sample = 0; sample < 3; sample += 1) {
      await cdp.send('HeapProfiler.collectGarbage');
      const [heap, dom, pageMetrics] = await Promise.all([
        cdp.send('Runtime.getHeapUsage'),
        cdp.send('Memory.getDOMCounters'),
        readPageMetrics(page),
      ]);
      measurements.push({
        ...pageMetrics,
        jsHeapUsedBytes: heap.usedSize,
        jsHeapTotalBytes: heap.totalSize,
        cdpDomNodes: dom.nodes,
        cdpDocuments: dom.documents,
        cdpEventListeners: dom.jsEventListeners,
      });
      if (sample < 2) {
        await page.reload({ waitUntil: 'domcontentloaded' });
        await waitForPageReady(page);
        await page.waitForFunction(
          (count) => document.querySelectorAll('.react-grid-item').length >= count,
          target,
          { timeout: 30_000 },
        );
        await page.waitForTimeout(350);
      }
    }
    return measurements;
  } finally {
    await cdp?.detach();
    await context.close();
    await removeOwnedProfile(profilePath);
  }
}

async function removeOwnedProfile(profilePath) {
  if (
    path.dirname(profilePath) !== os.tmpdir() ||
    !path.basename(profilePath).startsWith('dashflow-profile-')
  ) {
    throw new Error('Refusing to remove a profile outside this script temporary directory');
  }
  profileDirs.delete(profilePath);
  await rm(profilePath, { recursive: true, force: true });
}

function summarize(values) {
  if (values.some((value) => !Number.isFinite(value))) {
    throw new Error('A profiling sample did not produce a finite measurement');
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  return { median, min: sorted[0], max: sorted.at(-1), samples: sorted };
}

function rounded(summary, decimalPlaces = 0) {
  const scale = 10 ** decimalPlaces;
  return Object.fromEntries(
    Object.entries(summary).map(([key, value]) => [
      key,
      Array.isArray(value)
        ? value.map((entry) => Math.round(entry * scale) / scale)
        : Math.round(value * scale) / scale,
    ]),
  );
}

async function main() {
  const manifestPath = path.join(extensionPath, 'manifest.json');
  const [manifestJson, manifestStats] = await Promise.all([
    readFile(manifestPath, 'utf8'),
    stat(manifestPath),
  ]);
  const manifest = JSON.parse(manifestJson);
  const coldWarmPairs = [];
  for (let sample = 0; sample < samples; sample += 1) {
    process.stderr.write(`Measuring cold/warm profile ${sample + 1}/${samples}…\n`);
    coldWarmPairs.push(await measureColdWarmPair());
  }
  process.stderr.write(`Measuring dense dashboard (${widgetTarget} widgets)…\n`);
  const denseMeasurements = await measureDenseDashboard(widgetTarget);
  const report = {
    extensionVersion: manifest.version,
    extensionArtifactModifiedAt: manifestStats.mtime.toISOString(),
    extensionPath,
    browser: `Chromium ${measuredBrowserVersion} via Playwright channel chromium; headed mode; isolated temporary profiles`,
    runtime: {
      os: `${os.type()} ${os.release()} (${os.arch()})`,
      node: process.version,
      cpu: os.cpus()[0]?.model ?? 'unavailable',
      logicalCpus: os.cpus().length,
      totalMemoryGiB: Number((os.totalmem() / 1024 ** 3).toFixed(1)),
      viewport: '1365x900, deviceScaleFactor=1',
      network: 'offline browser context; HTTP(S) requests aborted; background networking disabled',
    },
    samplesPerLcpScenario: samples,
    coldFirstLaunchLcpMs: rounded(summarize(coldWarmPairs.map(({ cold }) => cold.lcpMs))),
    coldFirstLaunchControlMs: rounded(
      summarize(coldWarmPairs.map(({ cold }) => cold.firstControlMs)),
    ),
    warmDefaultDashboardLcpMs: rounded(summarize(coldWarmPairs.map(({ warm }) => warm.lcpMs))),
    warmDefaultDashboardControlMs: rounded(
      summarize(coldWarmPairs.map(({ warm }) => warm.firstControlMs)),
    ),
    denseDashboard: {
      syntheticWidgetCount: widgetTarget,
      sampleCount: denseMeasurements.length,
      lcpMs: rounded(summarize(denseMeasurements.map(({ lcpMs }) => lcpMs))),
      domNodes: rounded(summarize(denseMeasurements.map(({ cdpDomNodes }) => cdpDomNodes))),
      jsHeapUsedMiB: rounded(
        summarize(denseMeasurements.map(({ jsHeapUsedBytes }) => jsHeapUsedBytes / 1024 ** 2)),
        1,
      ),
      jsHeapTotalMiB: rounded(
        summarize(denseMeasurements.map(({ jsHeapTotalBytes }) => jsHeapTotalBytes / 1024 ** 2)),
        1,
      ),
      renderedWidgetCount: rounded(
        summarize(denseMeasurements.map(({ widgetNodes }) => widgetNodes)),
      ),
      documents: rounded(summarize(denseMeasurements.map(({ cdpDocuments }) => cdpDocuments))),
      eventListeners: rounded(
        summarize(denseMeasurements.map(({ cdpEventListeners }) => cdpEventListeners)),
      ),
    },
    note: 'First visible interactive control is a user-defined navigation timing mark, not Lighthouse TTI. Cold LCP is first install/onboarding; warm LCP is after onboarding dismissal with the default five-widget workspace. The dense dashboard adds 24 synthetic clocks for 29 rendered widget instances.',
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

try {
  await main();
} finally {
  for (const profilePath of profileDirs) await removeOwnedProfile(profilePath);
}
