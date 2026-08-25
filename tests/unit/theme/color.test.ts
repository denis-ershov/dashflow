import { describe, expect, it } from 'vitest';
import {
  contrastRatio,
  darken,
  flatten,
  formatColor,
  lighten,
  mix,
  parseColor,
  pickReadable,
  relativeLuminance,
  withAlpha,
  type Rgba,
} from '@/core/theme/color';

/** Разбирает заведомо валидный цвет. Падает, если разбор вернул null. */
function parse(input: string): Rgba {
  const color = parseColor(input);
  if (color === null) throw new Error(`ожидался валидный цвет: ${input}`);
  return color;
}

describe('parseColor', () => {
  it('разбирает шестизначный hex', () => {
    expect(parseColor('#0b0f17')).toEqual({ r: 11, g: 15, b: 23, a: 1 });
  });

  it('разбирает трёхзначный hex как удвоение символов', () => {
    expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseColor('#0af')).toEqual({ r: 0, g: 170, b: 255, a: 1 });
  });

  it('разбирает hex с альфой', () => {
    expect(parseColor('#0b0f17cc')).toEqual({ r: 11, g: 15, b: 23, a: 0.8 });
    expect(parseColor('#f00c')).toEqual({ r: 255, g: 0, b: 0, a: 0.8 });
  });

  it('не зависит от регистра и пробелов по краям', () => {
    expect(parseColor('  #0B0F17  ')).toEqual({ r: 11, g: 15, b: 23, a: 1 });
  });

  it('разбирает rgb() через запятые', () => {
    expect(parseColor('rgb(18, 26, 38)')).toEqual({ r: 18, g: 26, b: 38, a: 1 });
  });

  it('разбирает rgba() через запятые', () => {
    expect(parseColor('rgba(18, 26, 38, 0.7)')).toEqual({ r: 18, g: 26, b: 38, a: 0.7 });
  });

  it('разбирает современный синтаксис с пробелами и слешем', () => {
    expect(parseColor('rgb(18 26 38 / 0.65)')).toEqual({ r: 18, g: 26, b: 38, a: 0.65 });
  });

  it('разбирает альфу в процентах', () => {
    expect(parseColor('rgb(18 26 38 / 65%)')).toEqual({ r: 18, g: 26, b: 38, a: 0.65 });
  });

  it('разбирает каналы в процентах', () => {
    expect(parseColor('rgb(100% 0% 0%)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });

  it('обрезает каналы и альфу по диапазону, как это делает CSS', () => {
    expect(parseColor('rgb(300 -20 38)')).toEqual({ r: 255, g: 0, b: 38, a: 1 });
    expect(parseColor('rgb(18 26 38 / 5)')).toEqual({ r: 18, g: 26, b: 38, a: 1 });
  });

  it('возвращает null на мусоре', () => {
    for (const bad of [
      '',
      '   ',
      'red',
      '#12345',
      '#gg0000',
      'rgb(1, 2)',
      'rgb(a b c)',
      'hsl(0 0% 0%)',
      'var(--x)',
    ]) {
      expect(parseColor(bad)).toBeNull();
    }
  });
});

describe('formatColor', () => {
  it('печатает непрозрачный цвет без альфы', () => {
    expect(formatColor({ r: 11, g: 15, b: 23, a: 1 })).toBe('rgb(11 15 23)');
  });

  it('печатает полупрозрачный цвет со слешем', () => {
    expect(formatColor({ r: 18, g: 26, b: 38, a: 0.65 })).toBe('rgb(18 26 38 / 0.65)');
  });

  it('округляет каналы до целых, а альфу до трёх знаков', () => {
    expect(formatColor({ r: 17.6, g: 26.4, b: 38.2, a: 0.6666 })).toBe('rgb(18 26 38 / 0.667)');
  });

  it('делает цикл parse → format → parse устойчивым', () => {
    const once = parse('rgb(18 26 38 / 0.65)');
    expect(parse(formatColor(once))).toEqual(once);
  });
});

describe('withAlpha', () => {
  it('заменяет альфу и не трогает каналы', () => {
    expect(withAlpha(parse('#0b0f17'), 0.5)).toEqual({ r: 11, g: 15, b: 23, a: 0.5 });
  });

  it('обрезает альфу по диапазону', () => {
    expect(withAlpha(parse('#0b0f17'), 2).a).toBe(1);
    expect(withAlpha(parse('#0b0f17'), -1).a).toBe(0);
  });
});

describe('mix', () => {
  it('при весе 0 возвращает первый цвет, при весе 1 — второй', () => {
    const black = parse('#000000');
    const white = parse('#ffffff');
    expect(mix(black, white, 0)).toEqual(black);
    expect(mix(black, white, 1)).toEqual(white);
  });

  it('при весе 0.5 даёт середину', () => {
    expect(mix(parse('#000000'), parse('#ffffff'), 0.5)).toEqual({ r: 128, g: 128, b: 128, a: 1 });
  });

  it('смешивает альфу вместе с каналами', () => {
    const result = mix(parse('rgb(0 0 0 / 0)'), parse('rgb(0 0 0 / 1)'), 0.5);
    expect(result.a).toBeCloseTo(0.5, 5);
  });
});

describe('lighten и darken', () => {
  it('lighten двигает цвет к белому', () => {
    expect(lighten(parse('#000000'), 0.5)).toEqual({ r: 128, g: 128, b: 128, a: 1 });
  });

  it('darken двигает цвет к чёрному', () => {
    expect(darken(parse('#ffffff'), 0.5)).toEqual({ r: 128, g: 128, b: 128, a: 1 });
  });

  it('сохраняют альфу', () => {
    expect(lighten(parse('rgb(0 0 0 / 0.4)'), 0.5).a).toBe(0.4);
    expect(darken(parse('rgb(255 255 255 / 0.4)'), 0.5).a).toBe(0.4);
  });

  it('насыщаются на границах, а не выходят за них', () => {
    expect(lighten(parse('#ffffff'), 0.5)).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(darken(parse('#000000'), 0.5)).toEqual({ r: 0, g: 0, b: 0, a: 1 });
  });
});

describe('flatten', () => {
  it('накладывает полупрозрачный цвет на фон', () => {
    const result = flatten(parse('rgb(255 255 255 / 0.5)'), parse('#000000'));
    expect(result).toEqual({ r: 128, g: 128, b: 128, a: 1 });
  });

  it('полностью прозрачный передний план даёт чистый фон', () => {
    expect(flatten(parse('rgb(255 0 0 / 0)'), parse('#0b0f17'))).toEqual({
      r: 11,
      g: 15,
      b: 23,
      a: 1,
    });
  });

  it('непрозрачный передний план скрывает фон', () => {
    expect(flatten(parse('#3b82f6'), parse('#0b0f17'))).toEqual({ r: 59, g: 130, b: 246, a: 1 });
  });
});

describe('relativeLuminance', () => {
  it('белый равен 1, чёрный равен 0', () => {
    expect(relativeLuminance(parse('#ffffff'))).toBeCloseTo(1, 6);
    expect(relativeLuminance(parse('#000000'))).toBeCloseTo(0, 6);
  });

  it('соответствует эталону WCAG для среднего серого', () => {
    expect(relativeLuminance(parse('#808080'))).toBeCloseTo(0.215861, 5);
  });
});

describe('contrastRatio', () => {
  it('белый на чёрном даёт максимум 21', () => {
    expect(contrastRatio(parse('#ffffff'), parse('#000000'))).toBeCloseTo(21, 4);
  });

  it('цвет сам с собой даёт 1', () => {
    expect(contrastRatio(parse('#3b82f6'), parse('#3b82f6'))).toBeCloseTo(1, 6);
  });

  it('симметричен', () => {
    const a = parse('#f8fafc');
    const b = parse('#0b0f17');
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 10);
  });

  it('даёт измеренные значения для палитры Neutral Dark', () => {
    const canvas = parse('#0b0f17');
    expect(contrastRatio(parse('#f8fafc'), canvas)).toBeCloseTo(18.331, 2);
    expect(contrastRatio(parse('#94a3b8'), canvas)).toBeCloseTo(7.4801, 2);
    expect(contrastRatio(parse('#748196'), canvas)).toBeCloseTo(4.8616, 2);
  });
});

describe('pickReadable', () => {
  it('на синей заливке выбирает тёмный текст, а не белый', () => {
    const chosen = pickReadable(parse('#3b82f6'), [parse('#f8fafc'), parse('#0b0f17')]);
    expect(chosen).toEqual(parse('#0b0f17'));
  });

  it('на тёмном холсте выбирает светлый текст', () => {
    const chosen = pickReadable(parse('#0b0f17'), [parse('#f8fafc'), parse('#0b0f17')]);
    expect(chosen).toEqual(parse('#f8fafc'));
  });

  it('при равном контрасте берёт первого кандидата', () => {
    const first = parse('#ffffff');
    expect(pickReadable(parse('#808080'), [first, parse('#ffffff')])).toEqual(first);
  });

  it('бросает ошибку на пустом списке кандидатов', () => {
    expect(() => pickReadable(parse('#0b0f17'), [])).toThrow();
  });
});
