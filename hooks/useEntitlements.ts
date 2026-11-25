import { useMemo } from 'react';
import { entitlementsFor, type Entitlements } from '@/services/billing';
import { useApp } from '@/store/app';

export function useEntitlements(): Entitlements {
  const tier = useApp((s) => s.tier);
  return useMemo(() => entitlementsFor(tier), [tier]);
}
