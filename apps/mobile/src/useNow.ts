import { useEffect, useState } from 'react';

/** A clock that ticks every `ms`, so "pending 4 min" and stale pending stay current. */
export function useNow(ms: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
