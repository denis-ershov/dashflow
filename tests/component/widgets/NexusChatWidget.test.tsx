import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useI18nStore } from '@/core/i18n';
import { nexusChatManifest } from '@/widgets/built-in/NexusChatWidget/manifest';
import { NexusChatSettingsForm } from '@/widgets/built-in/NexusChatWidget/NexusChatSettings';
import { NexusChatWidget } from '@/widgets/built-in/NexusChatWidget/NexusChatWidget';
import {
  resolveChatCompletionsUrl,
  sendNexusMessage,
  type NexusChatMessage,
} from '@/widgets/built-in/NexusChatWidget/nexusChatApi';

const mockGetStorage = vi.fn<() => Promise<Record<string, unknown>>>();

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: { id: 'test-ext' },
    storage: {
      local: {
        get: () => mockGetStorage(),
      },
    },
  },
}));

describe('NexusChatWidget и nexusChatApi', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetStorage.mockResolvedValue({});
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('test_renders_empty_state_with_quick_prompts', () => {
    render(
      <NexusChatWidget
        instanceId="nexus-1"
        settings={{ chatEndpointUrl: 'https://hub.nexus.example.com' }}
      />,
    );

    expect(screen.getByRole('button', { name: 'План на сегодня' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Что нового в почте' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Создать задачу в Linear' })).toBeInTheDocument();
  });

  it('test_displays_quota_paused_banner_when_hub_returns_quota_paused', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 'QUOTA_PAUSED',
          message: 'Лимит квот временно на паузе',
          resetAt: '2026-11-25T00:00:00Z',
        }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );
    globalThis.fetch = fetchMock;

    const secretToken = 'super-secret-bearer-token-value';
    const { container } = render(
      <NexusChatWidget
        instanceId="nexus-1"
        settings={{
          chatEndpointUrl: 'https://hub.nexus.example.com',
          adminUrl: 'https://admin.nexus.example.com/quotas',
          bearerToken: secretToken,
        }}
      />,
    );

    const quickPrompt = screen.getByRole('button', { name: 'План на сегодня' });
    fireEvent.click(quickPrompt);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/пауз|квот/i);

    const adminLink = screen.getByRole('link', { name: /админ|управлени|квот/i });
    expect(adminLink).toHaveAttribute('href', 'https://admin.nexus.example.com/quotas');
    expect(container.innerHTML).not.toContain(secretToken);
  });

  it('test_handles_offline_and_loading_states_with_aria_labels', async () => {
    let rejectPending: (reason?: unknown) => void = () => {};
    const pendingPromise = new Promise<Response>((_resolve, reject) => {
      rejectPending = reject;
    });
    const fetchMock = vi.fn().mockReturnValue(pendingPromise);
    globalThis.fetch = fetchMock;

    const user = userEvent.setup();

    render(
      <NexusChatWidget
        instanceId="nexus-1"
        settings={{ chatEndpointUrl: 'https://hub.nexus.example.com' }}
      />,
    );

    const input = screen.getByRole('textbox', { name: /.+/ });
    const sendButton = screen.getByRole('button', { name: /отправить/i });

    expect(input).toHaveAttribute('aria-label');
    expect(sendButton).toHaveAttribute('aria-label');

    await user.type(input, 'Привет, Nexus!{enter}');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(sendButton).toHaveAttribute('aria-busy', 'true');
    expect(sendButton).toBeDisabled();

    rejectPending(new TypeError('Failed to fetch'));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/офлайн|подключ|сет/i);
    await waitFor(() => {
      expect(sendButton).toHaveAttribute('aria-busy', 'false');
    });
    expect(input).toBeEnabled();
  });

  it('test_rejects_insecure_non_https_endpoint', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            choices: [{ message: { content: 'Готово' } }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    );
    globalThis.fetch = fetchMock;

    const messages: NexusChatMessage[] = [
      {
        id: 'm1',
        role: 'user',
        content: 'Привет',
        createdAt: '2026-11-24T09:00:00Z',
      },
    ];

    const rejected = await sendNexusMessage(messages, {
      endpointUrl: 'http://evil.example.com',
      bearerToken: 'secret-token',
    });

    expect(rejected).toEqual({
      ok: false,
      kind: 'error',
      code: 'INVALID_URL',
    });
    expect(fetchMock).not.toHaveBeenCalled();

    expect(resolveChatCompletionsUrl('https://hub.example.com/nexus/?foo=bar#frag')).toBe(
      'https://hub.example.com/nexus/chat/v1/chat/completions',
    );

    const localhostOk = await sendNexusMessage(messages, {
      endpointUrl: 'http://localhost:47831',
    });
    expect(localhostOk).toEqual({ ok: true, reply: 'Готово' });

    const loopbackOk = await sendNexusMessage(messages, {
      endpointUrl: 'http://127.0.0.1:47831',
    });
    expect(loopbackOk).toEqual({ ok: true, reply: 'Готово' });

    const httpsOk = await sendNexusMessage(messages, {
      endpointUrl: 'https://hub.example.com',
    });
    expect(httpsOk).toEqual({ ok: true, reply: 'Готово' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('test_masks_bearer_token_in_custom_settings_form', async () => {
    expect(nexusChatManifest.loadSettings).toBeDefined();
    expect(nexusChatManifest.settingsSchema?.some((field) => field.key === 'bearerToken')).toBe(
      false,
    );

    const onChange = vi.fn();
    render(
      <NexusChatSettingsForm
        settings={{
          chatEndpointUrl: 'https://hub.example.com',
          bearerToken: 'secret-token-123',
        }}
        onChange={onChange}
      />,
    );

    const tokenInput = screen.getByLabelText('Bearer-токен');
    expect(tokenInput).toHaveAttribute('type', 'password');
    expect(tokenInput).toHaveAttribute('autocomplete', 'off');
  });

  it('test_localizes_errors_and_messages_list_in_english_locale', async () => {
    useI18nStore.setState({ language: 'en' });
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 'QUOTA_PAUSED' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    render(
      <NexusChatWidget
        instanceId="nexus-en"
        settings={{ chatEndpointUrl: 'https://hub.example.com' }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Plan for today' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Requests are paused due to quota limits.');
    expect(screen.getByRole('list', { name: 'Message history' })).toBeInTheDocument();
  });
});
