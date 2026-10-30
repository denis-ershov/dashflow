/**
 * Элемент массива по индексу для тестов под noUncheckedIndexedAccess: вместо `?.` по всему
 * тесту — явная ошибка с понятным сообщением, если элемента нет.
 */
export function at<T>(items: readonly T[] | ArrayLike<T>, index: number): T {
  const item = items[index];
  if (item === undefined) {
    throw new Error(`Нет элемента с индексом ${index} (длина ${items.length})`);
  }
  return item;
}
