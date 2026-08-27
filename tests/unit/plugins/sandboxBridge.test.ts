import { describe, it, expect, beforeEach } from 'vitest';
import { SandboxBridge } from '@/core/plugins/SandboxBridge';
import { StorageAdapter, STORAGE_KEYS } from '@/core/storage';

describe('Sandbox Bridge Security & RPC', () => {
  const fakeWindow = {} as Window;
  const otherWindow = {} as Window;

  beforeEach(async () => {
    await StorageAdapter.set(`${STORAGE_KEYS.PLUGIN_DATA_PREFIX}my_plugin_score`, 100);
  });

  it('должен отклонять сообщения от неизвестного source', async () => {
    const event = {
      data: { source: 'unknown-source', type: 'STORAGE_GET', key: 'score' },
      source: fakeWindow,
    } as MessageEvent;

    const res = await SandboxBridge.handleMessage(event, 'my_plugin', fakeWindow);
    expect(res).toBeNull();
  });

  it('должен отклонять сообщения из чужого Window', async () => {
    const event = {
      data: {
        source: 'dashflow-plugin',
        requestId: 'req-1',
        type: 'STORAGE_GET',
        key: 'score',
      },
      source: otherWindow,
    } as MessageEvent;

    const res = await SandboxBridge.handleMessage(event, 'my_plugin', fakeWindow);
    expect(res).toBeNull();
  });

  it('должен корректно считывать изолированные данные STORAGE_GET', async () => {
    const event = {
      data: {
        source: 'dashflow-plugin',
        requestId: 'req-101',
        type: 'STORAGE_GET',
        key: 'score',
      },
      source: fakeWindow,
    } as MessageEvent;

    const res = await SandboxBridge.handleMessage(event, 'my_plugin', fakeWindow);
    expect(res).toEqual({
      source: 'dashflow-core',
      requestId: 'req-101',
      success: true,
      value: 100,
    });
  });

  it('должен изолированно сохранять данные STORAGE_SET', async () => {
    const event = {
      data: {
        source: 'dashflow-plugin',
        requestId: 'req-102',
        type: 'STORAGE_SET',
        key: 'theme_mode',
        value: 'dark',
      },
      source: fakeWindow,
    } as MessageEvent;

    const res = await SandboxBridge.handleMessage(event, 'my_plugin', fakeWindow);
    expect(res?.success).toBe(true);

    const saved = await StorageAdapter.get(
      `${STORAGE_KEYS.PLUGIN_DATA_PREFIX}my_plugin_theme_mode`,
      null,
    );
    expect(saved).toBe('dark');
  });

  it('должен блокировать попытки выхода из изолированного ключа (Path Traversal / injection)', async () => {
    const event = {
      data: {
        source: 'dashflow-plugin',
        requestId: 'req-malicious',
        type: 'STORAGE_GET',
        key: '../../root_key',
      },
      source: fakeWindow,
    } as MessageEvent;

    const res = await SandboxBridge.handleMessage(event, 'my_plugin', fakeWindow);
    expect(res?.success).toBe(false);
    expect(res?.error).toBe('Недопустимый ключ хранилища');
  });
});
