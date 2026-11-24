import { useCallback, useEffect, useState } from 'react';
import { itemRepository, subscribeItemsChanged, type Item } from '@/core/items';
import { reminderTime } from '@/core/reminders/reminder';

const MAX_TIMEOUT = 2_147_483_647;
type State = { status: 'loading' | 'error' } | { status: 'ready'; items: Item[] };

export function useDueReminders() {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((current) => current + 1), []);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    void itemRepository
      .listScheduledReminders()
      .then((items) => {
        if (!active) return;
        const now = Date.now();
        const due: Item[] = [];
        let next = Infinity;
        for (const item of items) {
          const at = reminderTime(item);
          if (at <= now) due.push(item);
          else if (at < next) next = at;
        }
        setState({ status: 'ready', items: due });
        if (Number.isFinite(next)) timer = setTimeout(reload, Math.min(next - now, MAX_TIMEOUT));
      })
      .catch(() => {
        if (active) setState({ status: 'error' });
      });
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [revision, reload]);

  useEffect(() => {
    const stop = subscribeItemsChanged((event) => {
      if (event.itemIds.length) reload();
    });
    window.addEventListener('focus', reload);
    return () => {
      stop();
      window.removeEventListener('focus', reload);
    };
  }, [reload]);

  return { state, reload };
}
