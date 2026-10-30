import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * Необязательные права браузера (optional_permissions / optional_host_permissions).
 *
 * Манифест запрашивает при установке только `storage` и хосты погоды. Закладки, вкладки,
 * недавно закрытые вкладки и доступ к сайтам RSS-лент запрашиваются в момент, когда
 * пользователь включает соответствующую функцию, — так установка не показывает
 * предупреждение «доступ ко всем сайтам».
 *
 * Используются колбэки, а не промисы: пространство `chrome.*` в Firefox MV2 промисы не возвращает.
 */

export type OptionalApiPermission = 'bookmarks' | 'tabs' | 'sessions';

export interface BrowserPermissionRequest {
  permissions?: readonly OptionalApiPermission[];
  /** Шаблоны хостов вида `https://example.com/*` */
  origins?: readonly string[];
}

type PermissionsApi = typeof chrome.permissions;

/** В @types/chrome у событий прав не описан removeListener, хотя в браузере он есть */
interface PermissionsChangeEvent {
  addListener(callback: () => void): void;
  removeListener(callback: () => void): void;
}

function getPermissionsApi(): PermissionsApi | null {
  if (typeof chrome === 'undefined' || !chrome.runtime?.id || !chrome.permissions) return null;
  return chrome.permissions;
}

function toChromeRequest(req: BrowserPermissionRequest): chrome.permissions.Permissions {
  return {
    permissions: [...(req.permissions ?? [])],
    origins: [...(req.origins ?? [])],
  };
}

const isEmpty = (req: BrowserPermissionRequest) =>
  (req.permissions?.length ?? 0) === 0 && (req.origins?.length ?? 0) === 0;

/** Шаблон хоста для URL ленты; null для не-http(s) адресов */
export function originPatternFor(url: string): string | null {
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol !== 'http:' && protocol !== 'https:') return null;
    return `${protocol}//${hostname}/*`;
  } catch {
    return null;
  }
}

/** Уникальные шаблоны хостов для списка URL */
export function originPatternsFor(urls: readonly string[]): string[] {
  const patterns = urls.map(originPatternFor).filter((p): p is string => p !== null);
  return Array.from(new Set(patterns)).sort();
}

/**
 * Выданы ли права. Вне расширения (dev-сервер, тесты) API нет — считаем, что выданы:
 * там нечего запрашивать, а функции работают на заглушках.
 */
export function hasBrowserPermissions(req: BrowserPermissionRequest): Promise<boolean> {
  const api = getPermissionsApi();
  if (!api || isEmpty(req)) return Promise.resolve(true);
  return new Promise((resolve) => {
    api.contains(toChromeRequest(req), (granted) => {
      resolve(Boolean(granted) && !chrome.runtime.lastError);
    });
  });
}

/**
 * Запрос прав. Вызывать синхронно из обработчика клика, без await перед вызовом:
 * иначе браузер потеряет жест пользователя и откажет.
 */
export function requestBrowserPermissions(req: BrowserPermissionRequest): Promise<boolean> {
  const api = getPermissionsApi();
  if (!api || isEmpty(req)) return Promise.resolve(true);
  return new Promise((resolve) => {
    api.request(toChromeRequest(req), (granted) => {
      resolve(Boolean(granted) && !chrome.runtime.lastError);
    });
  });
}

export interface BrowserPermissionsState {
  /** null — проверка ещё идёт */
  granted: boolean | null;
  request: () => Promise<boolean>;
}

/**
 * Состояние прав для компонента. Следит за выдачей и отзывом прав (в том числе со страницы
 * настроек браузера) и перепроверяет их при изменении запроса.
 */
export function useBrowserPermissions(req: BrowserPermissionRequest): BrowserPermissionsState {
  const permissionsKey = (req.permissions ?? []).join(',');
  const originsKey = (req.origins ?? []).join(',');
  const stableReq = useMemo<BrowserPermissionRequest>(
    () => ({
      permissions: permissionsKey ? (permissionsKey.split(',') as OptionalApiPermission[]) : [],
      origins: originsKey ? originsKey.split(',') : [],
    }),
    [permissionsKey, originsKey],
  );

  const [granted, setGranted] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = () => {
      void hasBrowserPermissions(stableReq).then((value) => {
        if (!cancelled) setGranted(value);
      });
    };
    check();

    const api = getPermissionsApi();
    const events = [api?.onAdded, api?.onRemoved].filter(
      Boolean,
    ) as unknown as PermissionsChangeEvent[];
    events.forEach((event) => event.addListener(check));
    return () => {
      cancelled = true;
      events.forEach((event) => event.removeListener(check));
    };
  }, [stableReq]);

  const request = useCallback(async () => {
    const value = await requestBrowserPermissions(stableReq);
    setGranted(value);
    return value;
  }, [stableReq]);

  return { granted, request };
}
