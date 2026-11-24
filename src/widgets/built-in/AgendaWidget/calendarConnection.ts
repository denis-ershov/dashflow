import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  fetchCalendar,
  readCalendarUrl,
  type CalendarFeedResult,
} from '@/core/calendar/calendarFeed';
import { originPatternFor, useBrowserPermissions } from '@/core/permissions/browserPermissions';

const SOURCE_KEY = 'dashflow_agenda_private_feed';
const SOURCE_CHANGED = 'dashflow:agenda-feed-changed';
type FeedState = CalendarFeedResult | { status: 'loading' | 'empty' };

export function setCalendarConnection(url: string | undefined) {
  if (url) localStorage.setItem(SOURCE_KEY, url);
  else localStorage.removeItem(SOURCE_KEY);
  window.dispatchEvent(new Event(SOURCE_CHANGED));
}

function getCalendarConnection() {
  try {
    return readCalendarUrl(localStorage.getItem(SOURCE_KEY) ?? '');
  } catch {
    return undefined;
  }
}

function subscribe(connectionChanged: () => void) {
  const storageChanged = (event: StorageEvent) => {
    if (event.key === SOURCE_KEY || event.key === null) connectionChanged();
  };
  window.addEventListener('storage', storageChanged);
  window.addEventListener(SOURCE_CHANGED, connectionChanged);
  return () => {
    window.removeEventListener('storage', storageChanged);
    window.removeEventListener(SOURCE_CHANGED, connectionChanged);
  };
}

export function useCalendarConnection() {
  const url = useSyncExternalStore(subscribe, getCalendarConnection, () => undefined);
  const origin = url && originPatternFor(url);
  const { granted, request } = useBrowserPermissions({ origins: origin ? [origin] : [] });
  const [revision, setRevision] = useState(0);
  const [response, setResponse] = useState<{
    url: string;
    revision: number;
    state: CalendarFeedResult;
  }>();

  useEffect(() => {
    if (!url || granted !== true) return;
    const controller = new AbortController();
    void fetchCalendar(url, controller.signal).then((state) => {
      if (!controller.signal.aborted) setResponse({ url, revision, state });
    });
    return () => controller.abort();
  }, [url, revision, granted]);

  let state: FeedState = { status: 'empty' };
  if (url) {
    if (granted === false) state = { status: 'permission' };
    else if (granted === true && response?.url === url && response.revision === revision)
      state = response.state;
    else state = { status: 'loading' };
  }
  return {
    state,
    connected: Boolean(url),
    refresh: () => setRevision((value) => value + 1),
    request,
  };
}
