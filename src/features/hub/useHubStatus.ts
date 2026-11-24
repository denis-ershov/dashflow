import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { HUB_DISCONNECTED, HUB_STATUS_KEY, readHubStatus, type HubStatus } from '@/core/hub/model';

export function useHubStatus(): HubStatus {
  const [status, setStatus] = useState<HubStatus>(HUB_DISCONNECTED);

  useEffect(() => {
    if (!browser?.runtime?.id || !browser.storage?.local || !browser.storage.onChanged) return;
    let active = true;
    const update = (value: unknown) => {
      if (active) setStatus(readHubStatus(value));
    };
    const onChanged: Parameters<typeof browser.storage.onChanged.addListener>[0] = (
      changes,
      area,
    ) => {
      if (area === 'local' && HUB_STATUS_KEY in changes) {
        update(changes[HUB_STATUS_KEY]?.newValue);
      }
    };

    browser.storage.onChanged.addListener(onChanged);
    void browser.storage.local.get(HUB_STATUS_KEY).then(
      (values) => update(values[HUB_STATUS_KEY]),
      () => update({ state: 'error', issue: 'data' }),
    );

    return () => {
      active = false;
      browser.storage.onChanged.removeListener(onChanged);
    };
  }, []);

  return status;
}
