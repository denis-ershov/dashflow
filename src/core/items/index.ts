import { publishItemsChanged } from './events';
import { createItemRepository } from './repository';

export * from './types';
export * from './ids';
export * from './validation';
export * from './events';
export * from './repository';
export * from './useItems';
export { ITEMS_DB_NAME } from './db';

/** Репозиторий приложения: база dashflow_items, уведомления всем вкладкам и воркеру */
export const itemRepository = createItemRepository({ notify: publishItemsChanged });
