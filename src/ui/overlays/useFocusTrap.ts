import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Хук для удержания фокуса внутри оверлея (Modal, Drawer) и возврата фокуса при закрытии.
 * Также обрабатывает закрытие по клавише Escape.
 */
export function useFocusTrap(
  active: boolean,
  containerRef: React.RefObject<HTMLElement | null>,
  onClose?: () => void,
): void {
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    // Сохраняем элемент, с которого был открыт оверлей
    if (document.activeElement instanceof HTMLElement) {
      previousActiveElementRef.current = document.activeElement;
    }

    const container = containerRef.current;
    if (container) {
      const focusable = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        container.focus();
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
        return;
      }

      if (e.key === 'Tab' && containerRef.current) {
        const focusable = Array.from(
          containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        );
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (
            document.activeElement === firstElement ||
            document.activeElement === containerRef.current
          ) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      // Возврат фокуса при закрытии (правило 16, AC#26)
      if (previousActiveElementRef.current && document.contains(previousActiveElementRef.current)) {
        previousActiveElementRef.current.focus();
      }
    };
  }, [active, containerRef, onClose]);
}
