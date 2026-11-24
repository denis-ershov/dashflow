import { createHash } from 'node:crypto';
import { ITEM_LIMITS } from '@dashflow/shared';
import { z } from 'zod';
import { ConnectorError, type PollingConnector } from './contract.js';
import { withMailClient, type MailClient, type MailClientFactory } from './mailImap.js';
import { MAIL_MESSAGE_LIMIT, mailUid, readMailSearch } from './mailSearch.js';

const DAY_MS = 86_400_000;
const hostname = z
  .string()
  .max(253)
  .regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/i);
const address = z.email().max(254);
const printable = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .refine(
      (value) =>
        !Array.from(value).some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127),
    );
const publicConfiguration = z
  .object({
    host: hostname,
    mailbox: printable(255).optional(),
    allowedSenders: z.array(address).min(1).max(100),
    subjectIncludes: printable(100).optional(),
  })
  .strict();
const configuration = publicConfiguration.extend({
  username: printable(320),
  password: printable(1_024),
});
const mailboxData = z.object({
  readOnly: z.literal(true),
  uidValidity: z.bigint().min(1n).max(0xffff_ffffn),
});
const envelope = z.object({
  uid: mailUid,
  internalDate: z.date(),
  envelope: z
    .object({
      from: z
        .array(
          z.object({
            name: z.string().max(4096).optional(),
            address: z.string().max(512).optional(),
          }),
        )
        .max(64)
        .optional(),
      subject: z.string().max(16_384).optional(),
    })
    .optional(),
});

interface MailConfig {
  host: string;
  username: string;
  password: string;
  mailbox?: string;
  allowedSenders: readonly string[];
  subjectIncludes?: string;
}

function escape(value: string, max: number) {
  return value
    .normalize('NFC')
    .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]+/gu, ' ')
    .trim()
    .slice(0, max)
    .replace(/[\uD800-\uDBFF]$/u, '')
    .replace(/[\\[\]]/gu, '\\$&');
}

function normalized(value: string) {
  return value.normalize('NFC').toLowerCase();
}

function stableId(parts: readonly (string | number)[]) {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex');
}

function previousDay() {
  const end = Math.floor(Date.now() / DAY_MS) * DAY_MS;
  return { start: end - DAY_MS, end, day: new Date(end - DAY_MS).toISOString().slice(0, 10) };
}

interface Filter {
  senders: ReadonlySet<string>;
  subject?: string;
  redact: (value: string) => string;
}

function displayLine(mail: z.infer<typeof envelope>, { senders, subject: rule, redact }: Filter) {
  const subject = mail.envelope?.subject ?? '';
  if (rule && !normalized(subject).includes(rule)) return;
  const from = mail.envelope?.from;
  if (!from || from.length !== 1) return;
  const sender = from[0];
  if (!sender?.address || !senders.has(normalized(sender.address))) return;
  const email = escape(redact(sender.address), 254);
  const name = escape(redact(sender.name ?? ''), 96);
  const title = escape(redact(subject), 240);
  const senderLabel = name ? `${name} <${email}>` : email;
  return `- ${senderLabel}${title ? ` — ${title}` : ''}`;
}

async function collectDigest(
  client: MailClient,
  signal: AbortSignal,
  {
    account,
    mailbox,
    period,
    filter,
  }: {
    account: string;
    mailbox: string;
    period: ReturnType<typeof previousDay>;
    filter: Filter;
  },
) {
  const selected = mailboxData.safeParse(await client.mailboxOpen(mailbox, { readOnly: true }));
  if (!selected.success) throw new ConnectorError('INVALID_RESPONSE');
  signal.throwIfAborted();
  const { start, end, day } = period;
  const query = { since: new Date(start - DAY_MS), before: new Date(end + DAY_MS) };
  const { uids, incomplete } = readMailSearch(
    await client.search(query, {
      uid: true,
      strict: true,
      returnOptions: ['ALL', 'COUNT'],
    }),
  );
  signal.throwIfAborted();
  if (!uids.length) return { body: '', incomplete };
  const requested = new Set(uids);
  const seen = new Set<string>();
  const lines = new Map<number, string>();
  const validity = selected.data.uidValidity.toString();
  let consumed = 0;
  for await (const input of client.fetch(
    uids,
    { uid: true, envelope: true, internalDate: true },
    { uid: true },
  )) {
    signal.throwIfAborted();
    const entry = envelope.safeParse(input);
    if (++consumed > MAIL_MESSAGE_LIMIT || !entry.success || !requested.has(entry.data.uid))
      throw new ConnectorError('INVALID_RESPONSE');
    const mail = entry.data;
    const key = stableId([account, validity, mail.uid, day]);
    if (seen.has(key)) continue;
    seen.add(key);
    const time = mail.internalDate.getTime();
    if (time < start || time >= end) continue;
    const line = displayLine(mail, filter);
    if (line) lines.set(mail.uid, line);
  }
  const body = uids
    .map((uid) => lines.get(uid) ?? '')
    .filter(Boolean)
    .join('\n');
  if (body.length > ITEM_LIMITS.bodyLength) throw new ConnectorError('INCOMPLETE');
  return { body, incomplete: incomplete || seen.size < requested.size };
}

export function createMailConnector(
  options: MailConfig,
  factory?: MailClientFactory,
): PollingConnector {
  const parsed = configuration.safeParse(options);
  if (!parsed.success || !parsed.data.username.trim() || !parsed.data.password.trim())
    throw new ConnectorError('CONFIGURATION');
  const config = parsed.data;
  const host = config.host.toLowerCase();
  const mailboxName = config.mailbox?.trim() ?? 'INBOX';
  if (!mailboxName) throw new ConnectorError('CONFIGURATION');
  const mailbox = mailboxName.toUpperCase() === 'INBOX' ? 'INBOX' : mailboxName;
  const senders = new Set(config.allowedSenders.map(normalized));
  const subjectRule = config.subjectIncludes && normalized(config.subjectIncludes.trim());
  if (subjectRule === '') throw new ConnectorError('CONFIGURATION');
  const account = stableId([host, config.username, mailbox]);
  const redact = (value: string) => value.replaceAll(config.password, '[redacted]');
  const filter = { senders, subject: subjectRule, redact };

  return {
    id: 'mail',
    name: 'Email',
    configSchema: z.toJSONSchema(publicConfiguration),
    async poll({ signal }) {
      const period = previousDay();
      const externalId = stableId([account, period.day]);
      const result = await withMailClient(
        { host, username: config.username, password: config.password },
        signal,
        (client, deadline) => collectDigest(client, deadline, { account, mailbox, period, filter }),
        factory,
      );
      return {
        incomplete: result.incomplete,
        items: result.body
          ? [
              {
                externalId,
                draft: {
                  kind: 'digest',
                  title: `Email · ${period.day}`,
                  body: result.body,
                  status: 'unread',
                },
              },
            ]
          : [],
      };
    },
  };
}
