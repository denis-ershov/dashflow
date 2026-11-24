import { lookup } from 'node:dns/promises';
import type { IncomingMessage } from 'node:http';
import { request, type RequestOptions } from 'node:https';
import { BlockList, isIP } from 'node:net';
import { checkServerIdentity } from 'node:tls';
import { MAX_ICS_BYTES } from '@dashflow/shared';
import { ConnectorError } from './contract.js';

const IPv4 = new BlockList();
for (const [network, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 3],
] as const)
  IPv4.addSubnet(network, prefix);

const publicIPv6 = new BlockList();
publicIPv6.addSubnet('2000::', 3, 'ipv6');
const reservedIPv6 = new BlockList();
for (const [network, prefix] of [
  ['2001::', 23],
  ['2001:db8::', 32],
  ['2002::', 16],
  ['3fff::', 20],
] as const)
  reservedIPv6.addSubnet(network, prefix, 'ipv6');

interface Address {
  address: string;
  family: number;
}

function publicAddress({ address, family }: Address) {
  if (isIP(address) !== family || address.includes('%')) return false;
  if (family === 4) return !IPv4.check(address);
  return family === 6 && publicIPv6.check(address, 'ipv6') && !reservedIPv6.check(address, 'ipv6');
}

export interface CalendarNetwork {
  resolve: (hostname: string) => Promise<readonly Address[]>;
  request: (options: RequestOptions, signal: AbortSignal) => Promise<IncomingMessage>;
}

const network: CalendarNetwork = {
  resolve: (hostname) => lookup(hostname, { all: true }),
  request(options, signal) {
    return new Promise((resolve, reject) => {
      const client = request({ ...options, signal }, resolve);
      client.once('error', reject);
      client.end();
    });
  },
};

const CONTENT_TYPES = new Set(['text/calendar', 'application/ics', 'application/octet-stream']);
const HOSTNAME = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
const PRIVATE_HOST_SUFFIX = /\.(?:localhost|local|internal|localdomain|home\.arpa)$/i;

export function calendarUrl(raw: string, allowedHostname: string): URL {
  try {
    const url = new URL(raw);
    if (
      raw.length > 2_048 ||
      !HOSTNAME.test(allowedHostname) ||
      PRIVATE_HOST_SUFFIX.test(allowedHostname) ||
      allowedHostname.length > 253 ||
      url.protocol !== 'https:' ||
      url.port !== '' ||
      url.hostname !== allowedHostname.toLowerCase() ||
      url.username ||
      url.password ||
      raw.includes('#')
    )
      throw new ConnectorError('CONFIGURATION');
    return url;
  } catch {
    throw new ConnectorError('CONFIGURATION');
  }
}

async function resolveWithinDeadline(
  resolve: CalendarNetwork['resolve'],
  hostname: string,
  signal: AbortSignal,
) {
  signal.throwIfAborted();
  let abort: (() => void) | undefined;
  try {
    const cancellation = new Promise<never>((_resolve, reject) => {
      abort = () => reject(new ConnectorError('UNAVAILABLE'));
      signal.addEventListener('abort', abort, { once: true });
    });
    return await Promise.race([resolve(hostname), cancellation]);
  } finally {
    if (abort) signal.removeEventListener('abort', abort);
  }
}

function requireCalendarResponse(response: IncomingMessage) {
  const status = response.statusCode ?? 0;
  if (status === 429) {
    const wait = response.headers['retry-after'];
    const ms = typeof wait === 'string' && /^\d{1,6}$/.test(wait) ? Number(wait) * 1_000 : 60_000;
    throw new ConnectorError('RATE_LIMITED', Date.now() + Math.max(60_000, ms));
  }
  if (status === 401 || status === 403) throw new ConnectorError('UNAUTHORIZED');
  if (status >= 500) throw new ConnectorError('UNAVAILABLE');
  const headers = response.headers;
  const contentType = headers['content-type']?.split(';')[0]?.trim().toLowerCase() ?? '';
  const length = Number(headers['content-length']);
  if (
    status !== 200 ||
    !CONTENT_TYPES.has(contentType) ||
    (headers['content-encoding'] && headers['content-encoding'] !== 'identity') ||
    length > MAX_ICS_BYTES
  )
    throw new ConnectorError('INVALID_RESPONSE');
}

async function readCalendarBody(response: IncomingMessage) {
  const chunks: Buffer[] = [];
  let bytes = 0;
  try {
    requireCalendarResponse(response);
    for await (const input of response) {
      const chunk: unknown = input;
      if (!Buffer.isBuffer(chunk)) throw new ConnectorError('INVALID_RESPONSE');
      bytes += chunk.length;
      if (bytes > MAX_ICS_BYTES) throw new ConnectorError('INVALID_RESPONSE');
      chunks.push(chunk);
    }
    if (!response.complete) throw new ConnectorError('UNAVAILABLE');
    return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks, bytes));
  } catch (error) {
    response.destroy();
    if (error instanceof ConnectorError) throw error;
    throw new ConnectorError('INVALID_RESPONSE');
  }
}

export async function fetchCalendar(
  url: URL,
  parentSignal: AbortSignal,
  transport: CalendarNetwork = network,
) {
  const signal = AbortSignal.any([parentSignal, AbortSignal.timeout(10_000)]);
  try {
    const addresses = await resolveWithinDeadline(transport.resolve, url.hostname, signal);
    const target = addresses[0];
    if (!target || addresses.length > 32 || addresses.some((address) => !publicAddress(address)))
      throw new ConnectorError('CONFIGURATION');
    signal.throwIfAborted();
    const response = await transport.request(
      {
        protocol: 'https:',
        hostname: target.address,
        family: target.family,
        servername: url.hostname,
        checkServerIdentity: (_host, cert) => checkServerIdentity(url.hostname, cert),
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2',
        agent: false,
        method: 'GET',
        path: url.pathname + url.search,
        headers: { Host: url.hostname, Accept: 'text/calendar', 'Accept-Encoding': 'identity' },
      },
      signal,
    );
    return await readCalendarBody(response);
  } catch (error) {
    if (error instanceof ConnectorError) throw error;
    throw new ConnectorError('UNAVAILABLE');
  }
}
