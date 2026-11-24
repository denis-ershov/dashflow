import type { HubRepository } from './db/index.js';

type Output = (text: string) => void;

const writeStdout: Output = (text) => process.stdout.write(text);

export function webhookCommand(
  args: string[],
  repository: HubRepository,
  endpointBase: string,
  write: Output = writeStdout,
): void {
  const action = args.shift();
  if (action === 'create' && args.length === 1) {
    const name = args[0];
    if (!name || name.startsWith('--')) throw new Error('webhook create requires a name');
    const result = repository.createWebhook(name);
    write(`Path (shown once): ${endpointBase}/${result.token}\n`);
    write(`Signing key (shown once): ${result.secret}\n`);
    write(`ID: ${result.record.id}\n`);
    return;
  }

  if (action === 'list' && args.length === 0) {
    const webhooks = repository.listWebhooks();
    if (webhooks.length === 0) {
      write('No webhooks.\n');
      return;
    }
    for (const webhook of webhooks) {
      const state = webhook.revokedAt ? `revoked ${webhook.revokedAt}` : 'active';
      write(`${webhook.id}\t${webhook.name}\t${state}\t${webhook.createdAt}\n`);
    }
    return;
  }

  if (action === 'revoke' && args.length === 1) {
    const [id] = args;
    if (!id || !repository.revokeWebhook(id)) throw new Error('Active webhook not found');
    write(`Revoked webhook ${id}.\n`);
    return;
  }

  throw new Error('Usage: dashflow-hub webhook create <name>|list|revoke <id>');
}
