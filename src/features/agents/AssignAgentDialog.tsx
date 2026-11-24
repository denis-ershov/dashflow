import { useState, type FormEvent } from 'react';
import { useTranslation } from '@/core/i18n';
import type { Item, ItemAssignee } from '@/core/items/types';
import { dispatchWithUndoToast } from '@/features/commands/undo';
import { Modal } from '@/ui/overlays';
import { Button, Input } from '@/ui/primitives';
import { useHubAgents } from './useHubAgents';

interface AssignmentProps {
  item?: Item;
  onClose: () => void;
}

function canAssign(agent: ReturnType<typeof useHubAgents>['agents'][number]) {
  return (
    !agent.revokedAt &&
    (!agent.expiresAt || Date.parse(agent.expiresAt) > Date.now()) &&
    agent.scopes.includes('items:read') &&
    agent.scopes.includes('items:write')
  );
}

export function AgentAssignmentForm({ item, onClose }: AssignmentProps) {
  const { t } = useTranslation();
  const { agents, issue, loading, refresh } = useHubAgents(true);
  const available = agents.filter(canAssign);
  const [selected, setSelected] = useState(item?.assignee?.slice('agent:'.length) ?? '');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const selectedAgent = available.find(({ id }) => id === selected);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAgent || busy || (!item && !title.trim())) return;
    const assignee: ItemAssignee = `agent:${selectedAgent.id}`;
    setBusy(true);
    setFailed(false);
    try {
      if (item) {
        await dispatchWithUndoToast('item.update', {
          id: item.id,
          expectedVersion: item.version,
          patch: { assignee, status: 'todo', agentComment: null },
        });
      } else {
        await dispatchWithUndoToast('item.create', {
          kind: 'task',
          title,
          body: body || undefined,
          status: 'todo',
          assignee,
        });
      }
      onClose();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="min-w-0 space-y-3" onSubmit={(event) => void submit(event)}>
      {loading && (
        <p role="status" className="text-sm text-fg-muted">
          {t('agents.loading')}
        </p>
      )}
      {issue && (
        <div className="flex flex-wrap items-center gap-2">
          <p role="alert" className="text-sm text-danger">
            {t('agents.error')}
          </p>
          <Button type="button" variant="secondary" onClick={() => void refresh()}>
            {t('agents.retry')}
          </Button>
        </div>
      )}
      {!loading && !issue && available.length === 0 && (
        <p className="text-sm text-fg-muted">{t('agents.assignEmpty')}</p>
      )}
      {available.length > 0 && !issue && (
        <>
          <label className="block space-y-1 text-sm text-fg">
            <span>{t('agents.assignLabel')}</span>
            <select
              className="block min-h-11 w-full rounded-lg border border-line bg-canvas px-3"
              value={selected}
              disabled={loading || busy}
              required
              onChange={(event) => setSelected(event.target.value)}
            >
              <option value="" disabled>
                {t('agents.assignSelect')}
              </option>
              {available.map(({ id, name }) => (
                <option value={id} key={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          {!item && (
            <>
              <label className="block space-y-1 text-sm text-fg">
                <span>{t('agents.assignTitle')}</span>
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                  maxLength={500}
                />
              </label>
              <label className="block space-y-1 text-sm text-fg">
                <span>{t('agents.assignDetails')}</span>
                <textarea
                  className="block min-h-20 w-full rounded-lg border border-line bg-canvas p-3"
                  maxLength={100_000}
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                />
              </label>
            </>
          )}
        </>
      )}
      {failed && (
        <p role="alert" className="text-sm text-danger">
          {t('agents.assignFailed')}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
          {t('agents.cancel')}
        </Button>
        <Button
          type="submit"
          loading={busy}
          disabled={!selectedAgent || loading || !!issue || (!item && !title.trim())}
        >
          {t('agents.assign')}
        </Button>
      </div>
    </form>
  );
}

export function AssignAgentDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Modal isOpen onClose={onClose} title={t('agents.assign')} maxWidth="lg">
      <AgentAssignmentForm onClose={onClose} />
    </Modal>
  );
}
