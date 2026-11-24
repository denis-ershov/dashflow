import React, { useState, useRef, useCallback, useMemo, useId } from 'react';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useTranslation } from '@/core/i18n';
import { Search, X } from 'lucide-react';
import { cn } from '@/ui/lib/cn';
import { Modal, useFocusTrap } from '@/ui/overlays';
import { isSafeHttpUrl } from '@/core/network/url';
import { normalizeSearch, searchItemIndex } from '../workspaceSearch';
import { useWorkspaceIndex } from '../hooks/useWorkspaceIndex';
import { useSearchDestination } from '../hooks/useSearchDestination';
import {
  usePaletteResults,
  type PaletteResult,
  type PaletteActions,
} from '../hooks/usePaletteResults';

export function CommandPalette() {
  const open = useDashboardStore((state) => state.isCommandPaletteOpen);
  const { preview, closePreview, revealItem, revealWidget } = useSearchDestination();

  return (
    <>
      {open && <PaletteDialog revealItem={revealItem} revealWidget={revealWidget} />}
      {preview && (
        <Modal isOpen onClose={closePreview} title={preview.title}>
          {preview.body && (
            <p className="whitespace-pre-wrap wrap-anywhere text-sm">{preview.body}</p>
          )}
          {preview.url && isSafeHttpUrl(preview.url) && (
            <a
              className="inline-flex min-h-11 items-center wrap-anywhere text-primary underline"
              href={preview.url}
              target="_blank"
              rel="noreferrer"
            >
              {preview.url}
            </a>
          )}
          {preview.tags.length > 0 && (
            <p className="mt-2 wrap-anywhere text-sm text-fg-muted">{preview.tags.join(', ')}</p>
          )}
        </Modal>
      )}
    </>
  );
}

function PaletteDialog({ revealItem, revealWidget }: PaletteActions) {
  const { t } = useTranslation();
  const setCommandPaletteOpen = useDashboardStore((state) => state.setCommandPaletteOpen);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const close = useCallback(() => setCommandPaletteOpen(false), [setCommandPaletteOpen]);
  useFocusTrap(true, dialogRef, close);

  const normalized = normalizeSearch(query);
  const { index, failed } = useWorkspaceIndex(attempt);
  const found = useMemo(
    () => (index ? searchItemIndex(index, normalized) : []),
    [index, normalized],
  );

  const groups = usePaletteResults({
    query,
    found,
    itemsReady: Boolean(index) && !failed,
    revealItem,
    revealWidget,
  });
  const positions = new Map<string, number>();
  const flat = groups.flatMap(({ results }) => results);
  flat.forEach((result, position) => positions.set(result.id, position));
  const selection = Math.min(selectedIndex, flat.length - 1);
  const optionId = (position: number) => `${listId}-${position}`;

  const run = (result: PaletteResult) => {
    close();
    result.action();
  };

  const handleInputKeyDown = (event: React.KeyboardEvent) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Enter' && flat[selection]) {
      event.preventDefault();
      run(flat[selection]);
    } else if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && flat.length > 0) {
      event.preventDefault();
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      const next = (selection + delta + flat.length) % flat.length;
      setSelectedIndex(next);
      document.getElementById(optionId(next))?.scrollIntoView({ block: 'nearest' });
    }
  };

  return (
    <div className="fixed inset-0 z-(--z-modal,50) flex items-start justify-center p-3 pt-[min(12dvh,5rem)] sm:p-4 sm:pt-20">
      <button
        type="button"
        tabIndex={-1}
        aria-label={t('common.close')}
        className="fixed inset-0 bg-canvas/80 backdrop-blur-md cursor-default"
        onClick={close}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('commandPalette.label')}
        className="relative flex max-h-[80dvh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-line bg-surface text-fg shadow-3"
      >
        <div className="flex items-center gap-3 border-b border-line px-3 py-1">
          <Search aria-hidden="true" className="size-5 shrink-0 text-fg-muted" />
          <input
            type="text"
            role="combobox"
            aria-label={t('commandPalette.placeholder')}
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={selection >= 0 ? optionId(selection) : undefined}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder={t('commandPalette.placeholder')}
            className="min-h-11 min-w-0 flex-1 rounded-md bg-transparent px-1 text-sm placeholder:text-fg-muted focus-visible:outline-2 focus-visible:outline-primary"
          />
          <button
            type="button"
            aria-label={t('common.close')}
            aria-keyshortcuts="Escape"
            onClick={close}
            className="grid size-11 shrink-0 place-items-center rounded-md text-fg-muted hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-primary"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-2">
          <div id={listId} role="listbox" aria-label={t('commandPalette.results')}>
            {groups
              .filter(({ results }) => results.length > 0)
              .map(({ title, results }) => (
                <div key={title} role="group" aria-label={title} className="mb-2 last:mb-0">
                  <div aria-hidden="true" className="px-3 py-1 font-mono text-2xs font-semibold uppercase tracking-wider text-fg-muted">
                    {title}
                  </div>
                  {results.map((result) => {
                    const position = positions.get(result.id) ?? 0;
                    return (
                      <button
                        key={result.id}
                        id={optionId(position)}
                        type="button"
                        role="option"
                        tabIndex={-1}
                        aria-selected={selection === position}
                        onClick={() => run(result)}
                        onMouseMove={() => setSelectedIndex(position)}
                        className={cn(
                          'flex min-h-11 w-full items-center gap-2 rounded-sm px-3 py-2 text-start text-sm transition-colors duration-fast',
                          selection === position
                            ? 'border-s-2 border-primary bg-surface-active text-fg font-medium ring-1 ring-inset ring-primary'
                            : 'border-s-2 border-transparent hover:bg-surface-hover',
                        )}
                      >
                        <span aria-hidden="true" className="shrink-0">
                          {result.icon}
                        </span>
                        <span className="min-w-0 flex-1 wrap-anywhere">{result.title}</span>
                        {result.category && (
                          <span className="max-w-1/3 wrap-anywhere text-end text-xs">
                            {result.category}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
          </div>
          {normalized && (failed || !index) && (
            <div role="status" className="px-3 py-2 text-sm text-fg-muted">
              {failed ? t('commandPalette.loadError') : t('common.loading')}
              {failed && (
                <button
                  type="button"
                  className="ms-2 min-h-11 underline"
                  onClick={() => setAttempt(attempt + 1)}
                >
                  {t('commandPalette.retry')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
