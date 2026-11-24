import { createHmac } from 'node:crypto';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { openHubRepository, type HubRepository } from '../src/db/index.js';
import { registerWebhooks } from '../src/http/webhooks.js';
import { parseWebhookTemplates } from '../src/connectors/webhookTemplate.js';

describe('webhook field templates', () => {
  let app: FastifyInstance | undefined;
  let db: HubRepository | undefined;

  afterEach(async () => {
    await app?.close();
    db?.close();
  });

  it('validates own template fields, safe dotted paths, and an eight-segment limit', () => {
    expect(
      parseWebhookTemplates({
        'credential-1': { kind: 'task', title: 'event.task.title', body: 'event.text' },
      }).get('credential-1'),
    ).toEqual({ kind: 'task', title: 'event.task.title', body: 'event.text' });
    expect(() =>
      parseWebhookTemplates({
        'credential-1': { kind: 'task', title: 'a.b.c.d.e.f.g.h.i' },
      }),
    ).toThrow('Invalid webhook template title');
    for (const segment of ['__proto__', 'constructor', 'prototype']) {
      expect(() =>
        parseWebhookTemplates({
          'credential-1': { kind: 'task', title: `event.${segment}.value` },
        }),
      ).toThrow('Invalid webhook template title');
    }
    expect(() =>
      parseWebhookTemplates(JSON.parse('{"__proto__":{"kind":"task","title":"title"}}')),
    ).toThrow('Invalid webhook credential ID');
    expect(() =>
      parseWebhookTemplates({ 'credential-1': { kind: 'task', title: 'title', extra: 'field' } }),
    ).toThrow('Invalid webhook template field');
  });

  it('maps signed payload paths and stores the item in inbox', async () => {
    db = openHubRepository();
    const credential = db.createWebhook('Synthetic source');
    app = Fastify();
    await registerWebhooks(
      app,
      db,
      20,
      () => undefined,
      () => undefined,
      parseWebhookTemplates({
        [credential.record.id]: {
          kind: 'link',
          title: 'event.headline',
          body: 'event.description',
          url: 'event.href',
        },
      }),
    );

    const payload = Buffer.from(
      JSON.stringify({
        kind: 'note',
        title: 'unmapped title',
        event: {
          headline: 'Mapped headline',
          description: 'Mapped body',
          href: 'https://example.test/story',
        },
      }),
    );
    const timestamp = String(Date.now());
    const delivery = 'synthetic-1';
    const signature = createHmac('sha256', credential.secret)
      .update(`${timestamp}.${delivery}.`)
      .update(payload)
      .digest('hex');
    const response = await app.inject({
      method: 'POST',
      url: `/v1/webhooks/in/${credential.token}`,
      payload,
      headers: {
        'content-type': 'application/json',
        'x-dashflow-timestamp': timestamp,
        'x-dashflow-delivery': delivery,
        'x-dashflow-signature': `sha256=${signature}`,
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      kind: 'link',
      title: 'Mapped headline',
      body: 'Mapped body',
      url: 'https://example.test/story',
      status: 'inbox',
      source: { type: 'connector', id: credential.record.id },
    });
  });
});
