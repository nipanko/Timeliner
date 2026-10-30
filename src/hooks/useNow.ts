import { useEffect, useState } from 'react';

/** The current time, refreshed every `intervalMs`. For text only; motion reads the clock per frame. */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
