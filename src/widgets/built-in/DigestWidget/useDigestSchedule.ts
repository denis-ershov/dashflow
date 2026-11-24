import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { DIGEST_SCHEDULE_KEY } from '@/core/digest/model';

export function useDigestSchedule() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let current = true;
    let changed = false;
    const handleChange: Parameters<typeof browser.storage.onChanged.addListener>[0] = (
      changes,
      area,
    ) => {
      if (area !== 'local' || !(DIGEST_SCHEDULE_KEY in changes)) return;
      changed = true;
      setEnabled(changes[DIGEST_SCHEDULE_KEY].newValue === true);
      setError(false);
    };
    browser.storage.onChanged.addListener(handleChange);
    void browser.storage.local
      .get(DIGEST_SCHEDULE_KEY)
      .then((stored) => {
        if (current && !changed) setEnabled(stored[DIGEST_SCHEDULE_KEY] === true);
      })
      .catch(() => {
        if (current && !changed) setError(true);
      });
    return () => {
      current = false;
      browser.storage.onChanged.removeListener(handleChange);
    };
  }, []);

  async function update(value: boolean) {
    setPending(true);
    setError(false);
    try {
      await browser.storage.local.set({ [DIGEST_SCHEDULE_KEY]: value });
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return { enabled, pending, error, update };
}
