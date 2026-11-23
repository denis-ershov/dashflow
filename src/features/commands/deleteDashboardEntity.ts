import type { DashboardDeleteType } from '@/core/commands/dashboardCommands';
import { t, useI18nStore } from '@/core/i18n';
import { crashLogger } from '@/core/observability';
import { toast } from '@/ui/primitives/Toast';

export function deleteDashboardEntity(
  type: DashboardDeleteType,
  id: string,
  spaceId?: string,
): void {
  void import('./undo')
    .then(({ dispatchWithUndoToast }) => dispatchWithUndoToast(type, { id, spaceId }))
    .catch((error: unknown) => {
      crashLogger.logError(error, 'storage', { stage: type });
      toast.error(t('commands.deleteFailed', undefined, useI18nStore.getState().language));
    });
}
