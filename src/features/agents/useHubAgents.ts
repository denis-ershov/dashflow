import { useCallback, useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import {
  HUB_AGENTS,
  HUB_AGENT_PREVIEW,
  HUB_AGENT_REVOKE,
  HUB_AGENT_ROLLBACK,
  readHubAgent,
  readHubAgentPreview,
  type HubAgentRecord,
  type HubAgentRollbackPreview,
} from '@/core/hub/agents';
import type { HubFailure } from '@/core/hub/model';

export type HubAgentPreview = HubAgentRollbackPreview;

interface AgentState {
  agents: HubAgentRecord[];
  loading: boolean;
  issue: HubFailure | null;
}

function recordOf(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

function issueOf(value: unknown): HubFailure {
  const issue = recordOf(value)?.issue;
  return typeof issue === 'string' ? (issue as HubFailure) : 'data';
}

export function useHubAgents(enabled: boolean) {
  const [state, setState] = useState<AgentState>({ agents: [], loading: enabled, issue: null });

  const refresh = useCallback(async () => {
    if (!enabled) {
      setState({ agents: [], loading: false, issue: null });
      return;
    }
    setState((current) => ({ ...current, loading: true, issue: null }));
    try {
      const response = recordOf(await browser.runtime.sendMessage({ type: HUB_AGENTS }));
      if (response?.ok !== true || !Array.isArray(response.agents)) {
        setState((current) => ({ ...current, loading: false, issue: issueOf(response) }));
        return;
      }
      setState({ agents: response.agents.map(readHubAgent), loading: false, issue: null });
    } catch {
      setState((current) => ({ ...current, loading: false, issue: 'network' }));
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const revoke = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const response = recordOf(
          await browser.runtime.sendMessage({ type: HUB_AGENT_REVOKE, id }),
        );
        if (response?.ok !== true) {
          setState((current) => ({ ...current, issue: issueOf(response) }));
          return false;
        }
        await refresh();
        return true;
      } catch {
        setState((current) => ({ ...current, issue: 'network' }));
        return false;
      }
    },
    [refresh],
  );

  const previewRollback = useCallback(async (id: string, since: string, until?: string) => {
    const response = recordOf(
      await browser.runtime.sendMessage({
        type: HUB_AGENT_PREVIEW,
        id,
        since,
        ...(until ? { until } : {}),
      }),
    );
    if (response?.ok !== true) throw new Error(issueOf(response));
    try {
      return readHubAgentPreview(response.preview);
    } catch {
      throw new Error('data');
    }
  }, []);

  const rollback = useCallback(
    async (id: string, preview: HubAgentPreview): Promise<boolean> => {
      try {
        const response = recordOf(
          await browser.runtime.sendMessage({
            type: HUB_AGENT_ROLLBACK,
            id,
            since: preview.since,
            until: preview.until,
            previewToken: preview.previewToken,
          }),
        );
        if (response?.ok !== true) {
          setState((current) => ({ ...current, issue: issueOf(response) }));
          return false;
        }
        await refresh();
        return true;
      } catch {
        setState((current) => ({ ...current, issue: 'network' }));
        return false;
      }
    },
    [refresh],
  );

  return { ...state, refresh, revoke, previewRollback, rollback };
}
