import { afterEach, describe, expect, it } from 'vitest';
import { openHubRepository, type HubRepository } from '../src/db/index.js';
import { webhookCommand } from '../src/webhookCli.js';

const repositories: HubRepository[] = [];
const repository = () => {
  const db = openHubRepository(':memory:');
  repositories.push(db);
  return db;
};

afterEach(() => {
  for (const db of repositories.splice(0)) db.close();
});

describe('webhook CLI commands', () => {
  it('creates once-only credentials, lists metadata only, and revokes', () => {
    const db = repository();
    let output = '';
    const write = (text: string) => {
      output += text;
    };

    webhookCommand(
      ['create', 'Synthetic source'],
      db,
      'http://127.0.0.1:47831/v1/webhooks/in',
      write,
    );
    const created = output;
    expect(created).toContain('Path (shown once): http://127.0.0.1:47831/v1/webhooks/in/');
    expect(created).toContain('Signing key (shown once): ');
    const id = created.match(/ID: ([^\n]+)/)?.[1];
    expect(id).toBeDefined();

    output = '';
    webhookCommand(['list'], db, '', write);
    expect(output).toContain(`${id}\tSynthetic source\tactive\t`);
    expect(output).not.toContain(
      created.split('Signing key (shown once): ')[1]?.split('\n')[0] ?? '',
    );
    expect(output).not.toContain('/v1/webhooks/in/');

    output = '';
    webhookCommand(['revoke', id ?? ''], db, '', write);
    expect(output).toBe(`Revoked webhook ${id}.\n`);
    expect(() => webhookCommand(['revoke', id ?? ''], db, '', write)).toThrow(
      'Active webhook not found',
    );
    expect(db.listWebhooks()[0]?.revokedAt).toBeDefined();
  });

  it('rejects malformed command arguments', () => {
    const db = repository();
    expect(() => webhookCommand(['create'], db, '', () => undefined)).toThrow(
      'Usage: dashflow-hub webhook create <name>|list|revoke <id>',
    );
    expect(() => webhookCommand(['revoke'], db, '', () => undefined)).toThrow(
      'Usage: dashflow-hub webhook create <name>|list|revoke <id>',
    );
  });
});
