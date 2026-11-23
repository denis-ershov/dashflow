import { activeSpaceOf, type DashboardSpace } from '@/core/storage';
import { useDashboardStore, type DashboardState } from '@/stores/useDashboardStore';

type GridFields = Pick<DashboardSpace, 'instances' | 'layouts' | 'baseColumns' | 'gap'>;
type DashboardFields = Pick<DashboardState, 'activeModal' | 'isEditMode' | 'layoutMode'>;

export function getActiveSpace(): DashboardSpace {
  return activeSpaceOf(useDashboardStore.getState());
}

export function configureDashboard({
  instances,
  layouts,
  baseColumns,
  gap,
  ...state
}: Partial<GridFields & DashboardFields>): void {
  const current = getActiveSpace();
  const space = {
    ...current,
    instances: instances ?? current.instances,
    layouts: layouts ?? current.layouts,
    baseColumns: baseColumns ?? current.baseColumns,
    gap: gap ?? current.gap,
  };
  useDashboardStore.setState({ ...state, spaces: [space] });
}
