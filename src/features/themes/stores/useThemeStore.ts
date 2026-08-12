import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { StorageAdapter } from '@/services/storage/StorageAdapter';

export interface ThemeColors {
  bg: string;
  surface: string;
  primary: string;
  secondary: string;
  text: string;
  textMuted: string;
  border: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  colors: ThemeColors;
}

export const PRESET_THEMES: ThemePreset[] = [
  {
    id: 'default-dark',
    name: 'Default Dark',
    colors: {
      bg: '#12232E',
      surface: '#203647',
      primary: '#007CC7',
      secondary: '#4DA8DA',
      text: '#EEFBFB',
      textMuted: '#9BBECF',
      border: 'rgba(155, 190, 207, 0.2)',
    },
  },
  {
    id: 'default-light',
    name: 'Default Light',
    colors: {
      bg: '#F5FAFD',
      surface: '#FFFFFF',
      primary: '#007CC7',
      secondary: '#4DA8DA',
      text: '#1A3A4A',
      textMuted: '#628294',
      border: '#9BBECF',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight Purple',
    colors: {
      bg: '#0F0C20',
      surface: '#1B1735',
      primary: '#8B5CF6',
      secondary: '#C084FC',
      text: '#F3E8FF',
      textMuted: '#A78BFA',
      border: 'rgba(139, 92, 246, 0.25)',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean Teal',
    colors: {
      bg: '#062026',
      surface: '#0B333C',
      primary: '#14B8A6',
      secondary: '#2DD4BF',
      text: '#F0FDFA',
      textMuted: '#5EEAD4',
      border: 'rgba(20, 184, 166, 0.25)',
    },
  },
  {
    id: 'minimal',
    name: 'Minimal Monochrome',
    colors: {
      bg: '#09090B',
      surface: '#18181B',
      primary: '#E4E4E7',
      secondary: '#A1A1AA',
      text: '#FAFAFA',
      textMuted: '#71717A',
      border: 'rgba(255, 255, 255, 0.15)',
    },
  },
  {
    id: 'aurora',
    name: 'Aurora Emerald',
    colors: {
      bg: '#022C22',
      surface: '#064E3B',
      primary: '#10B981',
      secondary: '#34D399',
      text: '#ECFDF5',
      textMuted: '#6EE7B7',
      border: 'rgba(16, 185, 129, 0.25)',
    },
  },
];

export interface BackgroundConfig {
  type: 'color' | 'gradient' | 'image' | 'unsplash';
  value: string;
}

interface ThemeState {
  activeThemeId: string;
  colors: ThemeColors;
  background: BackgroundConfig;
  customCss: string;

  setThemePreset: (presetId: string) => Promise<void>;
  setCustomColor: (key: keyof ThemeColors, value: string) => Promise<void>;
  setBackground: (bg: BackgroundConfig) => Promise<void>;
  setCustomCss: (css: string) => Promise<void>;
  initializeTheme: () => Promise<void>;
  applyThemeToDom: () => void;
}

export const useThemeStore = create<ThemeState>()(
  immer((set, get) => ({
    activeThemeId: 'default-dark',
    colors: PRESET_THEMES[0].colors,
    background: { type: 'color', value: '#12232E' },
    customCss: '',

    initializeTheme: async () => {
      const savedThemeId = await StorageAdapter.get<string>('theme_active_id', 'default-dark');
      const savedColors = await StorageAdapter.get<ThemeColors>('theme_colors', PRESET_THEMES[0].colors);
      const savedBg = await StorageAdapter.get<BackgroundConfig>('theme_bg', { type: 'color', value: '#12232E' });
      const savedCss = await StorageAdapter.get<string>('theme_custom_css', '');

      set((state) => {
        state.activeThemeId = savedThemeId;
        state.colors = savedColors;
        state.background = savedBg;
        state.customCss = savedCss;
      });

      get().applyThemeToDom();
    },

    setThemePreset: async (presetId) => {
      const preset = PRESET_THEMES.find((p) => p.id === presetId) || PRESET_THEMES[0];
      set((state) => {
        state.activeThemeId = preset.id;
        state.colors = preset.colors;
        state.background = { type: 'color', value: preset.colors.bg };
      });

      await StorageAdapter.set('theme_active_id', preset.id);
      await StorageAdapter.set('theme_colors', preset.colors);
      await StorageAdapter.set('theme_bg', { type: 'color', value: preset.colors.bg });

      get().applyThemeToDom();
    },

    setCustomColor: async (key, value) => {
      set((state) => {
        state.colors[key] = value;
        state.activeThemeId = 'custom';
      });

      await StorageAdapter.set('theme_active_id', 'custom');
      await StorageAdapter.set('theme_colors', get().colors);

      get().applyThemeToDom();
    },

    setBackground: async (bg) => {
      set((state) => {
        state.background = bg;
      });

      await StorageAdapter.set('theme_bg', bg);
      get().applyThemeToDom();
    },

    setCustomCss: async (css) => {
      set((state) => {
        state.customCss = css;
      });

      await StorageAdapter.set('theme_custom_css', css);
      get().applyThemeToDom();
    },

    // Метод динамического внедрения CSS переменных в документ
    applyThemeToDom: () => {
      const { colors, background, customCss } = get();
      const root = document.documentElement;

      root.style.setProperty('--color-bg', colors.bg);
      root.style.setProperty('--color-surface', colors.surface);
      root.style.setProperty('--color-primary', colors.primary);
      root.style.setProperty('--color-secondary', colors.secondary);
      root.style.setProperty('--color-text', colors.text);
      root.style.setProperty('--color-text-muted', colors.textMuted);
      root.style.setProperty('--color-border', colors.border);

      if (background.type === 'image' || background.type === 'unsplash') {
        document.body.style.backgroundImage = `url('${background.value}')`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
      } else if (background.type === 'gradient') {
        document.body.style.backgroundImage = background.value;
      } else {
        document.body.style.backgroundImage = 'none';
        document.body.style.backgroundColor = colors.bg;
      }

      // Кастомный CSS элемент
      let styleTag = document.getElementById('dashflow-custom-css');
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'dashflow-custom-css';
        document.head.appendChild(styleTag);
      }
      styleTag.textContent = customCss;
    },
  }))
);
