import { browser } from 'wxt/browser';
import { asRecord } from '@/core/network/jsonReaders';
import { CAPTURE_COMMAND, CAPTURE_TICKET_MESSAGE, readCapturePage } from './model';
import { createCaptureTickets } from './tickets';
import { startCaptureMenu } from './contextMenu';

export function startCaptureBackground() {
  const tickets = createCaptureTickets();
  const popup = chrome.runtime.getURL('capture.html');
  startCaptureMenu();

  async function openCapture(
    tab?: Parameters<Parameters<typeof browser.commands.onCommand.addListener>[0]>[1],
  ) {
    const active =
      tab ?? (await browser.tabs.query({ active: true, currentWindow: true }).catch(() => []))[0];
    const page = readCapturePage(active);
    const ticket = page ? tickets.issue(page) : undefined;
    try {
      await browser.windows.create({
        type: 'popup',
        url: ticket ? `${popup}?ticket=${ticket}` : popup,
        width: 420,
        height: 360,
        focused: true,
      });
    } catch {
      if (ticket) tickets.discard(ticket);
      console.warn('[DashFlow] Не удалось открыть окно быстрого захвата');
    }
  }

  browser.commands.onCommand.addListener((command, tab) => {
    if (command === CAPTURE_COMMAND) void openCapture(tab);
  });

  return (value: unknown, sender: chrome.runtime.MessageSender) => {
    const message = asRecord(value);
    if (message.type !== CAPTURE_TICKET_MESSAGE) return undefined;
    const { ticket } = message;
    if (
      sender.id !== browser.runtime.id ||
      typeof ticket !== 'string' ||
      !/^[0-9a-f-]{36}$/.test(ticket) ||
      sender.url !== `${popup}?ticket=${ticket}`
    )
      return { page: null };

    return { page: tickets.take(ticket) ?? null };
  };
}
