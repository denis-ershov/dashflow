import type React from 'react';

/**
 * Клавиатурная активация карточки с role="button": Enter и Space вызывают то же действие,
 * что и клик. Нажатия на вложенных кнопках (например, «Удалить») карточку не активируют.
 */
export function onActivationKey(action: () => void) {
  return (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  };
}
