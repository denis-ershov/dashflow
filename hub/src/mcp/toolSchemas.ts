import { ITEM_KINDS, ITEM_LIMITS, ITEM_PRIORITIES } from '@dashflow/shared';
import { z } from 'zod';

const id = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);
const title = z.string().trim().min(1).max(ITEM_LIMITS.titleLength);
const body = z.string().max(ITEM_LIMITS.bodyLength);
const url = z
  .string()
  .max(ITEM_LIMITS.urlLength)
  .regex(/^https?:\/\//i);
const tags = z.array(z.string().trim().min(1).max(ITEM_LIMITS.tagLength)).max(ITEM_LIMITS.tags);
const datetime = z.string().max(40).datetime({ offset: true });
const priority = z.enum(ITEM_PRIORITIES);
const limit = z.number().int().min(1).max(25);
const version = z
  .number()
  .int()
  .min(1)
  .max(Number.MAX_SAFE_INTEGER - 1);
const idempotencyKey = z.string().regex(/^[\w.-]{1,100}$/);
const optionalDates = { dueAt: datetime.optional(), remindAt: datetime.optional() };
const filters = {
  kind: z.enum(ITEM_KINDS).optional(),
  status: id.optional(),
  boardId: id.optional(),
  assignee: z.literal('me').optional(),
  limit: limit.optional(),
  cursor: z
    .string()
    .regex(/^[A-Za-z0-9_-]{1,200}$/)
    .optional(),
};
const newItem = {
  title,
  body: body.optional(),
  url: url.optional(),
  tags: tags.optional(),
  boardId: id.optional(),
  status: id.optional(),
  priority: priority.optional(),
  ...optionalDates,
};
const target = { id, expectedVersion: version };

export const schemas = {
  listItems: z.object(filters).strict(),
  searchItems: z.object({ ...filters, q: z.string().trim().min(1).max(200) }).strict(),
  itemId: z.object({ id }).strict(),
  createItem: z
    .object({
      ...newItem,
      kind: z.enum(ITEM_KINDS).exclude(['digest']),
      idempotencyKey: idempotencyKey.optional(),
    })
    .strict(),
  updateItem: z
    .object({
      ...target,
      patch: z
        .object({
          title: title.optional(),
          body: body.nullable().optional(),
          url: url.nullable().optional(),
          tags: tags.optional(),
          boardId: id.nullable().optional(),
          status: id.optional(),
          priority: priority.nullable().optional(),
          dueAt: datetime.nullable().optional(),
          remindAt: datetime.nullable().optional(),
          archivedAt: datetime.nullable().optional(),
          pinned: z.boolean().optional(),
          agentComment: z.string().max(ITEM_LIMITS.agentCommentLength).nullable().optional(),
        })
        .strict(),
    })
    .strict(),
  completeTask: z.object(target).strict(),
  moveCard: z.object({ ...target, boardId: id, columnId: id }).strict(),
  reminder: z
    .object({
      title,
      body: body.optional(),
      url: url.optional(),
      tags: tags.optional(),
      remindAt: datetime,
      idempotencyKey: idempotencyKey.optional(),
    })
    .strict(),
  digest: z
    .object({
      title,
      body: body.refine((text) => text.trim().length > 0),
      url: url.optional(),
      tags: tags.optional(),
      idempotencyKey: idempotencyKey.optional(),
    })
    .strict(),
  listBoards: z.object({ limit: limit.optional() }).strict(),
  agenda: z
    .object({ from: datetime.optional(), to: datetime.optional(), limit: limit.optional() })
    .strict(),
};
