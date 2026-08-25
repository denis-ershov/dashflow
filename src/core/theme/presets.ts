/**
 * Девять готовых палитр. Пресет несёт только id и набор токенов: отображаемое
 * имя живёт в словаре локализации под ключом appearance.preset.<id> (правило 43),
 * а не строкой в данных, иначе название нельзя перевести.
 *
 * Каждый пресет задаёт семь обязательных ключей задачи 5 плюс те, где
 * автоматический вывод даёт не тот оттенок или недостаточный контраст;
 * остальные двадцать четыре цвета достраивает resolveTheme.
 *
 * Контраст здесь измерен, а не объявлен. Фоны разделены на два вида:
 *   постоянные — canvas, surface, glassBg: на них текст лежит всё время;
 *   транзитные — surfaceHover, surfaceActive: видны доли секунды при
 *   наведении и нажатии, читаемого текста на них не набирают.
 * Полупрозрачные фоны перед замером сплющиваются на canvas: коэффициент
 * контраста определён только для непрозрачных пар.
 *
 * Пороги (правила 16 и 92): fg — 7:1 на постоянных и 4.5:1 на транзитных;
 * fgMuted и fgDim — 4.5:1 на постоянных и 3:1 на транзитных; primaryFg на
 * заливке primary — 4.5:1. High Contrast держит 7:1 на постоянных и 4.5:1 на
 * любом фоне вообще, включая транзитные (спека §14.6).
 *
 * Худшие измеренные значения по каждому пресету:
 *
 *                   fg·пост fg·тран mut·пост mut·тран dim·пост dim·тран primFg
 *   neutral-dark     17.19   12.88   7.01    5.26    4.56    3.42    5.21
 *   deep-blue        12.69    8.95   6.82    4.81    4.78    3.37    5.49
 *   default-light    13.18   13.72   5.48    5.70    5.14    5.35    5.64
 *   midnight         15.08   10.91   8.24    5.97    5.76    4.17    4.53
 *   ocean            13.82    9.88   9.74    6.97    5.99    4.28    6.79
 *   minimal          17.61   12.62   7.17    5.14    4.83    3.46   15.68
 *   aurora           10.59    7.68   7.32    5.31    5.40    3.92    5.97
 *   glass            12.44   11.56   8.38    7.78    5.09    4.73    7.63
 *   high-contrast    19.80   15.13  15.86   12.13   11.96    9.14   14.88
 *
 * Цифры проверяет tests/unit/theme/presets.test.ts. Правка любого токена
 * пресета обязана пройти этот тест: порог опускать нельзя.
 */

import type { ThemeTokens } from '@/core/theme/tokens';

export type PresetId =
  | 'neutral-dark'
  | 'deep-blue'
  | 'default-light'
  | 'midnight'
  | 'ocean'
  | 'minimal'
  | 'aurora'
  | 'glass'
  | 'high-contrast';

export interface ThemePreset {
  id: PresetId;
  tokens: ThemeTokens;
}

/** Палитра по умолчанию для нового профиля и для откатов при негодной теме. */
export const DEFAULT_PRESET_ID: PresetId = 'neutral-dark';

export const PRESETS: readonly ThemePreset[] = [
  {
    id: 'neutral-dark',
    tokens: {
      canvas: '#0b0f17',
      surface: 'rgb(18 26 38 / 0.7)',
      surfaceHover: 'rgb(28 39 56 / 0.85)',
      surfaceActive: 'rgb(35 49 70 / 0.95)',
      primary: '#3b82f6',
      primaryHover: '#60a5fa',
      secondary: '#06b6d4',
      accent: '#8b5cf6',
      fg: '#f8fafc',
      fgMuted: '#94a3b8',
      fgDim: '#748196',
      line: 'rgb(255 255 255 / 0.08)',
      lineHover: 'rgb(255 255 255 / 0.22)',
    },
  },
  {
    // Палитра прежней темы default-dark. Сохранена ради миграции: старый
    // профиль переезжает сюда, и пользователь не видит смены цвета.
    id: 'deep-blue',
    tokens: {
      canvas: '#12232e',
      surface: 'rgb(32 54 71 / 0.72)',
      primary: '#0069ab',
      primaryHover: '#0072b8',
      secondary: '#4da8da',
      accent: '#00e0c6',
      fg: '#eefbfb',
      fgMuted: '#9bbecf',
      fgDim: '#7d9fb1',
      line: 'rgb(155 190 207 / 0.2)',
    },
  },
  {
    id: 'default-light',
    tokens: {
      canvas: '#f5fafd',
      surface: 'rgb(255 255 255 / 0.82)',
      primary: '#0369a1',
      secondary: '#0e7490',
      accent: '#7c3aed',
      fg: '#12303d',
      fgMuted: '#4b6a7b',
      fgDim: '#526e7d',
      line: 'rgb(26 58 74 / 0.16)',
    },
  },
  {
    id: 'midnight',
    tokens: {
      canvas: '#0f0c20',
      surface: 'rgb(27 23 53 / 0.72)',
      primary: '#8b5cf6',
      secondary: '#c084fc',
      accent: '#f0abfc',
      fg: '#f3e8ff',
      fgMuted: '#b9a4f8',
      fgDim: '#9b86d8',
      line: 'rgb(139 92 246 / 0.25)',
    },
  },
  {
    id: 'ocean',
    tokens: {
      canvas: '#062026',
      surface: 'rgb(11 51 60 / 0.72)',
      primary: '#14b8a6',
      secondary: '#2dd4bf',
      accent: '#38bdf8',
      fg: '#f0fdfa',
      fgMuted: '#5eead4',
      fgDim: '#4bb8a8',
      line: 'rgb(20 184 166 / 0.25)',
    },
  },
  {
    id: 'minimal',
    tokens: {
      canvas: '#09090b',
      surface: 'rgb(24 24 27 / 0.75)',
      primary: '#e4e4e7',
      secondary: '#a1a1aa',
      accent: '#d4d4d8',
      fg: '#fafafa',
      fgMuted: '#a1a1aa',
      fgDim: '#82828c',
      line: 'rgb(255 255 255 / 0.15)',
    },
  },
  {
    id: 'aurora',
    tokens: {
      canvas: '#022c22',
      surface: 'rgb(6 78 59 / 0.72)',
      primary: '#10b981',
      secondary: '#34d399',
      accent: '#a7f3d0',
      fg: '#ecfdf5',
      fgMuted: '#6ee7b7',
      fgDim: '#63c79b',
      line: 'rgb(16 185 129 / 0.25)',
    },
  },
  {
    // Поверхность здесь — почти прозрачное белое стекло, а не тонированный
    // блок: отсюда собственные наведение и нажатие и усиленное размытие.
    id: 'glass',
    tokens: {
      canvas: '#0b0d14',
      surface: 'rgb(255 255 255 / 0.07)',
      surfaceHover: 'rgb(255 255 255 / 0.12)',
      surfaceActive: 'rgb(255 255 255 / 0.18)',
      primary: '#60a5fa',
      secondary: '#a78bfa',
      accent: '#f472b6',
      fg: '#ffffff',
      fgMuted: '#cbd5e1',
      fgDim: '#9aa7b8',
      line: 'rgb(255 255 255 / 0.14)',
      glassOpacity: 0.16,
      glassBlur: '32px',
    },
  },
  {
    // Доступный режим (правило 16). Стекло выключено: размытие 0px и почти
    // непрозрачная поверхность, иначе фон просвечивает и контраст плывёт.
    id: 'high-contrast',
    tokens: {
      canvas: '#000000',
      surface: '#0a0a0a',
      surfaceHover: '#1a1a1a',
      surfaceActive: '#262626',
      primary: '#ffd60a',
      primaryHover: '#ffe45c',
      primaryFg: '#000000',
      secondary: '#00e5ff',
      accent: '#ff7ab6',
      fg: '#ffffff',
      fgMuted: '#e6e6e6',
      fgDim: '#c9c9c9',
      line: 'rgb(255 255 255 / 0.6)',
      lineHover: '#ffffff',
      glassOpacity: 0.9,
      glassBlur: '0px',
    },
  },
];

/** Находит пресет по id. Возвращает null на неизвестном и на ключах прототипа. */
export function findPreset(id: string): ThemePreset | null {
  return PRESETS.find((preset) => preset.id === id) ?? null;
}
