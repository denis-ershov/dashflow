import { useEffect, useState } from 'react';
import { buildItemIndex } from '../workspaceSearch';

type WorkspaceIndex = ReturnType<typeof buildItemIndex>;

export function useWorkspaceIndex(attempt: number) {
  const [index, setIndex] = useState<WorkspaceIndex | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let closed = false;
    let revision = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let unsubscribe: (() => void) | undefined;
    setFailed(false);

    async function start() {
      const [{ itemRepository, subscribeItemsChanged }, { ensureWorkspaceReady }] =
        await Promise.all([import('@/core/items'), import('@/features/workspace/bindings')]);
      await ensureWorkspaceReady();
      if (closed) return;

      async function refresh(request: number) {
        try {
          const items = await itemRepository.query({ sort: 'updatedAt' });
          if (!closed && request === revision) {
            setIndex(buildItemIndex(items));
            setFailed(false);
          }
        } catch {
          if (!closed && request === revision) setFailed(true);
        }
      }

      unsubscribe = subscribeItemsChanged(({ itemIds }) => {
        if (itemIds.length === 0) return;
        const request = ++revision;
        clearTimeout(timer);
        timer = setTimeout(() => void refresh(request), 50);
      });
      await refresh(revision);
    }

    start().catch(() => {
      if (!closed) setFailed(true);
    });
    return () => {
      closed = true;
      clearTimeout(timer);
      unsubscribe?.();
    };
  }, [attempt]);

  return { index, failed };
}
