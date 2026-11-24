import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HUB_STATUS_KEY } from '@/core/hub/model';
import { useI18nStore } from '@/core/i18n';
import { HubSettings } from '@/features/hub/HubSettings';

const browserMocks = vi.hoisted(() => {
  type StorageListener = (changes: Record<string, { newValue: unknown }>, area: string) => void;
  const listeners = new Set<StorageListener>();
  return {
    permissionRequest: vi.fn<() => Promise<boolean>>(),
    sendMessage: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
    get: vi.fn<(...args: unknown[]) => Promise<Record<string, unknown>>>(),
    order: [] as string[],
    onChanged: {
      addListener: vi.fn((listener: StorageListener) => listeners.add(listener)),
      removeListener: vi.fn((listener: StorageListener) => listeners.delete(listener)),
      emit(value: unknown) {
        listeners.forEach((listener) =>
          listener({ [HUB_STATUS_KEY]: { newValue: value } }, 'local'),
        );
      },
      clear() {
        listeners.clear();
      },
    },
  };
});

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      id: 'test-extension',
      getURL: () => 'chrome-extension://abcdefghijklmnopabcdefghijklmnop/',
      sendMessage: browserMocks.sendMessage,
    },
    permissions: { request: browserMocks.permissionRequest },
    storage: {
      local: { get: browserMocks.get },
      onChanged: browserMocks.onChanged,
    },
  },
}));

describe('HubSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    browserMocks.onChanged.clear();
    browserMocks.order.length = 0;
    browserMocks.get.mockResolvedValue({});
    browserMocks.permissionRequest.mockImplementation(async () => {
      browserMocks.order.push('permission');
      return true;
    });
    browserMocks.sendMessage.mockImplementation(async () => {
      browserMocks.order.push('message');
      return { ok: true };
    });
    useI18nStore.setState({ language: 'en' });
  });

  it('requests host access before sending a valid pairing message', async () => {
    render(<HubSettings />);
    expect(
      screen.getByText(
        'dashflow-hub pair --origin chrome-extension://abcdefghijklmnopabcdefghijklmnop',
      ),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: 'Hub address' }), {
      target: { value: 'http://127.0.0.1:47831' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'One-time code' }), {
      target: { value: '123456' },
    });
    const form = screen.getByRole('button', { name: 'Connect Hub' }).closest('form');
    if (!form) throw new Error('Pairing form not found');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(browserMocks.sendMessage).toHaveBeenCalledWith({
        type: 'dashflow:hub-pair',
        origin: 'http://127.0.0.1:47831',
        code: '123456',
      });
    });
    expect(browserMocks.permissionRequest).toHaveBeenCalledWith({
      origins: ['http://127.0.0.1/*'],
    });
    expect(browserMocks.order).toEqual(['permission', 'message']);
  });

  it('rejects an invalid code format before requesting browser permission', async () => {
    render(<HubSettings />);
    fireEvent.change(screen.getByRole('textbox', { name: 'One-time code' }), {
      target: { value: '12345' },
    });
    const form = screen.getByRole('button', { name: 'Connect Hub' }).closest('form');
    if (!form) throw new Error('Pairing form not found');
    fireEvent.submit(form);

    expect(await screen.findByRole('alert')).toHaveTextContent('The code could not be used');
    expect(browserMocks.permissionRequest).not.toHaveBeenCalled();
    expect(browserMocks.sendMessage).not.toHaveBeenCalled();
  });

  it('does not send the pairing request when the user denies host access', async () => {
    browserMocks.permissionRequest.mockResolvedValue(false);
    render(<HubSettings />);
    fireEvent.change(screen.getByRole('textbox', { name: 'One-time code' }), {
      target: { value: '123456' },
    });
    const form = screen.getByRole('button', { name: 'Connect Hub' }).closest('form');
    if (!form) throw new Error('Pairing form not found');
    fireEvent.submit(form);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The browser did not grant access to this address.',
    );
    expect(browserMocks.permissionRequest).toHaveBeenCalledOnce();
    expect(browserMocks.sendMessage).not.toHaveBeenCalled();
  });

  it('updates the visible status from the storage change event', async () => {
    render(<HubSettings />);
    expect(await screen.findByText('Not connected')).toBeInTheDocument();

    act(() => {
      browserMocks.onChanged.emit({
        state: 'offline',
        origin: 'https://hub.example.com',
        issue: 'network',
      });
    });

    expect(screen.getByText('Offline')).toBeInTheDocument();
    expect(screen.getByText('https://hub.example.com')).toBeInTheDocument();
    expect(
      screen.getByText('Hub is unavailable. Check the connection and try again.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Connect Hub' })).not.toBeInTheDocument();
  });
});
