import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { PaletteResult } from '@/features/dashboard/hooks/usePaletteResults';
import { CommandPalette } from '@/features/dashboard/components/CommandPalette';
import { useDashboardStore } from '@/stores/useDashboardStore';

type PaletteGroups = { title: string; results: PaletteResult[] }[];

const mocks = vi.hoisted(() => ({
  usePaletteResults: vi.fn<() => PaletteGroups>(() => []),
}));

vi.mock('@/features/dashboard/hooks/usePaletteResults', () => ({
  usePaletteResults: mocks.usePaletteResults,
}));
vi.mock('@/features/dashboard/hooks/useWorkspaceIndex', () => ({
  useWorkspaceIndex: () => ({ index: null, failed: false }),
}));
vi.mock('@/features/dashboard/hooks/useSearchDestination', () => ({
  useSearchDestination: () => ({
    preview: null,
    closePreview: vi.fn(),
    revealItem: vi.fn(),
    revealWidget: vi.fn(),
  }),
}));

beforeEach(() => {
  useDashboardStore.setState({ isCommandPaletteOpen: true });
  mocks.usePaletteResults.mockReturnValue([
    {
      title: 'Команды',
      results: [{ id: 'settings', title: 'Настройки', icon: null, action: vi.fn() }],
    },
  ]);
});

afterEach(() => {
  useDashboardStore.setState({ isCommandPaletteOpen: false });
});

describe('CommandPalette', () => {
  it('показывает выбранный пункт с контрастным фоном и видимым акцентом', () => {
    render(<CommandPalette />);

    const selected = screen.getByRole('option', { name: 'Настройки' });
    expect(selected).toHaveAttribute('aria-selected', 'true');
    expect(selected.className).toContain('bg-surface-active');
    expect(selected.className).toContain('text-fg');
    expect(selected.className).toContain('border-primary');
    expect(selected.className).toContain('ring-primary');
  });
});
