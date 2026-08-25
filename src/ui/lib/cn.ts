import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Объединяет классы и разрешает конфликты утилит Tailwind: побеждает последняя.
 * Заменяет повторяющийся во всех компонентах вызов twMerge(clsx(...)).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
