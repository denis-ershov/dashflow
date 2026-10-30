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
export function useItems(
  repository: ItemRepository,
  query: ItemQuery = {},
  options: { enabled?: boolean } = {},
): UseItemsResult {
  const enabled = options.enabled ?? true;
  const queryKey = JSON.stringify(query);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- запрос сравнивается по значению (queryKey)
  const stableQuery = useMemo(() => query, [queryKey]);

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [revision, setRevision] = useState(0);

  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (!enabled) return;
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
  }, [repository, stableQuery, revision, enabled]);

  useEffect(() => subscribeItemsChanged(reload), [reload]);

  return { items, loading, error, reload };
}

export interface UseItemResult {
  item: Item | undefined;
  loading: boolean;
  error: Error | null;
}

/** Одна запись по id с автообновлением при её изменении (в том числе из другой вкладки) */
export function useItem(repository: ItemRepository, id: string | null | undefined): UseItemResult {
  const [item, setItem] = useState<Item | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    repository
      .get(id)
      .then((value) => {
        if (cancelled) return;
        setItem(value);
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
  }, [repository, id, revision]);

  useEffect(
    () =>
      subscribeItemsChanged((event) => {
        if (id && event.itemIds.includes(id)) setRevision((value) => value + 1);
      }),
    [id],
  );

  return { item, loading: Boolean(id) && loading, error };
}
