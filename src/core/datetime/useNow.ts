import { useEffect, useState } from 'react';

/**
 * Текущее время, обновляемое с заданным шагом. Для часов с секундами — 1000 мс,
 * для приветствия и прогресса периодов достаточно минуты.
 */
export function useNow(intervalMs: number): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
