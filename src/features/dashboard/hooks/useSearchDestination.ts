import { useCallback, useEffect, useState } from 'react';
import type { Item } from '@/core/items';
import { REVEAL_WORKSPACE_ITEM } from '@/core/items/revealItem';
import { isSafeHttpUrl } from '@/core/network/url';
import { activeLayoutModeOf } from '@/core/storage';
import { useDashboardStore } from '@/stores/useDashboardStore';

interface WidgetTarget {
  spaceId: string;
  instanceId: string;
  item?: Item;
}

export function useSearchDestination() {
  const [target, setTarget] = useState<WidgetTarget | null>(null);
  const [preview, setPreview] = useState<Item | null>(null);
  const closePreview = useCallback(() => setPreview(null), []);

  const revealWidget = (next: WidgetTarget) => {
    useDashboardStore.getState().switchSpace(next.spaceId);
    const state = useDashboardStore.getState();
    if (activeLayoutModeOf(state) === 'zen') state.setLayoutMode('modular');
    setTarget(next);
  };

  const revealItem = (item: Item) => {
    if (item.kind === 'link' && item.url && isSafeHttpUrl(item.url)) {
      window.open(item.url, '_blank', 'noopener,noreferrer');
      return;
    }
    const { spaces, activeSpaceId } = useDashboardStore.getState();
    const preferred = spaces.find((space) => space.id === activeSpaceId);
    const ordered = preferred
      ? [preferred, ...spaces.filter((space) => space !== preferred)]
      : spaces;
    for (const space of ordered) {
      const widget = space.instances.find(
        ({ settings, widgetId }) =>
          (item.status === 'inbox' && widgetId === 'inbox') ||
          (item.kind === 'note' && widgetId === 'notes' && settings.itemId === item.id) ||
          (item.status !== 'inbox' &&
            widgetId === 'todo' &&
            item.boardId &&
            settings.boardId === item.boardId),
      );
      if (widget) {
        revealWidget({ spaceId: space.id, instanceId: widget.instanceId, item });
        return;
      }
    }
    setPreview(item);
  };

  useEffect(() => {
    if (!target) return;
    const widgetSelector = `[data-search-widget="${CSS.escape(target.instanceId)}"]`;
    let highlighted: HTMLElement | null = null;
    let requested: HTMLElement | undefined;
    let timeout: ReturnType<typeof setTimeout>;
    const observer = new MutationObserver(reveal);

    function reveal() {
      if (!target || useDashboardStore.getState().activeSpaceId !== target.spaceId) return;
      const widget = document.querySelector<HTMLElement>(widgetSelector);
      const destination = target.item
        ? widget?.querySelector<HTMLElement>(`[data-search-item="${CSS.escape(target.item.id)}"]`)
        : widget;
      if (!destination) {
        const endpoint = target.item && widget?.querySelector<HTMLElement>('[data-search-reveal]');
        if (endpoint && endpoint !== requested) {
          requested = endpoint;
          endpoint.dispatchEvent(new CustomEvent(REVEAL_WORKSPACE_ITEM, { detail: target.item?.id }));
        }
        return;
      }
      observer.disconnect();
      clearTimeout(timeout);
      highlighted = destination;
      destination.setAttribute('data-search-highlight', '');
      destination.scrollIntoView({ block: 'nearest' });
      destination.focus({ preventScroll: true });
      timeout = setTimeout(() => setTarget(null), 2200);
    }

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-search-item'],
    });
    timeout = setTimeout(() => {
      if (target.item && useDashboardStore.getState().activeSpaceId === target.spaceId)
        setPreview(target.item);
      setTarget(null);
    }, 1200);
    reveal();
    return () => {
      observer.disconnect();
      clearTimeout(timeout);
      highlighted?.removeAttribute('data-search-highlight');
    };
  }, [target]);

  return { revealWidget, revealItem, preview, closePreview };
}
