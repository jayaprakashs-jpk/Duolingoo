import { useEffect, useState } from 'react';

/** re-renders every `ms` milliseconds; pass 0 to disable */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!ms) return;
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
