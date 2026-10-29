import { useEffect, type RefObject } from 'react';

function isTypingTarget(element: Element | null): boolean {
  if (!(element instanceof HTMLElement)) return false;
  return element.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName);
}

/** Клавиша «/» ставит фокус в поле поиска, если пользователь сейчас не печатает в другом поле */
export function useSlashHotkey(inputRef: RefObject<HTMLInputElement | null>, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTypingTarget(document.activeElement)) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputRef, enabled]);
}
