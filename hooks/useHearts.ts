import { useEffect } from 'react';
import { HEART_REGEN_MS, MAX_HEARTS } from '@/lib/constants';
import { nextHeartMs, useApp } from '@/store/app';
import { useEntitlements } from './useEntitlements';
import { useNow } from './useNow';

export function useHearts() {
  const hearts = useApp((s) => s.hearts);
  const heartsAt = useApp((s) => s.heartsAt);
  const syncHearts = useApp((s) => s.syncHearts);
  const e = useEntitlements();
  const now = useNow(hearts < MAX_HEARTS && !e.unlimitedHearts ? 1000 : 0);

  useEffect(() => {
    syncHearts();
  }, [now, syncHearts]);

  const unlimited = e.unlimitedHearts;
  return {
    hearts: unlimited ? MAX_HEARTS : hearts,
    unlimited,
    full: unlimited || hearts >= MAX_HEARTS,
    nextMs: unlimited ? 0 : nextHeartMs({ hearts, heartsAt }, now),
    empty: !unlimited && hearts <= 0,
    regenMs: HEART_REGEN_MS,
  };
}
