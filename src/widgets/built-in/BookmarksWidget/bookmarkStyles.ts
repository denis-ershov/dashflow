import { cn } from '@/ui/lib/cn';
import type {
  BookmarkTileShape,
  BookmarkTileSize,
  BookmarkCardStyle,
  BookmarkBorderRadius,
  BookmarkHoverEffect,
  BookmarkIconSize,
} from './types';

export interface BookmarkStyleOptions {
  tileShape?: BookmarkTileShape;
  tileSize?: BookmarkTileSize;
  cardStyle?: BookmarkCardStyle;
  borderRadius?: BookmarkBorderRadius;
  hoverEffect?: BookmarkHoverEffect;
  iconSize?: BookmarkIconSize;
  columns?: 1 | 2 | 3 | 4 | 5 | 6 | 'auto';
}

/**
 * Детерминированный красивый градиент для аватарки/фавикона на основе строки
 */
export function getBookmarkFallbackGradient(str: string): string {
  const gradients = [
    'from-blue-600 to-indigo-700 text-white',
    'from-emerald-500 to-teal-700 text-white',
    'from-violet-600 to-purple-800 text-white',
    'from-amber-500 to-rose-600 text-white',
    'from-rose-500 to-pink-700 text-white',
    'from-cyan-500 to-blue-700 text-white',
    'from-fuchsia-600 to-pink-700 text-white',
    'from-teal-500 to-emerald-700 text-white',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}

export function getBookmarkTileClasses(options: BookmarkStyleOptions = {}): {
  containerClass: string;
  iconContainerClass: string;
  iconImgClass: string;
  titleClass: string;
  urlClass: string;
} {
  const shape = options.tileShape || 'rectangle-horizontal';
  const size = options.tileSize || 'medium';
  const style = options.cardStyle || 'glass';
  const radius = options.borderRadius || 'md';
  const hover = options.hoverEffect || 'scale';

  // 1. Стили подложки (Card Style)
  const cardStyleClasses = {
    glass:
      'bg-surface/75 hover:bg-surface border-line hover:border-primary/50 backdrop-blur-md shadow-1 hover:shadow-2',
    solid: 'bg-surface hover:bg-surface-hover border-line hover:border-primary shadow-1',
    outline: 'bg-transparent hover:bg-surface/40 border-line hover:border-primary',
    transparent: 'bg-transparent hover:bg-surface/30 border-transparent hover:border-line/40',
    glow: 'bg-surface/80 border-primary/40 shadow-[0_0_12px_rgba(59,130,246,0.15)] hover:shadow-[0_0_20px_rgba(59,130,246,0.35)] hover:border-primary',
  }[style];

  // 2. Радиус скругления (Border Radius)
  const radiusClasses = {
    none: 'rounded-none',
    sm: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
    full: 'rounded-full',
  }[radius];

  // 3. Эффект наведения (Hover Effect)
  const hoverClasses = {
    scale: 'hover:scale-[1.04] active:scale-[0.97]',
    lift: 'hover:-translate-y-1 hover:shadow-3 active:translate-y-0',
    glow: 'hover:shadow-[0_0_18px_rgba(59,130,246,0.4)]',
    border: 'hover:border-primary hover:ring-2 hover:ring-primary/20',
    none: '',
  }[hover];

  // 4. Форма и компоновка (Tile Shape & Size)
  let shapeClass = '';
  let iconContainerClass = '';
  let iconImgClass = '';
  let titleClass = '';
  let urlClass = '';

  switch (shape) {
    case 'square': {
      // Speed-dial squircle: иконка сверху, аккуратный заголовок снизу
      const squareSizeMap = {
        xs: {
          container: 'w-16 p-1 flex flex-col items-center text-center',
          icon: 'w-10 h-10 rounded-xl mb-1 shadow-sm',
          img: 'w-5 h-5',
          title: 'text-[10px] font-medium leading-tight max-w-[64px]',
          url: 'hidden',
        },
        compact: {
          container: 'w-[76px] p-1.5 flex flex-col items-center text-center',
          icon: 'w-12 h-12 rounded-2xl mb-1.5 shadow-1',
          img: 'w-6 h-6',
          title: 'text-[11px] font-medium leading-tight max-w-[72px]',
          url: 'hidden',
        },
        medium: {
          container: 'w-24 p-2 flex flex-col items-center text-center',
          icon: 'w-14 h-14 rounded-2xl mb-1.5 shadow-1',
          img: 'w-7 h-7',
          title: 'text-xs font-medium leading-snug max-w-[88px]',
          url: 'hidden',
        },
        large: {
          container: 'w-28 p-2.5 flex flex-col items-center text-center',
          icon: 'w-16 h-16 rounded-3xl mb-2 shadow-2',
          img: 'w-8 h-8',
          title: 'text-xs font-semibold leading-snug max-w-[104px]',
          url: 'hidden',
        },
        xl: {
          container: 'w-36 p-3 flex flex-col items-center text-center',
          icon: 'w-20 h-20 rounded-3xl mb-2 shadow-2',
          img: 'w-10 h-10',
          title: 'text-sm font-semibold leading-normal max-w-[128px]',
          url: 'hidden',
        },
      }[size] ?? {
        container: 'w-24 p-2 flex flex-col items-center text-center',
        icon: 'w-14 h-14 rounded-2xl mb-1.5 shadow-1',
        img: 'w-7 h-7',
        title: 'text-xs font-medium leading-snug max-w-[88px]',
        url: 'hidden',
      };
      shapeClass = squareSizeMap.container;
      iconContainerClass = squareSizeMap.icon;
      iconImgClass = squareSizeMap.img;
      titleClass = squareSizeMap.title;
      urlClass = squareSizeMap.url;
      break;
    }

    case 'circle': {
      // Speed-dial round disc: круглый бадж с иконкой, заголовок снизу
      const circleSizeMap = {
        xs: {
          container: 'w-14 p-1 flex flex-col items-center text-center',
          icon: 'w-10 h-10 rounded-full mb-1 shadow-sm',
          img: 'w-5 h-5',
          title: 'text-[9px] font-medium leading-tight max-w-[56px]',
          url: 'hidden',
        },
        compact: {
          container: 'w-[72px] p-1.5 flex flex-col items-center text-center',
          icon: 'w-12 h-12 rounded-full mb-1.5 shadow-1',
          img: 'w-6 h-6',
          title: 'text-[10px] font-medium leading-tight max-w-[68px]',
          url: 'hidden',
        },
        medium: {
          container: 'w-20 p-1.5 flex flex-col items-center text-center',
          icon: 'w-14 h-14 rounded-full mb-1.5 shadow-1',
          img: 'w-7 h-7',
          title: 'text-[11px] font-medium leading-snug max-w-[76px]',
          url: 'hidden',
        },
        large: {
          container: 'w-24 p-2 flex flex-col items-center text-center',
          icon: 'w-16 h-16 rounded-full mb-2 shadow-2',
          img: 'w-8 h-8',
          title: 'text-xs font-medium leading-snug max-w-[92px]',
          url: 'hidden',
        },
        xl: {
          container: 'w-32 p-2.5 flex flex-col items-center text-center',
          icon: 'w-20 h-20 rounded-full mb-2 shadow-2',
          img: 'w-10 h-10',
          title: 'text-sm font-semibold leading-normal max-w-[116px]',
          url: 'hidden',
        },
      }[size] ?? {
        container: 'w-20 p-1.5 flex flex-col items-center text-center',
        icon: 'w-14 h-14 rounded-full mb-1.5 shadow-1',
        img: 'w-7 h-7',
        title: 'text-[11px] font-medium leading-snug max-w-[76px]',
        url: 'hidden',
      };
      shapeClass = circleSizeMap.container;
      iconContainerClass = circleSizeMap.icon;
      iconImgClass = circleSizeMap.img;
      titleClass = circleSizeMap.title;
      urlClass = circleSizeMap.url;
      break;
    }

    case 'rectangle-vertical': {
      // Постерный вид 3:4 с центрированной иконкой и подписью
      const vertSizeMap = {
        xs: {
          container: 'w-[64px] h-[84px] p-2 flex flex-col items-center justify-between text-center',
          icon: 'w-7 h-7 my-auto rounded-lg',
          img: 'w-4 h-4',
          title: 'text-[9px] font-semibold truncate max-w-full',
          url: 'hidden',
        },
        compact: {
          container: 'w-[80px] h-[104px] p-2.5 flex flex-col items-center justify-between text-center',
          icon: 'w-9 h-9 my-auto rounded-xl',
          img: 'w-5 h-5',
          title: 'text-[10px] font-semibold truncate max-w-full',
          url: 'text-[8px] text-fg-muted truncate max-w-full',
        },
        medium: {
          container: 'w-24 h-32 p-3 flex flex-col items-center justify-between text-center',
          icon: 'w-11 h-11 my-auto rounded-xl',
          img: 'w-6 h-6',
          title: 'text-xs font-semibold truncate max-w-full',
          url: 'text-[10px] text-fg-muted truncate max-w-full',
        },
        large: {
          container: 'w-[120px] h-40 p-3.5 flex flex-col items-center justify-between text-center',
          icon: 'w-14 h-14 my-auto rounded-2xl',
          img: 'w-8 h-8',
          title: 'text-sm font-semibold truncate max-w-full',
          url: 'text-[11px] text-fg-muted truncate max-w-full',
        },
        xl: {
          container: 'w-[148px] h-[192px] p-4 flex flex-col items-center justify-between text-center',
          icon: 'w-18 h-18 my-auto rounded-2xl',
          img: 'w-10 h-10',
          title: 'text-base font-bold truncate max-w-full',
          url: 'text-xs text-fg-muted truncate max-w-full',
        },
      }[size] ?? {
        container: 'w-24 h-32 p-3 flex flex-col items-center justify-between text-center',
        icon: 'w-11 h-11 my-auto rounded-xl',
        img: 'w-6 h-6',
        title: 'text-xs font-semibold truncate max-w-full',
        url: 'text-[10px] text-fg-muted truncate max-w-full',
      };
      shapeClass = vertSizeMap.container;
      iconContainerClass = vertSizeMap.icon;
      iconImgClass = vertSizeMap.img;
      titleClass = vertSizeMap.title;
      urlClass = vertSizeMap.url;
      break;
    }

    case 'pill':
      if (size === 'xs') {
        shapeClass = 'flex items-center gap-1.5 px-2 py-1 rounded-full min-h-[28px]';
        iconContainerClass = 'w-4 h-4 rounded-full';
        iconImgClass = 'w-3 h-3';
        titleClass = 'text-[10px] font-medium truncate';
        urlClass = 'hidden';
      } else if (size === 'compact') {
        shapeClass = 'flex items-center gap-2 px-2.5 py-1.5 rounded-full min-h-[34px]';
        iconContainerClass = 'w-5 h-5 rounded-full';
        iconImgClass = 'w-3.5 h-3.5';
        titleClass = 'text-[11px] font-medium truncate';
        urlClass = 'hidden';
      } else if (size === 'large') {
        shapeClass = 'flex items-center gap-2.5 px-4 py-2 rounded-full min-h-[44px]';
        iconContainerClass = 'w-7 h-7 rounded-full';
        iconImgClass = 'w-4 h-4';
        titleClass = 'text-sm font-semibold truncate';
        urlClass = 'text-[10px]';
      } else if (size === 'xl') {
        shapeClass = 'flex items-center gap-3 px-5 py-2.5 rounded-full min-h-[52px]';
        iconContainerClass = 'w-9 h-9 rounded-full';
        iconImgClass = 'w-5 h-5';
        titleClass = 'text-base font-bold truncate';
        urlClass = 'text-xs';
      } else {
        // medium
        shapeClass = 'flex items-center gap-2 px-3 py-1.5 rounded-full min-h-[38px]';
        iconContainerClass = 'w-6 h-6 rounded-full';
        iconImgClass = 'w-3.5 h-3.5';
        titleClass = 'text-xs font-medium truncate';
        urlClass = 'text-[10px]';
      }
      break;

    case 'rectangle-horizontal':
    default:
      if (size === 'xs') {
        shapeClass = 'flex items-center gap-2 p-2 min-h-[40px]';
        iconContainerClass = 'w-6 h-6 rounded-lg';
        iconImgClass = 'w-3.5 h-3.5';
        titleClass = 'text-[11px] font-semibold';
        urlClass = 'text-[9px] text-fg-muted';
      } else if (size === 'compact') {
        shapeClass = 'flex items-center gap-2.5 p-2.5 min-h-[48px]';
        iconContainerClass = 'w-8 h-8 rounded-lg';
        iconImgClass = 'w-4 h-4';
        titleClass = 'text-xs font-semibold';
        urlClass = 'text-[10px] text-fg-muted';
      } else if (size === 'large') {
        shapeClass = 'flex items-center gap-3.5 p-3.5 min-h-[64px]';
        iconContainerClass = 'w-11 h-11 rounded-xl';
        iconImgClass = 'w-6 h-6';
        titleClass = 'text-sm font-semibold';
        urlClass = 'text-xs text-fg-muted';
      } else if (size === 'xl') {
        shapeClass = 'flex items-center gap-4 p-4 min-h-[76px]';
        iconContainerClass = 'w-14 h-14 rounded-2xl';
        iconImgClass = 'w-8 h-8';
        titleClass = 'text-base font-bold';
        urlClass = 'text-xs text-fg-muted';
      } else {
        // medium
        shapeClass = 'flex items-center gap-3 p-3 min-h-[54px]';
        iconContainerClass = 'w-9 h-9 rounded-xl';
        iconImgClass = 'w-5 h-5';
        titleClass = 'text-xs font-semibold';
        urlClass = 'text-[10px] text-fg-muted';
      }
      break;
  }

  // Для square и circle подложка задается на сам icon badge, а общий контейнер прозрачен для естественного speed dial вида!
  const isSpeedDial = shape === 'square' || shape === 'circle';

  const containerClass = cn(
    'group transition-all duration-200 cursor-pointer select-none',
    shapeClass,
    !isSpeedDial && 'border',
    !isSpeedDial && cardStyleClasses,
    !isSpeedDial && shape !== 'pill' && radiusClasses,
    hoverClasses,
  );

  return {
    containerClass,
    iconContainerClass: cn(
      'flex items-center justify-center shrink-0 border transition-all duration-200 overflow-hidden relative',
      isSpeedDial
        ? cn(cardStyleClasses, 'group-hover:scale-105 group-active:scale-95')
        : 'bg-surface-hover/80 border-line/40 group-hover:scale-105',
      iconContainerClass,
    ),
    iconImgClass: cn('object-contain shrink-0', iconImgClass),
    titleClass: cn(
      'text-fg truncate block group-hover:text-primary transition-colors',
      titleClass,
    ),
    urlClass: cn('truncate block text-fg-muted', urlClass),
  };
}

export function getBookmarkGridClass(
  columns?: 1 | 2 | 3 | 4 | 5 | 6 | 'auto',
  shape?: BookmarkTileShape,
): string {
  // Для Speed Dial (square, circle, rectangle-vertical) используем auto-fill сетку или flex-wrap:
  if (shape === 'square') {
    if (columns && typeof columns === 'number') {
      return `grid grid-cols-${columns} gap-3 justify-items-center`;
    }
    return 'grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-3 sm:gap-4 justify-items-center';
  }

  if (shape === 'circle') {
    if (columns && typeof columns === 'number') {
      return `grid grid-cols-${columns} gap-3 justify-items-center`;
    }
    return 'grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-2.5 sm:gap-3.5 justify-items-center';
  }

  if (shape === 'rectangle-vertical') {
    if (columns && typeof columns === 'number') {
      return `grid grid-cols-${columns} gap-3 justify-items-center`;
    }
    return 'grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-3 justify-items-center';
  }

  if (shape === 'pill') {
    return 'flex flex-wrap gap-2 content-start';
  }

  // Для rectangle-horizontal — адаптивная колоночная сетка
  if (columns === 1) return 'grid grid-cols-1 gap-2';
  if (columns === 2) return 'grid grid-cols-1 sm:grid-cols-2 gap-2.5';
  if (columns === 3) return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5';
  if (columns === 4) return 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5';
  if (columns === 5) return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5';
  if (columns === 6) return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5';

  return 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5';
}

