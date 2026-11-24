import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { HUB_CALENDAR_AGENDA, readHubCalendar } from '@/core/hub/integrations';
import { asRecord } from '@/core/network/jsonReaders';
import { useHubStatus } from '@/features/hub/useHubStatus';

export function useHubCalendar(enabled: boolean) {
  const status = useHubStatus();
  const ready = enabled && status.state === 'connected';
  const [loaded, setLoaded] = useState<{ origin?: string; snapshot: ReturnType<typeof readHubCalendar> }>();

  useEffect(() => {
    if (!ready || !browser?.runtime?.id) {
      setLoaded(undefined);
      return;
    }
    let current = true;
    const update = async () => {
      try {
        const value = asRecord(await browser.runtime.sendMessage({ type: HUB_CALENDAR_AGENDA }));
        if (current) setLoaded({
          origin: status.origin,
          snapshot: value.ok === true ? readHubCalendar(value.snapshot) : null,
        });
      } catch {
        if (current) setLoaded(undefined);
      }
    };
    void update();
    const timer = setInterval(() => void update(), 5 * 60_000);
    return () => {
      current = false;
      clearInterval(timer);
    };
  }, [ready, status.origin]);

  return ready && loaded?.origin === status.origin ? loaded?.snapshot ?? null : null;
}
