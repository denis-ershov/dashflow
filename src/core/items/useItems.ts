import { useCallback, useEffect, useMemo, useState } from 'react';
import { subscribeItemsChanged } from './events';
import type { ItemRepository } from './repository';
import type { Item, ItemQuery } from './types';

export interface UseItemsResult {
  items: Item[];
  /** true до первой загрузки */
  loading: boolean;
  error: Error | null;
  reload: () => void;
}

/**
 * Записи по запросу с автообновлением: при любом изменении Item в этой или другой вкладке
 * (и в сервис-воркере) запрос выполняется заново. Запрос сравнивается по значению,
 * поэтому литерал объекта в компоненте не вызывает лишних перезагрузок.
 */
export function useItems(repository: ItemRepository, query: ItemQuery = {}): UseItemsResult {
  const queryKey = JSON.stringify(query);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- запрос сравнивается по значению (queryKey)
  const stableQuery = useMemo(() => query, [queryKey]);

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [revision, setRevision] = useState(0);

  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    repository
      .query(stableQuery)
      .then((result) => {
        if (cancelled) return;
        setItems(result);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason : new Error(String(reason)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [repository, stableQuery, revision]);

  useEffect(() => subscribeItemsChanged(reload), [reload]);

  return { items, loading, error, reload };
}
