import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { HUB_HISTORY } from '@/core/hub/model';
import { useTranslation } from '@/core/i18n';
import { parseStoredItem } from '@/core/items/validation';
import type { Item } from '@/core/items/types';
import { asRecord } from '@/core/network/jsonReaders';
import { MarkdownPreview } from '@/ui/feedback/MarkdownPreview';

export function KanbanEarlierVersion({ itemId, version }: { itemId: string; version: number }) {
  const { t } = useTranslation();
  const [saved, setSaved] = useState<{ forVersion: number; item: Item }>();
  useEffect(() => {
    if (!globalThis.chrome?.runtime?.id) return;
    let canceled = false;
    const read = async () => {
      const { item } = asRecord(await browser.runtime.sendMessage({ type: HUB_HISTORY, id: itemId }));
      if (item && !canceled) setSaved({ forVersion: version, item: parseStoredItem(item) });
    };
    void read().catch(() => {
      // История необязательна: карточка остаётся доступной при остановленном Hub.
    });
    return () => {
      canceled = true;
    };
  }, [itemId, version]);
  const earlier = saved?.forVersion === version && saved.item.id === itemId ? saved.item : undefined;
  if (!earlier) return null;
  return (
    <details className="rounded-lg border border-line bg-surface px-3">
      <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-fg">
        {t('hub.earlierVersion')}
      </summary>
      <section aria-label={t('hub.historyTitle')} className="space-y-2 pb-3 text-sm text-fg">
        <p className="font-semibold wrap-anywhere">{earlier.title}</p>
        {earlier.body && <MarkdownPreview text={earlier.body} />}
      </section>
    </details>
  );
}
