import { itemRepository, type ItemSource } from '@/core/items';
import { createDispatcher } from './dispatcher';
import { DASHBOARD_COMMANDS } from './dashboardCommands';
import { ITEM_COMMANDS } from './itemCommands';

export * from './types';
export * from './dispatcher';
export * from './itemCommands';

/** Источник изменений, сделанных пользователем в этом браузере */
export const LOCAL_USER_SOURCE: ItemSource = { type: 'user', id: 'local', name: 'local' };

/** Шина команд интерфейса: изменения от имени пользователя, история отмены вкладки */
export const commandBus = createDispatcher({
  context: { repository: itemRepository, source: LOCAL_USER_SOURCE },
  commands: [...ITEM_COMMANDS, ...DASHBOARD_COMMANDS],
});
