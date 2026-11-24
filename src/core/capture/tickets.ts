import type { CapturePage } from './model';

const CAPTURE_TTL_MS = 60_000;
const MAX_PENDING_CAPTURES = 8;

export function createCaptureTickets(now = Date.now) {
  const pending = new Map<string, { page: CapturePage; expiresAt: number }>();

  function discard(ticket: string) {
    pending.delete(ticket);
  }

  return {
    issue(page: CapturePage) {
      const time = now();
      for (const [ticket, { expiresAt }] of pending) {
        if (expiresAt <= time) discard(ticket);
      }
      if (pending.size >= MAX_PENDING_CAPTURES) {
        const oldest = pending.keys().next().value;
        if (oldest) discard(oldest);
      }

      const ticket = crypto.randomUUID();
      pending.set(ticket, { page, expiresAt: time + CAPTURE_TTL_MS });
      return ticket;
    },
    take(ticket: string) {
      const entry = pending.get(ticket);
      discard(ticket);
      return entry && entry.expiresAt > now() ? entry.page : undefined;
    },
    discard,
  };
}
