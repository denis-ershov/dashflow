import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { CONTEXT_MENU_PERMISSION } from '@/core/capture/model';
import { useTranslation } from '@/core/i18n';
import { Switch } from '@/ui/primitives/Switch';

export function CaptureMenuSettings() {
  const { t } = useTranslation();
  const [granted, setGranted] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<'menuDenied' | 'menuError'>();

  useEffect(() => {
    const api = browser?.permissions;
    if (!api) return;
    let active = true;
    let changed = false;
    function handleAdded({ permissions }: { permissions?: string[] }) {
      if (!permissions?.includes('contextMenus')) return;
      changed = true;
      setGranted(true);
      setError(undefined);
    }
    function handleRemoved({ permissions }: { permissions?: string[] }) {
      if (!permissions?.includes('contextMenus')) return;
      changed = true;
      setGranted(false);
      setError(undefined);
    }
    api.onAdded.addListener(handleAdded);
    api.onRemoved.addListener(handleRemoved);
    void api
      .contains(CONTEXT_MENU_PERMISSION)
      .then((result) => {
        if (active && !changed) setGranted(result);
      })
      .catch(() => {
        if (active && !changed) setError('menuError');
      });
    return () => {
      active = false;
      api.onAdded.removeListener(handleAdded);
      api.onRemoved.removeListener(handleRemoved);
    };
  }, []);

  async function change(enabled: boolean) {
    setPending(true);
    setError(undefined);
    try {
      // Firefox требует, чтобы запрос разрешения начался в обработчике жеста.
      const changed = enabled
        ? await browser.permissions.request(CONTEXT_MENU_PERMISSION)
        : await browser.permissions.remove(CONTEXT_MENU_PERMISSION);
      if (changed) setGranted(enabled);
      else setError(enabled ? 'menuDenied' : 'menuError');
    } catch {
      setError('menuError');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="border-t border-line pt-2">
      <Switch
        checked={granted === true}
        disabled={granted === null || pending}
        label={t('capture.menuTitle')}
        onChange={(enabled) => void change(enabled)}
      />
      <p className="text-xs text-fg-muted">{t('capture.menuHint')}</p>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {t(`capture.${error}`)}
        </p>
      )}
    </div>
  );
}
