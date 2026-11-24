import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentsSettings } from '@/features/agents/AgentsSettings';
import { AgentAssignmentForm } from '@/features/agents/AssignAgentDialog';
import { useI18nStore } from '@/core/i18n';

const browserMocks = vi.hoisted(() => ({
  sendMessage: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  get: vi.fn<(...args: unknown[]) => Promise<Record<string, unknown>>>(),
  dispatch: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
}));

vi.mock('@/features/commands/undo', () => ({ dispatchWithUndoToast: browserMocks.dispatch }));

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: { id: 'agents-test', sendMessage: browserMocks.sendMessage },
    storage: {
      local: { get: browserMocks.get },
      onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
    },
  },
}));

const agent = {
  id: 'agent_123',
  name: 'Review assistant',
  scopes: ['items:read', 'items:write'],
  createdAt: '2026-11-01T12:00:00.000Z',
  lastUsedAt: '2026-11-02T12:00:00.000Z',
  createdItems: 4,
};

describe('AgentsSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useI18nStore.setState({ language: 'en' });
    browserMocks.get.mockResolvedValue({ 'dashflow:hub-status': { state: 'connected' } });
    browserMocks.sendMessage.mockImplementation(async (message) => {
      const type = (message as { type: string }).type;
      if (type === 'dashflow:hub-agents') return { ok: true, agents: [agent] };
      if (type === 'dashflow:hub-agent-preview')
        return {
          ok: true,
          preview: {
            since: '2026-11-01T00:00:00.000Z',
            until: '2026-11-03T00:00:00.000Z',
            matched: 3,
            eligible: 2,
            skipped: 1,
            previewToken: 'private-preview-token',
          },
        };
      if (type === 'dashflow:hub-agent-rollback')
        return { ok: true, result: { reverted: 2, skipped: 1, latestSeq: 12 } };
      return { ok: true };
    });
  });

  it('previews date-bounded changes and sends the exact preview token only on explicit confirmation', async () => {
    render(<AgentsSettings />);
    expect(await screen.findByRole('heading', { name: 'Review assistant' })).toBeInTheDocument();
    expect(screen.getByText('items:read')).toBeInTheDocument();
    expect(screen.getByText('agent_123')).toBeInTheDocument();
    expect(screen.queryByText('private-preview-token')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('From date'), { target: { value: '2026-11-01' } });
    fireEvent.change(screen.getByLabelText('Through date (optional)'), {
      target: { value: '2026-11-03' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Preview changes' }));
    expect(await screen.findByText(/2 can be undone/u)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm undo' }));
    await waitFor(() =>
      expect(browserMocks.sendMessage).toHaveBeenCalledWith({
        type: 'dashflow:hub-agent-rollback',
        id: 'agent_123',
        since: '2026-11-01T00:00:00.000Z',
        until: '2026-11-03T00:00:00.000Z',
        previewToken: 'private-preview-token',
      }),
    );
  });

  it('создаёт назначенную задачу только после выбора активного агента', async () => {
    const onClose = vi.fn();
    browserMocks.dispatch.mockResolvedValue({});
    render(<AgentAssignmentForm onClose={onClose} />);
    const submit = screen.getByRole('button', { name: 'Assign to agent' });
    expect(submit).toBeDisabled();
    fireEvent.change(await screen.findByLabelText('Agent'), { target: { value: 'agent_123' } });
    fireEvent.change(screen.getByLabelText('Task title'), { target: { value: 'Review the plan' } });
    fireEvent.click(submit);
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(browserMocks.dispatch).toHaveBeenCalledWith('item.create', {
      title: 'Review the plan',
      body: undefined,
      kind: 'task',
      status: 'todo',
      assignee: 'agent:agent_123',
    });
  });
});
