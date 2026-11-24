import { describe, expect, it } from 'vitest';
import { menuCaptureDraft, readCapturePage } from '@/core/capture/model';
import { createCaptureTickets } from '@/core/capture/tickets';

describe('Данные быстрого захвата', () => {
  it('отбрасывает внутренние адреса и URL с именем пользователя или паролем', () => {
    expect(readCapturePage({ url: 'about:preferences', title: 'Settings' })).toBeUndefined();
    expect(readCapturePage({ url: 'https://user:pass@example.test' })).toBeUndefined();
    expect(readCapturePage({ url: 'https://example.test/path?q=filter', title: ' ' })).toEqual({
      url: 'https://example.test/path?q=filter',
      title: 'example.test',
    });
  });

  it('сохраняет выделение как заметку, ссылки и страницы как отдельные элементы', () => {
    const page = { url: 'https://example.test/', title: 'Документация' };
    expect(menuCaptureDraft({ selectionText: 'Один\nДва' }, page)).toEqual({
      kind: 'note',
      status: 'inbox',
      title: 'Один Два',
      body: 'Один\nДва',
    });
    expect(menuCaptureDraft({ pageUrl: page.url }, page)).toEqual({
      kind: 'link',
      status: 'inbox',
      ...page,
    });
    expect(
      menuCaptureDraft({ linkUrl: 'https://other.test/article', pageUrl: page.url }, page),
    ).toEqual({
      kind: 'link',
      status: 'inbox',
      url: 'https://other.test/article',
      title: 'other.test',
    });
    expect(
      menuCaptureDraft({ linkUrl: 'mailto:private@example.test', pageUrl: page.url }, page),
    ).toBeUndefined();
    expect(
      menuCaptureDraft({ editable: true, selectionText: 'Ввод в форме' }, page),
    ).toBeUndefined();
  });

  it('выдаёт данные по ключу один раз и отклоняет просроченный ключ', () => {
    let now = 0;
    const tickets = createCaptureTickets(() => now);
    const page = { url: 'https://example.test/', title: 'Документация' };
    const issued = tickets.issue(page);
    const expired = tickets.issue(page);
    expect(tickets.take(issued)).toEqual(page);
    expect(tickets.take(issued)).toBeUndefined();
    now = 60_000;
    expect(tickets.take(expired)).toBeUndefined();
  });
});
