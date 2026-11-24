import { publishItemsChanged } from './events';
import { createItemRepository } from './repository';

/** Репозиторий приложения общий для вкладок и фонового контекста. */
export const itemRepository = createItemRepository({ notify: publishItemsChanged });
