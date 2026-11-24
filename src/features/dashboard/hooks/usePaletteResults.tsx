import type { ReactNode } from 'react';
import {
  Bot,
  FileText,
  Globe,
  Layers,
  LayoutGrid,
  Palette,
  Plus,
  Settings,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useTranslation } from '@/core/i18n';
import { useHubStatus } from '@/features/hub/useHubStatus';
import type { Item } from '@/core/items';
import { activeLayoutModeOf } from '@/core/storage';
import { PRESETS } from '@/core/theme/presets';
import { useThemeStore } from '@/core/theme/themeStore';
import { WidgetRegistry } from '@/core/widget/registry';
import { PRESET_META } from '@/features/appearance';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { matchRank, normalizeSearch } from '../workspaceSearch';
import type { useSearchDestination } from './useSearchDestination';

export type PaletteActions = Pick<
  ReturnType<typeof useSearchDestination>,
  'revealItem' | 'revealWidget'
>;
export type PaletteResult = {
  id: string;
  title: string;
  icon: ReactNode;
  action: () => void;
  category?: string;
};

function usePaletteCommands(): PaletteResult[] {
  const { t } = useTranslation();
  const hub = useHubStatus();
  const { setActiveModal, addWidget, layoutMode, setLayoutMode } = useDashboardStore(
    useShallow((state) => ({
      setActiveModal: state.setActiveModal,
      addWidget: state.addWidget,
      layoutMode: activeLayoutModeOf(state),
      setLayoutMode: state.setLayoutMode,
    })),
  );
  const setPreset = useThemeStore((state) => state.setPreset);
  const baseCommands: PaletteResult[] = [
    {
      id: 'manage-spaces',
      title: t('spaces.title'),
      category: t('commandPalette.categories.navigation'),
      icon: <Layers className="size-4" />,
      action: () => setActiveModal('spaces'),
    },
    {
      id: 'toggle-layout-mode',
      title:
        layoutMode === 'zen' ? t('commandPalette.enableDashboard') : t('commandPalette.enableZen'),
      category: t('commandPalette.categories.mode'),
      icon:
        layoutMode === 'zen' ? (
          <LayoutGrid className="w-4 h-4 text-primary" />
        ) : (
          <Sparkles className="w-4 h-4 text-accent" />
        ),
      action: () => {
        setLayoutMode(layoutMode === 'zen' ? 'modular' : 'zen');
      },
    },
    {
      id: 'open-settings',
      title: t('commandPalette.openSettings'),
      category: t('commandPalette.categories.navigation'),
      icon: <Settings className="w-4 h-4 text-fg-muted" />,
      action: () => {
        setActiveModal('settings');
      },
    },
    {
      id: 'open-themes',
      title: t('commandPalette.openAppearance'),
      category: t('commandPalette.categories.appearance'),
      icon: <Palette className="w-4 h-4 text-primary" />,
      action: () => {
        setActiveModal('appearance');
      },
    },
    {
      id: 'open-marketplace',
      title: t('commandPalette.openCatalog'),
      category: t('commandPalette.categories.plugins'),
      icon: <ShoppingBag className="w-4 h-4 text-secondary" />,
      action: () => {
        setActiveModal('marketplace');
      },
    },
  ];

  // Команды переключения тем
  const themeCommands = PRESETS.map((p) => ({
    id: `theme-${p.id}`,
    // Название темы — как в окне «Темы и обои», а не технический id
    title: t('commandPalette.theme', { name: PRESET_META[p.id]?.name ?? p.id }),
    category: t('commandPalette.categories.themes'),
    icon: <Palette className="w-4 h-4 text-primary" />,
    action: () => {
      setPreset(p.id);
    },
  }));

  // Команды добавления виджетов
  const widgetCommands = WidgetRegistry.getAll().map((w) => {
    const title = w.nameKey ? t(w.nameKey) : w.name || w.id;
    return {
      id: `add-${w.id}`,
      title: t('commandPalette.addWidget', { name: title }),
      category: t('commandPalette.categories.widgets'),
      icon: <Plus className="w-4 h-4 text-primary" />,
      action: () => {
        addWidget(w.id, w.size.defaultW, w.size.defaultH);
      },
    };
  });

  if (hub.state === 'connected') {
    baseCommands.push({
      id: 'assign-agent',
      title: t('agents.assign'),
      category: t('commandPalette.categories.navigation'),
      icon: <Bot className="size-4" />,
      action: () => setActiveModal('assignAgent'),
    });
  }
  return [...baseCommands, ...themeCommands, ...widgetCommands];
}

interface PaletteSearch extends PaletteActions {
  query: string;
  found: readonly Item[];
  itemsReady: boolean;
}

export function usePaletteResults({
  query,
  found,
  itemsReady,
  revealItem,
  revealWidget,
}: PaletteSearch) {
  const { t } = useTranslation();
  const { spaces, activeSpaceId, switchSpace } = useDashboardStore(
    useShallow(({ spaces, activeSpaceId, switchSpace }) => ({
      spaces,
      activeSpaceId,
      switchSpace,
    })),
  );
  const commands = usePaletteCommands();
  const normalized = normalizeSearch(query);
  const ranked = (results: PaletteResult[]) =>
    normalized
      ? results
          .map((result) => ({
            result,
            rank: Math.max(
              matchRank(normalizeSearch(result.title), normalized),
              matchRank(normalizeSearch(result.category ?? ''), normalized),
            ),
          }))
          .filter(({ rank }) => rank > 0)
          .sort((a, b) => b.rank - a.rank)
          .map(({ result }) => result)
      : results;
  const spaceResults: PaletteResult[] = spaces.map(({ id, title }) => ({
    id: `space-${id}`,
    title: title || t('spaces.home'),
    category: id === activeSpaceId ? t('spaces.current') : undefined,
    icon: <Layers size={16} />,
    action: () => switchSpace(id),
  }));
  const widgetResults: PaletteResult[] = normalized
    ? spaces.flatMap((space) =>
        space.instances.map((instance) => {
          const manifest = WidgetRegistry.get(instance.widgetId);
          return {
            id: `widget-${instance.instanceId}`,
            title: manifest?.nameKey ? t(manifest.nameKey) : manifest?.name || instance.widgetId,
            category: space.title || t('spaces.home'),
            icon: <LayoutGrid size={16} />,
            action: () => revealWidget({ spaceId: space.id, instanceId: instance.instanceId }),
          };
        }),
      )
    : [];
  const groups = [
    {
      title: t('commandPalette.groups.items'),
      results: found.map((item): PaletteResult => ({
        id: `item-${item.id}`,
        title: item.title,
        category: t(`commandPalette.kinds.${item.kind}`),
        icon: <FileText size={16} />,
        action: () => revealItem(item),
      })),
    },
    { title: t('spaces.title'), results: ranked(spaceResults).slice(0, 12) },
    { title: t('commandPalette.groups.widgets'), results: ranked(widgetResults).slice(0, 12) },
    { title: t('commandPalette.groups.commands'), results: ranked([...commands]) },
  ];
  if (!groups.some(({ results }) => results.length) && normalized && itemsReady) {
    groups.push({
      title: t('search.web'),
      results: [
        {
          id: 'search-web',
          title: t('commandPalette.searchHint', { query: query.trim() }),
          icon: <Globe size={16} />,
          action: () => {
            window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query.trim())}`;
          },
        },
      ],
    });
  }

  return groups;
}
