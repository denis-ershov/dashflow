import { z } from 'zod';

const intervalMinutes = z.number().int().min(1).max(1_440).optional();
const id = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);
const chatId = z.string().regex(/^-?[1-9]\d{0,15}$/);

const settingsSchema = z
  .object({
    github: z
      .object({
        login: z.string().regex(/^[A-Za-z0-9-]{1,39}$/),
        repositories: z
          .array(z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/))
          .min(1)
          .max(3),
        boardId: id.optional(),
        columnId: id.optional(),
        intervalMinutes,
      })
      .strict()
      .refine(({ boardId, columnId }) => Boolean(boardId) === Boolean(columnId))
      .optional(),
    telegram: z
      .object({
        allowedChatIds: z.array(chatId).min(1).max(50),
        reminderChatId: chatId.optional(),
        intervalMinutes,
      })
      .strict()
      .refine(
        ({ allowedChatIds, reminderChatId }) =>
          !reminderChatId || allowedChatIds.includes(reminderChatId),
      )
      .optional(),
    calendar: z
      .object({
        allowedHostname: z.string().trim().min(1).max(253),
        timezone: z.string().trim().min(1).max(64).optional(),
        intervalMinutes,
      })
      .strict()
      .optional(),
    mail: z
      .object({
        host: z.string().trim().min(1).max(253),
        mailbox: z.string().trim().min(1).max(255).optional(),
        allowedSenders: z.array(z.email()).min(1).max(100),
        subjectIncludes: z.string().trim().min(1).max(100).optional(),
        intervalMinutes,
      })
      .strict()
      .optional(),
  })
  .strict();

export type ConnectorSettings = z.infer<typeof settingsSchema>;

export function parseConnectorSettings(value: unknown): ConnectorSettings {
  const parsed = settingsSchema.safeParse(value);
  if (!parsed.success) throw new Error('Invalid integrations in Hub configuration');
  return parsed.data;
}
