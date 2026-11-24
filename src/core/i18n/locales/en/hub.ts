import type { LocaleShape } from '../../types';
import type { hub as ruHub } from '../ru/hub';

export const hub: LocaleShape<typeof ruHub> = {
  title: 'DashFlow Hub',
  description: 'Connect a local Hub to sync Items and Boards with this device.',
  privacy:
    'When connected, all Items and Boards sync with the Hub. Local data remains after disconnecting.',
  endpoint: 'Hub address',
  code: 'One-time code',
  pair: 'Connect Hub',
  pairCommand: 'dashflow-hub pair --origin',
  pairInstructions:
    'In the Hub terminal, run this command with the exact origin of this extension:',
  extensionOrigin: 'Extension origin',
  pairingHelp: 'The code expires after 5 minutes and can be used once.',
  disconnect: 'Disconnect Hub',
  retry: 'Retry sync',
  connected: 'Connected',
  connecting: 'Connecting',
  offline: 'Offline',
  error: 'Sync error',
  disconnected: 'Not connected',
  lastSync: 'Last sync',
  retryAt: 'Next attempt',
  issue: {
    address: 'Check the Hub address. For a local Hub, use 127.0.0.1.',
    permissions: 'The browser did not grant access to this address.',
    pairing: 'The code could not be used. Check it or create a new one.',
    unauthorized: 'Pairing expired or was rejected. Create a new code.',
    network: 'Hub is unavailable. Check the connection and try again.',
    data: 'Hub returned invalid data. Try again later.',
    size: 'The data being transferred exceeds the allowed size.',
  },
  requestFailed: 'Could not complete the Hub request.',
  pairingPermissionFailed: 'Could not request access to the Hub address.',
  historyTitle: 'Previous version',
  earlierVersion: 'An earlier version is available',
  historyUnavailable: 'Could not load the previous version.',
  historyEmpty: 'There are no previous versions.',
};
