import { useEffect } from 'react';
import { useDashboardStore } from '@/stores/useDashboardStore';

/** Горячая клавиша работает до загрузки интерфейса палитры. */
export function useCommandPaletteHotkey() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.altKey ||
        event.shiftKey ||
        !(event.ctrlKey || event.metaKey) ||
        event.key.toLowerCase() !== 'k'
      ) {
        return;
      }
      const state = useDashboardStore.getState();
      if (!state.isCommandPaletteOpen && document.querySelector('[aria-modal="true"]')) return;
      event.preventDefault();
      state.setCommandPaletteOpen(!state.isCommandPaletteOpen);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
