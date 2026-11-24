import { describe, expect, it } from 'vitest';
import { createDefaultDashboardSnapshot } from '@/core/storage';
import {
  createStartupLayoutCache,
  parseStartupLayoutCache,
  readStartupLayoutCache,
  writeStartupLayoutCache,
} from '@/features/dashboard/startupLayoutCache';

describe('startup layout cache', () => {
  it('stores only bounded geometry, widget count, and active mode', () => {
    const snapshot = createDefaultDashboardSnapshot();
    const active = snapshot.spaces[0]!;
    active.title = 'Private workspace name';
    active.instances[0]!.settings = { secret: 'private setting', url: 'https://private.test' };
    const cache = createStartupLayoutCache(snapshot);

    expect(cache).toMatchObject({
      version: 1,
      mode: 'modular',
      widgetCount: active.instances.length,
    });
    expect(JSON.stringify(cache)).not.toContain('Private workspace name');
    expect(JSON.stringify(cache)).not.toContain('private setting');
    expect(JSON.stringify(cache)).not.toContain('private.test');
    expect(parseStartupLayoutCache(cache)).toEqual(cache);
  });

  it('rejects unsupported versions, extra fields, oversized geometry, and invalid dimensions', () => {
    const valid = {
      version: 1,
      mode: 'canvas',
      widgetCount: 1,
      geometry: [{ x: 0, y: 0, w: 12, h: 2 }],
    };
    expect(parseStartupLayoutCache({ ...valid, version: 2 })).toBeNull();
    expect(parseStartupLayoutCache({ ...valid, title: 'should not be cached' })).toBeNull();
    expect(
      parseStartupLayoutCache({ ...valid, geometry: [{ x: 0, y: 101, w: 12, h: 2 }] }),
    ).toBeNull();
    expect(
      parseStartupLayoutCache({ ...valid, geometry: [{ x: 12, y: 0, w: 1, h: 2 }] }),
    ).toBeNull();
    expect(parseStartupLayoutCache({ ...valid, widgetCount: 41 })).toBeNull();
  });

  it('round-trips through local storage and safely falls back when storage is unavailable', () => {
    const snapshot = createDefaultDashboardSnapshot();
    const storage = window.localStorage;
    storage.clear();
    writeStartupLayoutCache(snapshot, storage);

    expect(readStartupLayoutCache(storage)).toEqual(createStartupLayoutCache(snapshot));
    expect(
      readStartupLayoutCache({
        getItem() {
          throw new Error('storage disabled');
        },
      } as unknown as Storage),
    ).toBeNull();
  });
});
