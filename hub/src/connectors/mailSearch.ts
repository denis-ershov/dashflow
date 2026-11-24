import { z } from 'zod';
import { ConnectorError } from './contract.js';

export const MAIL_MESSAGE_LIMIT = 100;
export const mailUid = z.int().min(1).max(0xffff_ffff);
const MAX_UID_SET_BYTES = 32 * 1024;
const searchSchema = z.union([
  z.array(mailUid).max(MAX_UID_SET_BYTES),
  z.object({
    count: z.int().nonnegative().max(0xffff_ffff),
    all: z.string().max(MAX_UID_SET_BYTES).optional(),
  }),
]);

function compactUids(count: number, all: string | undefined) {
  if (count === 0 && !all) return [];
  if (!all || !/^[1-9]\d*(?::[1-9]\d*)?(?:,[1-9]\d*(?::[1-9]\d*)?)*$/.test(all))
    throw new ConnectorError('INVALID_RESPONSE');
  const ranges = all
    .split(',')
    .map((part) => {
      const [left, right = left] = part.split(':');
      const first = Number(left);
      const last = Number(right);
      if (!mailUid.safeParse(first).success || !mailUid.safeParse(last).success)
        throw new ConnectorError('INVALID_RESPONSE');
      return { start: Math.min(first, last), end: Math.max(first, last) };
    })
    .sort((a, b) => b.end - a.end);
  let total = 0;
  let previous = Infinity;
  const uids: number[] = [];
  for (const { start, end } of ranges) {
    if (end >= previous) throw new ConnectorError('INVALID_RESPONSE');
    previous = start;
    total += end - start + 1;
    for (let value = end; value >= start && uids.length < MAIL_MESSAGE_LIMIT; value--) {
      uids.push(value);
    }
  }
  if (total !== count) throw new ConnectorError('INVALID_RESPONSE');
  return uids;
}

export function readMailSearch(source: unknown) {
  const parsed = searchSchema.safeParse(source);
  if (!parsed.success) throw new ConnectorError('INVALID_RESPONSE');
  const results = parsed.data;
  if (Array.isArray(results)) {
    const uids = [...new Set(results)].sort((a, b) => b - a);
    return {
      uids: uids.slice(0, MAIL_MESSAGE_LIMIT),
      incomplete: uids.length > MAIL_MESSAGE_LIMIT,
    };
  }
  return {
    uids: compactUids(results.count, results.all),
    incomplete: results.count > MAIL_MESSAGE_LIMIT,
  };
}
