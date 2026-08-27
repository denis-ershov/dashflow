import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PresetGrid, PRESET_META } from '@/features/appearance/PresetGrid';
import { useThemeStore } from '@/core/theme/themeStore';
import { PRESETS } from '@/core/theme/presets';

describe('PresetGrid', () => {
  beforeEach(() => {
    useThemeStore.getState().resetTheme();
  });

  it('рендерит все встроенные пресеты тем', () => {
    render(<PresetGrid />);

    for (const preset of PRESETS) {
      const meta = PRESET_META[preset.id];
      expect(screen.getByText(meta.name)).toBeInTheDocument();
    }
  });

  it('позволяет выбрать пресет и обновляет активную тему в store', async () => {
    const user = userEvent.setup();
    render(<PresetGrid />);

    const oceanBtn = screen.getByRole('button', { name: /Ocean Teal/i });
    await user.click(oceanBtn);

    expect(useThemeStore.getState().activePresetId).toBe('ocean');
  });
});
