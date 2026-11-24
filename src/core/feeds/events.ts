const CHANNEL = 'dashflow-rss';
type FeedChange = { instanceId: string } | { history: true };

let channel: BroadcastChannel | undefined;

function bus() {
  if (typeof BroadcastChannel !== 'undefined') channel ??= new BroadcastChannel(CHANNEL);
  return channel;
}

export function publishFeedChange(change: FeedChange) {
  bus()?.postMessage(change);
}

export function subscribeFeedChanges(listener: (change: FeedChange) => void) {
  const target = bus();
  if (!target) return () => undefined;
  const handler = ({ data }: MessageEvent<unknown>) => {
    if (typeof data !== 'object' || data === null) return;
    if ('instanceId' in data && typeof data.instanceId === 'string')
      listener({ instanceId: data.instanceId });
    if ('history' in data && data.history === true) listener({ history: true });
  };
  target.addEventListener('message', handler);
  return () => target.removeEventListener('message', handler);
}
