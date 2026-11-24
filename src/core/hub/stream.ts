import { asRecord } from '@/core/network/jsonReaders';
import { hubUrl } from './client';
import type { HubConnection } from './model';

export function subscribeHubStream(
  connection: HubConnection,
  onChanged: () => void,
  onClose: () => void,
): () => void {
  const url = hubUrl(connection.origin, 'stream');
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  const socket = new WebSocket(url);
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let stopped = false;

  socket.onopen = () => {
    socket.send(JSON.stringify({ type: 'authenticate', token: connection.token }));
  };
  socket.onmessage = (event: MessageEvent<unknown>) => {
    if (typeof event.data !== 'string' || event.data.length > 1024) return;
    let message: unknown;
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }
    const { type } = asRecord(message);
    if (type === 'ready' && !heartbeat) {
      heartbeat = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) socket.send('{"type":"ping"}');
      }, 20_000);
      onChanged();
    } else if (type === 'changes') onChanged();
  };
  socket.onclose = () => {
    clearInterval(heartbeat);
    if (!stopped) onClose();
  };

  return () => {
    stopped = true;
    clearInterval(heartbeat);
    socket.close();
  };
}
