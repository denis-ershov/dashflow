import { ImapFlow, type ImapFlowOptions, type SearchObject, type SearchOptions } from 'imapflow';
import { ConnectorError } from './contract.js';

export interface MailClient {
  connect(): Promise<void>;
  on(event: 'error', listener: (error: unknown) => void): unknown;
  close(): void;
  mailboxOpen(mailbox: string, options: { readOnly: true }): Promise<unknown>;
  search(query: SearchObject, options: SearchOptions): Promise<unknown>;
  fetch(
    uids: number[],
    query: { uid: true; envelope: true; internalDate: true },
    options: { uid: true },
  ): AsyncIterable<unknown>;
}

export type MailClientFactory = (options: ImapFlowOptions) => MailClient;
const clientFactory: MailClientFactory = (options) => new ImapFlow(options);

const RESPONSE_ERRORS = new Set([
  'LineTooLarge',
  'LiteralTooLarge',
  'ResponseTooLarge',
  'InvalidSearchResponse',
]);
const TIMEOUT_MS = 30_000;

function safeError(error: unknown) {
  if (error instanceof ConnectorError) return error;
  if (typeof error === 'object' && error !== null) {
    if ('authenticationFailed' in error && error.authenticationFailed === true)
      return new ConnectorError('UNAUTHORIZED');
    if ('mailboxMissing' in error && error.mailboxMissing === true)
      return new ConnectorError('CONFIGURATION');
    if ('code' in error && typeof error.code === 'string' && RESPONSE_ERRORS.has(error.code))
      return new ConnectorError('INVALID_RESPONSE');
  }
  return new ConnectorError('UNAVAILABLE');
}

export async function withMailClient<T>(
  { host, username, password }: { host: string; username: string; password: string },
  parentSignal: AbortSignal,
  collect: (client: MailClient, signal: AbortSignal) => Promise<T>,
  factory: MailClientFactory = clientFactory,
) {
  const signal = AbortSignal.any([parentSignal, AbortSignal.timeout(TIMEOUT_MS)]);
  let client: MailClient | undefined;
  let result: T;
  let closed = false;
  let closeFailed = false;
  const close = () => {
    if (!client || closed) return;
    closed = true;
    try {
      client.close();
    } catch {
      closeFailed = true;
    }
  };
  try {
    signal.throwIfAborted();
    client = factory({
      host,
      servername: host,
      port: 993,
      secure: true,
      tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
      auth: { user: username, pass: password },
      logger: false,
      logRaw: false,
      emitLogs: false,
      disableAutoIdle: true,
      disableCompression: true,
      disableBinary: true,
      disableAutoEnable: true,
      idHashAlgorithm: 'sha256',
      connectionTimeout: 8_000,
      greetingTimeout: 5_000,
      socketTimeout: 10_000,
      maxLineLength: 32 * 1024,
      maxLiteralSize: 16 * 1024,
      maxResponseSize: 64 * 1024,
    });
    client.on('error', close);
    signal.addEventListener('abort', close, { once: true });
    await client.connect();
    signal.throwIfAborted();
    result = await collect(client, signal);
    signal.throwIfAborted();
  } catch (error) {
    throw safeError(error);
  } finally {
    signal.removeEventListener('abort', close);
    close();
  }
  if (closeFailed) throw new ConnectorError('UNAVAILABLE');
  return result;
}
