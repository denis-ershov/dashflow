import { useEffect } from 'react';
import { useDashboardStore } from '@/stores/useDashboardStore';

export function useSpaceHotkeys(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.isComposing)
        return;
      const digit = /^Digit([1-9])$/.exec(event.code)?.[1];
      if (!digit || event.defaultPrevented) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || target.closest('input, textarea, select'))
      )
        return;
      const state = useDashboardStore.getState();
      if (
        state.activeModal ||
        state.isCommandPaletteOpen ||
        document.querySelector('[aria-modal="true"]')
      )
        return;
      const space = state.spaces[Number(digit) - 1];
      if (!space) return;
      event.preventDefault();
      state.switchSpace(space.id);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
