import { asRecord } from '@/core/network/jsonReaders';
import { ITEM_LIMITS } from '@/core/items/validation';
import type { ItemDraft } from '@/core/items/types';
import type { browser } from 'wxt/browser';

export const CAPTURE_COMMAND = 'dashflow-quick-capture';
export const CAPTURE_MENU_ID = 'dashflow.capture';
export const CAPTURE_TICKET_MESSAGE = 'dashflow:take-capture-ticket';
export const CONTEXT_MENU_PERMISSION = {
  permissions: ['contextMenus'],
} satisfies Parameters<typeof browser.permissions.contains>[0];
export const CAPTURE_SOURCE = { type: 'user', id: 'local', name: 'local' } as const;

export interface CapturePage {
  url: string;
  title: string;
}

function captureUrl(value: unknown): URL | undefined {
  if (typeof value !== 'string' || value.length > ITEM_LIMITS.urlLength) return;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
    if (url.username || url.password || url.href.length > ITEM_LIMITS.urlLength) return;
    return url;
  } catch {
    return undefined;
  }
}

export function readCapturePage(value: unknown): CapturePage | undefined {
  const input = asRecord(value);
  const url = captureUrl(input.url);
  if (!url) return;
  const title =
    typeof input.title === 'string'
      ? input.title.slice(0, ITEM_LIMITS.titleLength).replace(/\s+/g, ' ').trim()
      : '';
  return { url: url.href, title: title || url.hostname };
}

interface MenuData {
  selectionText?: string;
  linkUrl?: string;
  pageUrl?: string;
  editable?: boolean;
}

export function menuCaptureDraft(info: MenuData, tab?: unknown): ItemDraft | undefined {
  if (info.editable) return;
  const selection = info.selectionText?.slice(0, ITEM_LIMITS.bodyLength).trim();
  if (selection) {
    return {
      kind: 'note',
      status: 'inbox',
      title: selection.slice(0, ITEM_LIMITS.titleLength).replace(/\s+/g, ' ').trim(),
      body: selection,
    };
  }

  if (info.linkUrl !== undefined) {
    const link = readCapturePage({ url: info.linkUrl });
    return link && { kind: 'link', status: 'inbox', ...link };
  }
  const page = readCapturePage({ url: info.pageUrl });
  if (!page) return;
  const activePage = readCapturePage(tab);
  return {
    kind: 'link',
    status: 'inbox',
    url: page.url,
    title: activePage?.url === page.url ? activePage.title : page.title,
  };
}
