import { test as base, expect, chromium, type BrowserContext } from '@playwright/test';
import path from 'node:path';
import { readFile } from 'node:fs/promises';

const EXTENSION_PATH = path.resolve(process.cwd(), '.output/chrome-mv3');

/** Контекст с загруженным расширением и его id из адреса сервис-воркера */
const test = base.extend<{ context: BrowserContext; extensionId: string }>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, provide) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      locale: 'en-US',
      args: [`--disable-extensions-except=${EXTENSION_PATH}`, `--load-extension=${EXTENSION_PATH}`],
    });
    await provide(context);
    await context.close();
  },
  extensionId: async ({ context }, provide) => {
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    await provide(new URL(worker.url()).host);
  },
});

test('новая вкладка рендерится без ошибок и переживает перезагрузку', async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto(`chrome-extension://${extensionId}/newtab.html`);
  const grid = page.getByTestId('grid-engine-container');
  await expect(grid).toBeVisible();
  const widgets = grid.locator('.react-grid-item');
  await expect(widgets.first()).toBeVisible();
  const count = await widgets.count();
  expect(count).toBeGreaterThan(0);

  await page.reload();
  await expect(grid).toBeVisible();
  await expect(widgets).toHaveCount(count);

  // Ошибки сети внешних API (погода, ленты) в CI не важны — проверяем только ошибки приложения
  expect(errors.filter((text) => !/Failed to load resource|net::ERR_/.test(text))).toEqual([]);
});

test('манифест запрашивает при установке только storage и хосты погоды', async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/newtab.html`);
  const manifest = await page.evaluate(() => chrome.runtime.getManifest());

  expect(manifest.permissions).toEqual(['storage']);
  expect(manifest.host_permissions).not.toContain('https://*/*');
  expect(manifest.optional_permissions).toEqual(['bookmarks', 'tabs', 'sessions']);
  // Название берётся из _locales по языку браузера, а не остаётся ключом __MSG_
  expect(manifest.name).toMatch(/^DashFlow — /);
});

test('задачи 3.8 переносятся в новое хранилище при первом запуске', async ({
  context,
  extensionId,
}) => {
  // Профиль «до обновления»: задачи лежат в старом ключе chrome.storage.local
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  await worker.evaluate(() =>
    chrome.storage.local.set({
      dashflow_widget_todo_items: [
        { id: '1', text: 'Legacy task from 3.8', completed: false, priority: 'high' },
      ],
    }),
  );

  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/newtab.html`);
  await expect(page.getByText('Legacy task from 3.8')).toBeVisible();

  // После перезагрузки задача читается уже из IndexedDB, перенос не повторяется
  await page.reload();
  await expect(page.getByText('Legacy task from 3.8')).toHaveCount(1);
});

test('задача добавляется, переживает перезагрузку, удаление отменяется Ctrl+Z', async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/newtab.html`);

  const input = page.getByRole('textbox', { name: 'New task' });
  await input.fill('E2E task');
  await input.press('Enter');
  await expect(page.getByText('E2E task', { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByText('E2E task', { exact: true })).toBeVisible();

  await page.getByText('E2E task', { exact: true }).hover();
  await page.getByRole('button', { name: 'Delete task: E2E task' }).click();
  await expect(page.getByText('E2E task', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible();

  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('Control+z');
  await expect(page.getByText('E2E task', { exact: true })).toBeVisible();
});

test('пространства переживают перезагрузку и экспорт с последующим импортом', async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage();
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto(`chrome-extension://${extensionId}/newtab.html`);
  const spaces = () =>
    page
      .getByRole('navigation', { name: 'Quick controls' })
      .getByRole('button', { name: 'Spaces', exact: true });
  await spaces().click();
  await page.getByRole('textbox', { name: 'Space name' }).fill('Planning');
  await page.getByRole('button', { name: 'New space' }).click();
  await expect(page.getByText('Your dashboard is empty')).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(async () =>
        JSON.stringify(await chrome.storage.local.get('dashflow_dashboard_store')),
      ),
    )
    .toContain('Planning');
  await page.reload();
  await expect(page.getByText('Your dashboard is empty')).toBeVisible();
  const dock = page.getByRole('navigation', { name: 'Quick controls' });
  const bounds = await dock.boundingBox();
  expect(bounds?.x).toBeGreaterThanOrEqual(0);
  expect((bounds?.x ?? 0) + (bounds?.width ?? 320)).toBeLessThanOrEqual(320);

  const openBackup = async () => {
    await dock.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: 'Manage JSON' }).click();
    return page.getByRole('dialog', { name: 'Configuration Import & Export' });
  };
  const backup = await openBackup();
  const downloadPromise = page.waitForEvent('download');
  await backup.getByRole('button', { name: 'Download JSON Configuration' }).click();
  const download = await downloadPromise;
  const exported = await readFile(await download.path(), 'utf8');
  expect(exported).toContain('Planning');
  await backup.getByRole('button', { name: 'Close' }).click();
  await page
    .getByRole('dialog', { name: 'DashFlow Settings', exact: true })
    .getByRole('button', { name: 'Close' })
    .click();

  await spaces().click();
  await page.getByRole('button', { name: 'Delete space: Planning' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'New task' })).toBeVisible();
  const restore = await openBackup();
  await restore.getByPlaceholder('Paste your JSON configuration here...').fill(exported);
  await restore.getByRole('button', { name: 'Apply Import' }).click();
  await expect(page.getByText('Your dashboard is empty')).toBeVisible();
  await spaces().click();
  await expect(page.getByRole('button', { name: 'Planning', exact: true })).toHaveAttribute(
    'aria-current',
    'true',
  );
});

test('палитра находит запись другого пространства и переводит фокус к задаче', async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/newtab.html`);
  const input = page.getByRole('textbox', { name: 'New task' });
  await input.fill('Prepare workspace handoff');
  await input.press('Enter');
  await expect(page.getByText('Prepare workspace handoff', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Spaces', exact: true }).click();
  await page.getByRole('textbox', { name: 'Space name' }).fill('Planning');
  await page.getByRole('button', { name: 'New space' }).click();
  await expect(page.getByText('Your dashboard is empty')).toBeVisible();

  await page.keyboard.press('Alt+1');
  await expect(input).toBeVisible();
  await page.keyboard.press('Alt+2');
  await expect(page.getByText('Your dashboard is empty')).toBeVisible();

  await page.keyboard.press('Control+k');
  const search = page.getByRole('combobox', { name: 'Search workspace and commands' });
  await expect(search).toBeFocused();
  await search.fill('workspace handoff');
  await expect(page.getByRole('option', { name: /Prepare workspace handoff/ })).toBeVisible();
  await search.press('Enter');
  const result = page
    .locator('[data-search-highlight]')
    .filter({ hasText: 'Prepare workspace handoff' });
  await expect(result).toBeFocused();
});

test('открытая палитра находит правку заметки из другой вкладки', async ({
  context,
  extensionId,
}) => {
  const url = `chrome-extension://${extensionId}/newtab.html`;
  const page = await context.newPage();
  await page.goto(url);
  await expect(page.getByRole('textbox', { name: 'Note text' })).toBeVisible();
  const other = await context.newPage();
  await other.goto(url);
  const note = other.getByRole('textbox', { name: 'Note text' });
  await expect(note).toBeVisible();

  await page.getByRole('button', { name: 'Command palette', exact: true }).click();
  const search = page.getByRole('combobox', { name: 'Search workspace and commands' });
  await search.fill('observer keyword');
  await expect(page.getByRole('option', { name: /Search Google/ })).toBeVisible();

  await note.fill('Cross-tab note\nBody contains the observer keyword');
  const result = page.getByRole('option', { name: /Cross-tab note/ });
  await expect(result).toBeVisible();
  for (const width of [280, 3840]) {
    await page.setViewportSize({ width, height: 720 });
    const dialog = page.getByRole('dialog', { name: 'Command palette' });
    const fits = await dialog.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return (
        rect.left >= 0 && rect.right <= innerWidth && element.scrollWidth <= element.clientWidth
      );
    });
    expect(fits).toBe(true);
  }
  await result.click();
  await expect(page.getByRole('textbox', { name: 'Note text' })).toBeFocused();
});

test('мигрирует синтетический профиль 3.8 с задачами, заметкой и ссылками без потери данных', async ({
  context,
  extensionId,
}) => {
  const legacyTasks = [
    { id: 'legacy-open', text: 'Перенести квартальный план', completed: false, priority: 'high' },
    { id: 'legacy-done', text: 'Согласовать бюджет', completed: true, priority: 'low' },
  ];
  const legacyNote = '# План запуска\nСохранить этот текст заметки.';
  const legacyLinks = [
    { id: 'legacy-link', title: 'Документация проекта', url: 'https://example.com/docs' },
  ];
  const legacyHabits = [
    { id: 'legacy-habit', title: 'Читать', history: { '2026-11-22': true, '2026-11-23': false } },
  ];
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));

  // Профиль целиком синтетический; v2 сохраняет реальную форму раскладки и экземпляров 3.8.
  await worker.evaluate(
    ({ legacyTasks, legacyNote, legacyLinks, legacyHabits }) => {
      const ids = ['todo-1', 'notes-1', 'links-1'];
      const layouts = Object.fromEntries(
        ['xl', 'lg', 'md', 'sm', 'xs'].map((breakpoint) => [
          breakpoint,
          ids.map((id, index) => ({ i: id, x: index * 4, y: 0, w: 4, h: 4 })),
        ]),
      );
      return chrome.storage.local.set({
        dashflow_dashboard_store: {
          state: {
            version: 2,
            baseColumns: 12,
            gap: 16,
            layoutMode: 'modular',
            instances: [
              { instanceId: 'todo-1', widgetId: 'todo', settings: {} },
              { instanceId: 'notes-1', widgetId: 'notes', settings: {} },
              { instanceId: 'links-1', widgetId: 'quickLinks', settings: {} },
            ],
            layouts,
          },
          version: 3,
        },
        dashflow_widget_todo_items: legacyTasks,
        dashflow_widget_notes_content: legacyNote,
        dashflow_widget_quick_links: legacyLinks,
        dashflow_widget_habit_items: legacyHabits,
      });
    },
    { legacyTasks, legacyNote, legacyLinks, legacyHabits },
  );

  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/newtab.html`);
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const stored = await chrome.storage.local.get('dashflow_dashboard_store');
        const dashboard = stored.dashflow_dashboard_store as
          | {
              state?: {
                spaces?: Array<{
                  instances?: Array<{ instanceId: string; settings?: { boardId?: string } }>;
                }>;
              };
            }
          | undefined;
        const state = dashboard?.state;
        const space = state?.spaces?.find((entry: { instances?: { instanceId: string }[] }) =>
          entry.instances?.some((instance) => instance.instanceId === 'todo-1'),
        );
        return space?.instances?.find(
          (instance: { instanceId: string }) => instance.instanceId === 'todo-1',
        )?.settings?.boardId;
      }),
    )
    .toBeTruthy();

  const migrated = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('dashflow_items');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error('Не удалось открыть хранилище Item'));
    });
    const transaction = db.transaction(['items', 'boards', 'meta'], 'readonly');
    const [items, boards, marker] = await Promise.all([
      new Promise<unknown[]>((resolve, reject) => {
        const request = transaction.objectStore('items').getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('Не удалось прочитать элементы'));
      }),
      new Promise<unknown[]>((resolve, reject) => {
        const request = transaction.objectStore('boards').getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('Не удалось прочитать доски'));
      }),
      new Promise<unknown>((resolve, reject) => {
        const request = transaction.objectStore('meta').get('legacyMigration');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(request.error ?? new Error('Не удалось прочитать маркер миграции'));
      }),
    ]);
    db.close();
    const stored = await chrome.storage.local.get('dashflow_widget_habit_items');
    return { items, boards, marker, habits: stored.dashflow_widget_habit_items };
  });
  expect(migrated).toMatchObject({
    items: expect.arrayContaining([
      expect.objectContaining({
        kind: 'task',
        title: 'Перенести квартальный план',
        status: 'todo',
        priority: 'high',
      }),
      expect.objectContaining({
        kind: 'task',
        title: 'Согласовать бюджет',
        status: 'done',
        priority: 'low',
      }),
      expect.objectContaining({
        kind: 'note',
        title: 'План запуска',
        body: legacyNote,
        status: 'active',
      }),
      expect.objectContaining({
        kind: 'link',
        title: 'Документация проекта',
        url: 'https://example.com/docs',
        status: 'saved',
      }),
    ]),
    boards: expect.arrayContaining([
      expect.objectContaining({
        title: expect.any(String),
        columns: expect.arrayContaining([
          expect.objectContaining({ id: 'todo' }),
          expect.objectContaining({ id: 'done' }),
        ]),
      }),
    ]),
    marker: expect.objectContaining({
      key: 'legacyMigration',
      value: expect.objectContaining({ items: 4, boards: 2, skipped: 0 }),
    }),
    habits: legacyHabits,
  });
});

test('удалённое пространство восстанавливается тостом без смены открытой сетки', async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/newtab.html`);
  const spaces = page.getByRole('button', { name: 'Spaces', exact: true });
  await spaces.click();
  await page.getByRole('textbox', { name: 'Space name' }).fill('Temporary space');
  await page.getByRole('button', { name: 'New space' }).click();
  await expect(page.getByText('Your dashboard is empty')).toBeVisible();

  await spaces.click();
  await page.getByRole('button', { name: 'Delete space: Temporary space' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  const task = page.getByRole('textbox', { name: 'New task' });
  await expect(task).toBeVisible();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(task).toBeVisible();

  await spaces.click();
  const restored = page.getByRole('button', { name: 'Temporary space', exact: true });
  await expect(restored).toBeVisible();
  await restored.click();
  await expect(page.getByText('Your dashboard is empty')).toBeVisible();
});
