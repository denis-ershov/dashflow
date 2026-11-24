import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';

export const VIRTUAL_ROWS_THRESHOLD = 100;
const OVERSCAN = 5;
const DEFAULT_VIEWPORT = 360;

interface Row {
  key: string;
  estimate: number;
  gap?: number;
}

interface Options {
  rows: readonly Row[];
  scrollRef: RefObject<HTMLDivElement | null>;
  enabled: boolean;
  pinned?: readonly (string | undefined)[];
}

function rowAt(offsets: readonly number[], position: number) {
  let start = 0;
  let end = offsets.length - 1;
  while (start < end) {
    const middle = Math.floor((start + end + 1) / 2);
    if ((offsets[middle] ?? Infinity) <= position) start = middle;
    else end = middle - 1;
  }
  return Math.min(start, offsets.length - 2);
}

function viewport(scroll: HTMLDivElement, list: HTMLUListElement) {
  const bounds = list.getBoundingClientRect();
  const top =
    bounds.height > 0
      ? scroll.getBoundingClientRect().top + scroll.clientTop - bounds.top
      : scroll.scrollTop;
  return { top, height: scroll.clientHeight || DEFAULT_VIEWPORT };
}

/** Окно строк внутри уже существующей области прокрутки. Закреплённые строки сохраняют фокус. */
export function useVirtualRows({ rows, scrollRef, enabled, pinned = [] }: Options) {
  const listRef = useRef<HTMLUListElement>(null);
  const [measurements, setMeasurements] = useState<ReadonlyMap<string, number>>(() => new Map());
  const [visible, setVisible] = useState({ top: 0, height: DEFAULT_VIEWPORT });
  const { indices, offsets } = useMemo(() => {
    const indices = new Map<string, number>();
    const offsets = [0];
    let total = 0;
    if (enabled)
      for (const [index, row] of rows.entries()) {
        indices.set(row.key, index);
        total += measurements.get(row.key) ?? row.estimate;
        offsets.push(total);
      }
    return { indices, offsets };
  }, [enabled, measurements, rows]);

  const start = enabled ? Math.max(0, rowAt(offsets, visible.top) - OVERSCAN) : 0;
  const end = enabled
    ? Math.min(rows.length, rowAt(offsets, visible.top + visible.height) + OVERSCAN + 1)
    : rows.length;
  const rendered = new Set(Array.from({ length: end - start }, (_, index) => index + start));
  if (enabled)
    for (const key of pinned) {
      const index = key === undefined ? undefined : indices.get(key);
      if (index !== undefined) rendered.add(index);
    }
  const range = [...rendered].sort((left, right) => left - right);
  const rangeKey = range.join(',');

  useLayoutEffect(() => {
    const scroll = scrollRef.current;
    const list = listRef.current;
    if (!enabled || !scroll || !list) return;
    const update = () => {
      const next = viewport(scroll, list);
      setVisible((previous) =>
        previous.top === next.top && previous.height === next.height ? previous : next,
      );
    };
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(update);
    observer?.observe(scroll);
    observer?.observe(list);
    if (list.parentElement) observer?.observe(list.parentElement);
    scroll.addEventListener('scroll', update, { passive: true });
    update();
    return () => {
      observer?.disconnect();
      scroll.removeEventListener('scroll', update);
    };
  }, [enabled, scrollRef]);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!enabled || !list) return;
    const targets = Array.from(list.querySelectorAll<HTMLElement>(':scope > [data-virtual-row]'));
    const measure = () => {
      const sizes = targets.flatMap((element) => {
        const key = element.dataset.virtualRow;
        const height = element.offsetHeight;
        if (!key || height <= 0) return [];
        const index = indices.get(key);
        return [[key, height + (index === undefined ? 0 : (rows[index]?.gap ?? 0))] as const];
      });
      if (sizes.length === 0) return;
      setMeasurements((previous) => {
        if (sizes.every(([key, height]) => previous.get(key) === height)) return previous;
        const next = new Map([...previous].filter(([key]) => indices.has(key)));
        for (const [key, height] of sizes) next.set(key, height);
        return next;
      });
    };
    measure();
    const observer =
      typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
    for (const target of targets) observer?.observe(target);
    return () => observer?.disconnect();
  }, [enabled, indices, rangeKey, rows]);

  function reveal(key: string) {
    const index = indices.get(key);
    const scroll = scrollRef.current;
    const list = listRef.current;
    const top = index === undefined ? undefined : offsets[index];
    const bottom = index === undefined ? undefined : offsets[index + 1];
    if (!enabled || top === undefined || bottom === undefined || !scroll || !list) return;
    const current = viewport(scroll, list);
    const next =
      top < current.top || bottom - top > current.height
        ? top
        : Math.max(current.top, bottom - current.height);
    if (next === current.top) return;
    scroll.scrollTop += next - current.top;
    setVisible(viewport(scroll, list));
  }

  function insertionAt(clientY: number) {
    const bounds = listRef.current?.getBoundingClientRect();
    const relative = bounds && clientY - bounds.top;
    if (!enabled || relative === undefined || relative < 0 || relative > (offsets.at(-1) ?? 0))
      return undefined;
    const index = rowAt(offsets, relative);
    return index + Number(relative > ((offsets[index] ?? 0) + (offsets[index + 1] ?? 0)) / 2);
  }

  const rowStyle = (index: number): CSSProperties | undefined =>
    enabled ? { position: 'absolute', insetInline: 0, top: offsets[index] ?? 0 } : undefined;
  const listStyle: CSSProperties | undefined = enabled
    ? { position: 'relative', height: offsets.at(-1), overflowAnchor: 'none' }
    : undefined;

  return { listRef, range, rowStyle, listStyle, reveal, insertionAt };
}
