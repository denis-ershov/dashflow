import { beforeEach, describe, expect, it } from 'vitest';
import { createDispatcher, type CommandContext } from '@/core/commands';
import { DASHBOARD_COMMANDS } from '@/core/commands/dashboardCommands';
import { activeSpaceOf } from '@/core/storage';
import { useDashboardStore, waitForDashboard } from '@/stores/useDashboardStore';
import { at } from '../../helpers/at';

const state = () => useDashboardStore.getState();

function setup() {
  return createDispatcher({ context: {} as CommandContext, commands: DASHBOARD_COMMANDS });
}

describe('Отмена удаления из дашборда', () => {
  beforeEach(async () => {
    await waitForDashboard();
    state().resetDashboard();
  });

  it('возвращает настройки виджета и все позиции в исходное пространство', async () => {
    const bus = setup();
    state().createSpace('Работа');
    state().addWidget('notes', 4, 2, { itemId: 'note-id' });
    const space = activeSpaceOf(state());
    const widget = at(space.instances, 0);
    state().createSpace('Учёба');
    const currentId = state().activeSpaceId;
    state().setGap(24);

    await bus.dispatch('widget.delete', { id: widget.instanceId, spaceId: space.id });
    expect(state().spaces.find(({ id }) => id === space.id)?.instances).toEqual([]);
    await expect(bus.undo()).resolves.toBe(true);
    expect(state().spaces.find(({ id }) => id === space.id)).toEqual(space);
    expect(activeSpaceOf(state())).toMatchObject({ id: currentId, gap: 24 });
  });

  it('при занятой позиции сдвигает возвращаемый виджет, сохраняя новые настройки сетки', async () => {
    const bus = setup();
    state().createSpace('Работа');
    state().setBaseColumns(24);
    state().addWidget('todo', 24, 3, { boardId: 'board-id' });
    const space = activeSpaceOf(state());
    const widget = at(space.instances, 0);
    await bus.dispatch('widget.delete', { id: widget.instanceId, spaceId: space.id });

    state().setBaseColumns(12);
    state().addWidget('notes', 12, 2);
    const existing = at(activeSpaceOf(state()).layouts.xl, 0);
    await expect(bus.undo()).resolves.toBe(true);

    const current = activeSpaceOf(state());
    const restored = current.layouts.xl.find(({ i }) => i === widget.instanceId);
    expect(current.baseColumns).toBe(12);
    expect(current.layouts.xl).toContainEqual(existing);
    expect(restored).toMatchObject({ x: 0, y: 2, w: 12, h: 3 });
  });

  it('возвращает удалённое пространство вместе с раскладкой и сохраняет текущий выбор', async () => {
    const bus = setup();
    state().createSpace('Работа');
    state().setBaseColumns(16);
    state().addWidget('notes');
    const work = activeSpaceOf(state());
    await bus.dispatch('space.delete', { id: work.id });
    expect(state().spaces.find(({ id }) => id === work.id)).toBeUndefined();

    state().createSpace('Учёба');
    const study = activeSpaceOf(state());
    await expect(bus.undo()).resolves.toBe(true);
    expect(state().spaces).toContainEqual(work);
    expect(activeSpaceOf(state())).toEqual(study);
  });

  it('не записывает в историю удаление последнего пространства и отсутствующей ссылки', async () => {
    const bus = setup();
    const last = state().activeSpaceId;
    await expect(bus.dispatch('space.delete', { id: last })).resolves.toMatchObject({
      result: false,
    });
    await expect(bus.dispatch('speedDial.delete', { id: 'missing' })).resolves.toMatchObject({
      result: false,
    });
    await expect(bus.dispatch('widget.delete', { id: 'missing' })).rejects.toBeInstanceOf(
      TypeError,
    );
    expect(bus.canUndo()).toBe(false);
  });

  it('возвращает ссылку на прежнее место и сохраняет изменение соседней ссылки', async () => {
    const bus = setup();
    state().addSpeedDialLink({ title: 'Первая', url: 'https://example.com/first' });
    state().addSpeedDialLink({ title: 'Вторая', url: 'https://example.com/second' });
    const [first, second] = state().speedDialLinks.slice(-2);
    if (!first || !second) throw new Error('Не созданы ссылки для проверки');
    await bus.dispatch('speedDial.delete', { id: first.id });
    state().updateSpeedDialLink(second.id, { title: 'Изменённая' });
    await expect(bus.undo()).resolves.toBe(true);
    expect(state().speedDialLinks.slice(-2)).toEqual([first, { ...second, title: 'Изменённая' }]);
  });
});
