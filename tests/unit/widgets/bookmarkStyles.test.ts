import { describe, it, expect } from 'vitest';
import {
  getBookmarkTileClasses,
  getBookmarkGridClass,
  getBookmarkFallbackGradient,
} from '@/widgets/built-in/BookmarksWidget/bookmarkStyles';

describe('bookmarkStyles helper', () => {
  it('должен генерировать корректные классы для квадратных плиток (square)', () => {
    const classes = getBookmarkTileClasses({
      tileShape: 'square',
      tileSize: 'medium',
      cardStyle: 'glass',
      borderRadius: 'md',
      hoverEffect: 'scale',
    });

    // Speed-dial squircle: контейнер центрирован, иконка оформлена в стекле
    expect(classes.containerClass).toContain('w-24');
    expect(classes.containerClass).toContain('flex-col');
    expect(classes.containerClass).toContain('items-center');
    expect(classes.iconContainerClass).toContain('backdrop-blur-md');
    expect(classes.containerClass).toContain('hover:scale-[1.04]');
  });

  it('должен генерировать корректные классы для горизонтальных прямоугольников', () => {
    const classes = getBookmarkTileClasses({
      tileShape: 'rectangle-horizontal',
      tileSize: 'large',
      cardStyle: 'solid',
      borderRadius: 'lg',
      hoverEffect: 'lift',
    });

    expect(classes.containerClass).toContain('min-h-[64px]');
    expect(classes.containerClass).toContain('rounded-2xl');
    expect(classes.containerClass).toContain('bg-surface');
    expect(classes.containerClass).toContain('hover:-translate-y-1');
  });

  it('должен генерировать корректные классы для вертикальных постеров', () => {
    const classes = getBookmarkTileClasses({
      tileShape: 'rectangle-vertical',
      tileSize: 'compact',
      cardStyle: 'glow',
      borderRadius: 'none',
      hoverEffect: 'glow',
    });

    // rectangle-vertical compact
    expect(classes.containerClass).toContain('w-[80px]');
    expect(classes.containerClass).toContain('h-[104px]');
    expect(classes.containerClass).toContain('rounded-none');
    expect(classes.containerClass).toContain('shadow-');
  });

  it('должен генерировать корректные классы для круглых иконок', () => {
    const classes = getBookmarkTileClasses({
      tileShape: 'circle',
      tileSize: 'xl',
      cardStyle: 'transparent',
    });

    expect(classes.iconContainerClass).toContain('rounded-full');
    expect(classes.containerClass).toContain('w-32');
    expect(classes.containerClass).toContain('flex-col');
  });

  it('должен поддерживать размер xs (Мини) для всех форм', () => {
    const squareXs = getBookmarkTileClasses({ tileShape: 'square', tileSize: 'xs' });
    expect(squareXs.containerClass).toContain('w-16');
    expect(squareXs.iconContainerClass).toContain('w-10');

    const circleXs = getBookmarkTileClasses({ tileShape: 'circle', tileSize: 'xs' });
    expect(circleXs.containerClass).toContain('w-14');
    expect(circleXs.iconContainerClass).toContain('rounded-full');

    const pillXs = getBookmarkTileClasses({ tileShape: 'pill', tileSize: 'xs' });
    expect(pillXs.containerClass).toContain('min-h-[28px]');
  });

  it('должен генерировать детерминированный fallback градиент', () => {
    const grad1 = getBookmarkFallbackGradient('React');
    const grad2 = getBookmarkFallbackGradient('React');
    const grad3 = getBookmarkFallbackGradient('Vue');

    expect(grad1).toBe(grad2);
    expect(typeof grad3).toBe('string');
    expect(grad1).toContain('from-');
    expect(grad1).toContain('to-');
  });

  it('должен генерировать адаптивные grid-классы для различных форм', () => {
    expect(getBookmarkGridClass(1, 'square')).toContain('grid-cols-1');
    expect(getBookmarkGridClass('auto', 'square')).toContain('auto-fill');
    expect(getBookmarkGridClass('auto', 'circle')).toContain('auto-fill');
    expect(getBookmarkGridClass('auto', 'rectangle-vertical')).toContain('auto-fill');
    expect(getBookmarkGridClass('auto', 'pill')).toContain('flex-wrap');
    expect(getBookmarkGridClass(3, 'rectangle-horizontal')).toContain('lg:grid-cols-3');
    expect(getBookmarkGridClass('auto', 'rectangle-horizontal')).toContain('xl:grid-cols-5');
  });
});


