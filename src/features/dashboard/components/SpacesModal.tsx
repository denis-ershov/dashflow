import { useCallback, useState, type FormEvent } from 'react';
import { Check, LayoutGrid, Plus, Trash2 } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useTranslation } from '@/core/i18n';
import { SPACE_PRESETS, SPACE_TITLE_LIMIT, type SpacePreset } from '@/core/storage';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { deleteDashboardEntity } from '@/features/commands/deleteDashboardEntity';
import { Modal } from '@/ui/overlays';
import { Button, Select } from '@/ui/primitives';

function SpaceList() {
  const { t } = useTranslation();
  const { spaces, activeSpaceId, switchSpace, setActiveModal } = useDashboardStore(
    useShallow(({ spaces, activeSpaceId, switchSpace, setActiveModal }) => ({
      spaces,
      activeSpaceId,
      switchSpace,
      setActiveModal,
    })),
  );
  const [confirmId, setConfirmId] = useState<string | null>(null);
  return (
    <ul className="space-y-2">
      {spaces.map((space) => {
        const title = space.title || t('spaces.home');
        const active = space.id === activeSpaceId;
        return (
          <li key={space.id} className="rounded-lg border border-line bg-canvas">
            <div className="flex items-start gap-1 p-1">
              <button
                type="button"
                aria-current={active ? 'true' : undefined}
                className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-start text-sm hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-primary"
                onClick={() => {
                  switchSpace(space.id);
                  setActiveModal(null);
                }}
              >
                {space.icon ? (
                  <span aria-hidden="true" className="shrink-0">
                    {space.icon}
                  </span>
                ) : (
                  <LayoutGrid aria-hidden="true" className="size-4 shrink-0 text-fg-muted" />
                )}
                <span className="flex-1 wrap-anywhere">{title}</span>
                {active && <Check aria-hidden="true" className="size-4 shrink-0 text-primary" />}
              </button>
              {spaces.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  aria-label={t('spaces.remove', { name: title })}
                  aria-expanded={confirmId === space.id}
                  onClick={() => setConfirmId(confirmId === space.id ? null : space.id)}
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </Button>
              )}
            </div>
            {confirmId === space.id && (
              <div className="space-y-2 px-3 pb-3">
                <p role="status" className="text-sm text-fg-muted">
                  {t('spaces.confirm')}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button className="min-h-11" variant="outline" onClick={() => setConfirmId(null)}>
                    {t('common.cancel')}
                  </Button>
                  <Button
                    className="min-h-11"
                    variant="danger"
                    onClick={() => {
                      deleteDashboardEntity('space.delete', space.id);
                      setConfirmId(null);
                    }}
                  >
                    {t('common.delete')}
                  </Button>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function CreateSpaceForm() {
  const { t } = useTranslation();
  const createSpace = useDashboardStore((state) => state.createSpace);
  const [title, setTitle] = useState('');
  const [preset, setPreset] = useState<SpacePreset>('empty');
  const defaultTitle = preset === 'empty' ? '' : t(`spaces.presets.${preset}.title`);
  const spaceTitle = title.trim() || defaultTitle;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (createSpace(spaceTitle, preset)) {
      setTitle('');
      setPreset('empty');
    }
  };
  return (
    <form onSubmit={submit} className="mt-5 flex flex-col gap-2 border-t border-line pt-4">
      <Select
        label={t('spaces.preset')}
        value={preset}
        options={SPACE_PRESETS.map((value) => ({ value, label: t(`spaces.presets.${value}.title`) }))}
        aria-describedby={preset === 'empty' ? undefined : 'space-preset-description'}
        onChange={(event) => {
          const selected = SPACE_PRESETS.find((value) => value === event.target.value);
          if (selected) setPreset(selected);
        }}
      />
      {preset !== 'empty' && (
        <p id="space-preset-description" className="text-sm text-fg-muted">
          {t(`spaces.presets.${preset}.description`)}
        </p>
      )}
      <label htmlFor="new-space-title" className="text-sm font-medium">
        {t('spaces.name')}
      </label>
      <input
        id="new-space-title"
        value={title}
        placeholder={defaultTitle || undefined}
        maxLength={SPACE_TITLE_LIMIT}
        required={preset === 'empty'}
        onChange={(event) => setTitle(event.target.value)}
        className="min-h-11 min-w-0 rounded-md border border-line bg-canvas px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary"
      />
      <Button
        type="submit"
        disabled={!spaceTitle}
        className="min-h-11 self-start"
        icon={<Plus size={16} />}
      >
        {t('spaces.create')}
      </Button>
    </form>
  );
}

export function SpacesModal() {
  const { t } = useTranslation();
  const open = useDashboardStore((state) => state.activeModal === 'spaces');
  const close = useCallback(() => useDashboardStore.getState().setActiveModal(null), []);
  return (
    <Modal title={t('spaces.title')} isOpen={open} onClose={close} maxWidth="sm">
      <SpaceList />
      <CreateSpaceForm />
    </Modal>
  );
}
