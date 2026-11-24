import { isPublicHttpUrl } from '@/core/network/feedProxy';
import { hasBrowserPermissions, originPatternFor } from '@/core/permissions/browserPermissions';
import { MAX_ICS_BYTES } from './icalComponents';

export const CALENDAR_URL_LIMIT = 4096;
export type CalendarFeedResult =
  | { status: 'ready'; text: string }
  | { status: 'permission' | 'network' | 'timeout' | 'tooLarge' | 'cancelled' };

export function readCalendarUrl(value: string): string | undefined {
  const input = value.trim();
  if (input.length > CALENDAR_URL_LIMIT || !isPublicHttpUrl(input)) return;
  const url = new URL(input);
  if (
    url.protocol !== 'https:' ||
    !url.hostname.includes('.') ||
    /^\d+(?:\.\d+){3}$/.test(url.hostname) ||
    url.port ||
    url.hash
  )
    return;
  return url.href;
}

async function readLimitedCalendar(response: Response): Promise<CalendarFeedResult> {
  if (Number(response.headers.get('content-length')) > MAX_ICS_BYTES) {
    await response.body?.cancel();
    return { status: 'tooLarge' };
  }
  if (!response.body) return { status: 'network' };
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_ICS_BYTES) {
        await reader.cancel();
        return { status: 'tooLarge' };
      }
      chunks.push(decoder.decode(value, { stream: true }));
    }
    chunks.push(decoder.decode());
    return { status: 'ready', text: chunks.join('') };
  } finally {
    reader.releaseLock();
  }
}

export async function fetchCalendar(
  input: string,
  signal: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<CalendarFeedResult> {
  const url = readCalendarUrl(input);
  const origin = url && originPatternFor(url);
  if (!url || !origin) return { status: 'network' };
  const controller = new AbortController();
  const cancel = () => controller.abort();
  const timer = setTimeout(cancel, 10_000);
  signal.addEventListener('abort', cancel, { once: true });
  if (signal.aborted) cancel();
  try {
    if (!(await hasBrowserPermissions({ origins: [origin] }))) return { status: 'permission' };
    if (controller.signal.aborted) return { status: signal.aborted ? 'cancelled' : 'timeout' };
    const response = await fetchImpl(url, {
      signal: controller.signal,
      credentials: 'omit',
      redirect: 'error',
      referrerPolicy: 'no-referrer',
      cache: 'no-store',
      headers: { Accept: 'text/calendar, application/ics;q=0.9, */*;q=0.1' },
    });
    if (!response.ok || response.redirected) {
      await response.body?.cancel();
      return { status: 'network' };
    }
    return await readLimitedCalendar(response);
  } catch {
    return {
      status: signal.aborted ? 'cancelled' : controller.signal.aborted ? 'timeout' : 'network',
    };
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', cancel);
  }
}
