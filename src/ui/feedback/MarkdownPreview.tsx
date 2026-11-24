import { isSafeHttpUrl } from '@/core/network/url';

const LIST_LINK = /^\[((?:\\.|[^\]\\])*)\]\((?:<([^<>]+)>|([^\s()<>]+))\)$/;

function unescapeText(text: string) {
  return text.replace(/\\([\\[\]])/g, '$1');
}

function listContent(text: string, allowLinks: boolean) {
  if (!allowLinks) return text;
  const match = LIST_LINK.exec(text);
  const label = match?.[1];
  const url = match?.[2] ?? match?.[3];
  if (!label || !url || !isSafeHttpUrl(url)) return unescapeText(text);
  const target = new URL(url);
  if (target.username || target.password) return unescapeText(text);
  return (
    <a
      href={target.href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 min-w-11 items-center text-primary underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-primary"
    >
      {unescapeText(label)}
    </a>
  );
}

/** Разметка выводится как React-узлы, сырой HTML остаётся текстом. */
export function MarkdownPreview({
  text,
  allowLinks = false,
}: {
  text: string;
  allowLinks?: boolean;
}) {
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    if (line.startsWith('# ')) {
      return (
        <h1 key={idx} className="text-base font-bold text-fg my-1">
          {line.slice(2)}
        </h1>
      );
    }
    if (line.startsWith('## ')) {
      return (
        <h2 key={idx} className="text-sm font-semibold text-fg my-1">
          {line.slice(3)}
        </h2>
      );
    }
    if (line.startsWith('### ')) {
      return (
        <h3 key={idx} className="text-xs font-semibold text-fg my-1">
          {line.slice(4)}
        </h3>
      );
    }
    if (line.startsWith('- [x] ') || line.startsWith('- [X] ')) {
      return (
        <div key={idx} className="flex items-center gap-2 text-xs text-fg-muted line-through my-1">
          <span className="text-success font-bold">✓</span>
          <span>{line.slice(6)}</span>
        </div>
      );
    }
    if (line.startsWith('- [ ] ')) {
      return (
        <div key={idx} className="flex items-center gap-2 text-xs text-fg my-1">
          <span className="text-fg-muted">◻</span>
          <span>{line.slice(6)}</span>
        </div>
      );
    }
    if (line.startsWith('- ')) {
      return (
        <div key={idx} className="flex items-center gap-2 text-xs text-fg my-1">
          <span className="size-2 rounded-full bg-primary shrink-0" />
          <span className={allowLinks ? 'min-w-0' : undefined}>
            {listContent(line.slice(2), allowLinks)}
          </span>
        </div>
      );
    }
    if (!line.trim()) {
      return <div key={idx} className="h-2" />;
    }
    return (
      <p key={idx} className="text-xs text-fg leading-relaxed my-1">
        {allowLinks ? unescapeText(line) : line}
      </p>
    );
  });
}
