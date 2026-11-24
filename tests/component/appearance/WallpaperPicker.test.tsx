import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WallpaperPicker } from '@/features/appearance/WallpaperPicker';
import { useThemeStore } from '@/core/theme/themeStore';
import { activeSpaceOf } from '@/core/storage';
import { useDashboardStore } from '@/stores/useDashboardStore';

describe('WallpaperPicker', () => {
  beforeEach(() => {
    useThemeStore.getState().resetTheme();
    useDashboardStore.getState().setSpaceWallpaper(undefined);
  });

  it('рендерит пресеты обоев и поле ввода пользовательского URL', () => {
    render(<WallpaperPicker />);

    expect(screen.getByPlaceholderText(/https:\/\/.../i)).toBeInTheDocument();
    expect(screen.getByText('Затемнение обоев')).toBeInTheDocument();
  });

  it('устанавливает обои для активного пространства при клике на пресет', async () => {
    const user = userEvent.setup();
    render(<WallpaperPicker />);

    const presetBtn = screen.getByRole('button', { name: /Горное озеро/i });
    await user.click(presetBtn);

    expect(activeSpaceOf(useDashboardStore.getState()).wallpaper?.url).toContain('unsplash.com');
  });

  it('изменяет затемнение активного пространства через ползунок', () => {
    render(<WallpaperPicker />);

    const slider = screen.getByRole('slider', { name: /Затемнение обоев/i });
    fireEvent.change(slider, { target: { value: '60' } });

    expect(activeSpaceOf(useDashboardStore.getState()).wallpaper?.scrim).toBeCloseTo(0.6, 2);
  });
});
