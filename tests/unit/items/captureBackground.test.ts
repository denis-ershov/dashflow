import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startCaptureBackground } from '@/core/capture/background';
import { CAPTURE_COMMAND, CAPTURE_MENU_ID, CAPTURE_TICKET_MESSAGE } from '@/core/capture/model';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  createWindow: vi.fn<(details: { url: string; type: string }) => Promise<void>>(),
  createItem: vi.fn(),
  contains: vi.fn<() => Promise<boolean>>(),
  onCommand:
    vi.fn<(listener: (command: string, tab?: { url: string; title: string }) => void) => void>(),
  onPermissionAdded: vi.fn<(listener: (event: { permissions: string[] }) => void) => void>(),
  onMenuClick:
    vi.fn<
      (
        listener: (
          info: { menuItemId: string; selectionText?: string },
          tab: { id: number },
        ) => void,
      ) => void
    >(),
  updateMenu: vi.fn<(id: string, properties: object, callback: () => void) => void>(),
  setBadgeText: vi.fn<(details: { tabId: number; text?: string }, callback: () => void) => void>(),
}));

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: { id: 'test', onInstalled: { addListener: vi.fn() } },
    tabs: { query: mocks.query },
    windows: { create: mocks.createWindow },
    commands: { onCommand: { addListener: mocks.onCommand } },
    permissions: {
      contains: mocks.contains,
      onAdded: { addListener: mocks.onPermissionAdded },
      onRemoved: { addListener: vi.fn() },
    },
  },
}));
vi.mock('@/core/items/instance', () => ({ itemRepository: { create: mocks.createItem } }));

describe('Обработчики быстрого захвата', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mocks.contains.mockResolvedValue(false);
    mocks.createWindow.mockResolvedValue(undefined);
    mocks.updateMenu.mockImplementation((_id, _properties, callback) => callback());
    mocks.setBadgeText.mockImplementation((_details, callback) => callback());
    vi.stubGlobal('chrome', {
      runtime: { id: 'test', getURL: (path: string) => `chrome-extension://test/${path}` },
      contextMenus: {
        onClicked: { addListener: mocks.onMenuClick, removeListener: vi.fn() },
        update: mocks.updateMenu,
      },
      i18n: { getMessage: () => 'Send to DashFlow' },
      action: { setBadgeText: mocks.setBadgeText },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('передаёт окно по команде и выдаёт контекст только на точный адрес окна', async () => {
    const take = startCaptureBackground();
    const onCommand = mocks.onCommand.mock.calls[0]?.[0];
    const tab = { title: 'Reference', url: 'https://example.test/private?token=sample' };
    onCommand?.('irrelevant', tab);
    expect(mocks.createWindow).not.toHaveBeenCalled();
    onCommand?.(CAPTURE_COMMAND, tab);
    await vi.advanceTimersByTimeAsync(0);
    const window = mocks.createWindow.mock.calls[0]?.[0];
    expect(window?.type).toBe('popup');
    expect(window?.url).toMatch(/^chrome-extension:\/\/test\/capture\.html\?ticket=/);
    expect(window?.url).not.toContain('sample');
    const opened = new URL(window?.url ?? '');
    const message = {
      type: CAPTURE_TICKET_MESSAGE,
      ticket: opened.searchParams.get('ticket'),
    };
    expect(take(message, { id: 'test', url: tab.url })).toEqual({ page: null });
    expect(take(message, { id: 'another', url: opened.href })).toEqual({ page: null });
    expect(take(message, { id: 'test', url: opened.href })).toEqual({ page: tab });
    expect(take(message, { id: 'test', url: opened.href })).toEqual({ page: null });
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.createItem).not.toHaveBeenCalled();
  });

  it('пишет только по клику на свой пункт с действующим правом и сбрасывает бейдж', async () => {
    startCaptureBackground();
    await vi.advanceTimersByTimeAsync(0);
    expect(mocks.updateMenu).not.toHaveBeenCalled();
    const click = mocks.onMenuClick.mock.calls[0]?.[0];
    const info = { menuItemId: CAPTURE_MENU_ID, selectionText: 'Выделение' };
    click?.(info, { id: 42 });
    await vi.advanceTimersByTimeAsync(0);
    expect(mocks.createItem).not.toHaveBeenCalled();

    mocks.contains.mockResolvedValue(true);
    mocks.onPermissionAdded.mock.calls[0]?.[0]({ permissions: ['contextMenus'] });
    await vi.advanceTimersByTimeAsync(0);
    expect(mocks.updateMenu).toHaveBeenCalledWith(
      CAPTURE_MENU_ID,
      expect.objectContaining({ contexts: ['page', 'selection', 'link'] }),
      expect.any(Function),
    );
    click?.({ ...info, menuItemId: 'other' }, { id: 42 });
    expect(mocks.createItem).not.toHaveBeenCalled();
    click?.(info, { id: 42 });
    await vi.advanceTimersByTimeAsync(0);
    expect(mocks.createItem).toHaveBeenCalledTimes(1);
    expect(mocks.setBadgeText).toHaveBeenLastCalledWith(
      { text: '✓', tabId: 42 },
      expect.any(Function),
    );
    await vi.advanceTimersByTimeAsync(4_000);
    expect(mocks.setBadgeText).toHaveBeenLastCalledWith({ tabId: 42 }, expect.any(Function));
  });
});
