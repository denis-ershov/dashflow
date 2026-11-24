import { useCallback, useEffect, useState } from 'react';
import { itemRepository, subscribeItemsChanged, type Board } from '@/core/items';

export function useKanbanBoards() {
  const [boards, setBoards] = useState<Board[]>();
  const [error, setError] = useState<unknown>(null);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    let current = true;
    itemRepository.listBoards().then(
      (result) => {
        if (!current) return;
        setBoards(result);
        setError(null);
      },
      (reason: unknown) => {
        if (current) setError(reason);
      },
    );
    return () => {
      current = false;
    };
  }, [revision]);

  useEffect(
    () =>
      subscribeItemsChanged((event) => {
        if (event.boards) reload();
      }),
    [reload],
  );

  return { boards, error, reload };
}
