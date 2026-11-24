import { browser } from 'wxt/browser';
import { HUB_STATUS_KEY, HUB_TAB, readHubStatus } from './model';

/** Открытая вкладка держит подписку на изменения Hub. Без пары подключение не создаётся. */
export function attachHubTab() {
  let current: ReturnType<typeof browser.runtime.connect> | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  let active = false;

  function connect() {
    if (disposed || !active || current) return;
    try {
      const port = browser.runtime.connect({ name: HUB_TAB });
      current = port;
      port.onDisconnect.addListener(() => {
        if (current !== port) return;
        current = undefined;
        if (!disposed && active) retry = setTimeout(connect, 5_000);
      });
    } catch {
      if (!disposed && active) retry = setTimeout(connect, 5_000);
    }
  }

  function disconnect() {
    clearTimeout(retry);
    const port = current;
    current = undefined;
    port?.disconnect();
  }

  function update(value: unknown) {
    active = readHubStatus(value).state !== 'disconnected';
    if (active) connect();
    else disconnect();
  }

  const onChanged: Parameters<typeof browser.storage.onChanged.addListener>[0] = (
    changes,
    area,
  ) => {
    if (area === 'local' && HUB_STATUS_KEY in changes) update(changes[HUB_STATUS_KEY]?.newValue);
  };
  browser.storage.onChanged.addListener(onChanged);
  void browser.storage.local.get(HUB_STATUS_KEY).then(
    (values) => {
      if (!disposed) update(values[HUB_STATUS_KEY]);
    },
    () => console.warn('[DashFlow] Не удалось прочитать состояние Hub'),
  );

  return () => {
    disposed = true;
    browser.storage.onChanged.removeListener(onChanged);
    disconnect();
  };
}
