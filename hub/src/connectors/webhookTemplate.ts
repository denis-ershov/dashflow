export type WebhookTemplate = {
  kind: 'task' | 'note' | 'link';
  title: string;
  body?: string;
  url?: string;
};

const forbiddenSegments = new Set(['__proto__', 'constructor', 'prototype']);
const templateFields = new Set(['kind', 'title', 'body', 'url']);

function isRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function parsePath(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length > 512) {
    throw new Error(`Invalid webhook template ${field}`);
  }
  const segments = value.split('.');
  if (
    segments.length > 8 ||
    segments.some(
      (segment) => !/^[A-Za-z_$][\w$-]*$/.test(segment) || forbiddenSegments.has(segment),
    )
  ) {
    throw new Error(`Invalid webhook template ${field}`);
  }
  return value;
}

function parseTemplate(value: unknown): WebhookTemplate {
  if (!isRecord(value)) throw new Error('Invalid webhook template');
  for (const key of Object.keys(value)) {
    if (!templateFields.has(key)) throw new Error('Invalid webhook template field');
  }
  if (value.kind !== 'task' && value.kind !== 'note' && value.kind !== 'link') {
    throw new Error('Invalid webhook template kind');
  }
  return {
    kind: value.kind,
    title: parsePath(value.title, 'title'),
    ...(value.body === undefined ? {} : { body: parsePath(value.body, 'body') }),
    ...(value.url === undefined ? {} : { url: parsePath(value.url, 'url') }),
  };
}

/** Parse credential-ID keyed field mappings without evaluating templates or inherited properties. */
export function parseWebhookTemplates(value: unknown): ReadonlyMap<string, WebhookTemplate> {
  if (!isRecord(value)) throw new Error('Webhook templates must be an object');
  const templates = new Map<string, WebhookTemplate>();
  for (const id of Object.keys(value)) {
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(id) || forbiddenSegments.has(id)) {
      throw new Error('Invalid webhook credential ID');
    }
    templates.set(id, parseTemplate(value[id]));
  }
  return templates;
}

export function applyWebhookTemplate(
  payload: unknown,
  template: WebhookTemplate,
): Record<string, unknown> {
  const readPath = (path: string | undefined): unknown => {
    if (path === undefined) return undefined;
    let current: unknown = payload;
    for (const segment of path.split('.')) {
      if (!isRecord(current) || !Object.hasOwn(current, segment)) return undefined;
      current = current[segment];
    }
    return current;
  };
  return {
    kind: template.kind,
    title: readPath(template.title),
    ...(template.body === undefined ? {} : { body: readPath(template.body) }),
    ...(template.url === undefined ? {} : { url: readPath(template.url) }),
  };
}
