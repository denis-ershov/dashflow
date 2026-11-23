import { t, useI18nStore } from '@/core/i18n';
import { asRecord, asString } from '@/core/network/jsonReaders';
import { WidgetRegistry } from '@/core/widget/registry';
import type { DashboardState } from '@/stores/useDashboardStore';
import { UndoConflictError } from './itemCommands';
import type { CommandDefinition, CommandLabel } from './types';

export type DashboardDeleteType = 'space.delete' | 'widget.delete' | 'speedDial.delete';

interface DeletePayload {
  id: string;
  spaceId?: string;
}

function deleteCommand(
  type: DashboardDeleteType,
  remove: (
    state: DashboardState,
    payload: DeletePayload,
  ) => ReturnType<DashboardState['removeWidget']>,
  describe: (title: string) => CommandLabel,
): CommandDefinition<DeletePayload, boolean> {
  return {
    type,
    validate(payload) {
      const raw = asRecord(payload);
      const id = asString(raw.id);
      const spaceId = asString(raw.spaceId);
      if (!id || (type === 'widget.delete' && !spaceId)) {
        throw new TypeError('Invalid dashboard deletion target');
      }
      return { id, spaceId };
    },
    async execute(payload) {
      const { useDashboardStore, waitForDashboard } = await import('@/stores/useDashboardStore');
      await waitForDashboard();
      const removed = remove(useDashboardStore.getState(), payload);
      if (!removed) return { result: false };
      return {
        result: true,
        label: describe(removed.title),
        undo: () =>
          removed.restore() ? Promise.resolve() : Promise.reject(new UndoConflictError(payload.id)),
      };
    },
  };
}

export const DASHBOARD_COMMANDS = [
  deleteCommand(
    'space.delete',
    (state, { id }) => state.removeSpace(id),
    (title) =>
      title ? { key: 'commands.spaceDeleted', params: { title } } : { key: 'commands.homeDeleted' },
  ),
  deleteCommand(
    'widget.delete',
    (state, { id, spaceId }) => state.removeWidget(id, spaceId),
    (widgetId) => {
      const definition = WidgetRegistry.get(widgetId);
      const language = useI18nStore.getState().language;
      const title = definition?.nameKey
        ? t(definition.nameKey, undefined, language)
        : definition?.name || widgetId;
      return { key: 'commands.widgetDeleted', params: { title } };
    },
  ),
  deleteCommand(
    'speedDial.delete',
    (state, { id }) => state.removeSpeedDialLink(id),
    (title) => ({ key: 'commands.speedDialDeleted', params: { title } }),
  ),
];
