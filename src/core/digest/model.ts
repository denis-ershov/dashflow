export const DIGEST_READ = 'read';
export const DIGEST_UNREAD = 'unread';
export const DIGEST_ALARM = 'dashflow:morning-digest';
export const DIGEST_SCHEDULE_KEY = 'dashflow_morning_digest_enabled';
export const GENERATE_DIGEST_MESSAGE = 'dashflow:generate-morning-digest';
export const DIGEST_SOURCE = { type: 'user', id: 'local', name: 'local' } as const;

export function morningRunTime(date: Date): Date {
  const runAt = new Date(date);
  runAt.setHours(7, 30, 0, 0);
  return runAt;
}

export function nextMorningRunTime(date: Date): number {
  const runAt = morningRunTime(date);
  if (runAt <= date) runAt.setDate(runAt.getDate() + 1);
  return runAt.getTime();
}

export function morningTag(date: Date): string {
  return `morning-${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}
