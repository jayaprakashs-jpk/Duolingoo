// Subscription abstraction. The Settings screen can switch tiers instantly (simulator) so every perk is testable.
// A real RevenueCat adapter is wired in when `react-native-purchases` is installed and a key is configured.
import type { Tier } from '@/data/types';

export type PlanId = 'super' | 'family' | 'max';

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  price: string;
  color: string;
  perks: string[];
}

export const PLANS: Plan[] = [
  {
    id: 'super',
    name: 'Super',
    tagline: 'Learn without limits',
    price: '$6.99 / month',
    color: '#58CC02',
    perks: ['Unlimited hearts', 'No ads', 'Practice Hub', 'Free Legendary challenges', 'Monthly streak repair', 'Offline lesson packs'],
  },
  {
    id: 'family',
    name: 'Super Family',
    tagline: 'Up to 6 learners, one plan',
    price: '$9.99 / month',
    color: '#1CB0F6',
    perks: ['Everything in Super', 'Invite up to 5 family members', 'See everyone\'s streak and XP'],
  },
  {
    id: 'max',
    name: 'Max',
    tagline: 'An AI tutor in your pocket',
    price: '$13.99 / month',
    color: '#CE82FF',
    perks: ['Everything in Super', 'AI video call with your tutor', 'AI roleplay side-quests', 'Post-call and roleplay grading'],
  },
];

export const TIER_LABEL: Record<Tier, string> = {
  free: 'Free',
  super: 'Super',
  family: 'Super Family',
  max: 'Max',
};

export interface Entitlements {
  tier: Tier;
  isPaid: boolean;
  unlimitedHearts: boolean;
  noAds: boolean;
  practiceHub: boolean;
  freeLegendary: boolean;
  streakRepair: boolean;
  offlinePacks: boolean;
  familyPlan: boolean;
  aiTutor: boolean;
}

export function entitlementsFor(tier: Tier): Entitlements {
  const paid = tier !== 'free';
  return {
    tier,
    isPaid: paid,
    unlimitedHearts: paid,
    noAds: paid,
    practiceHub: paid,
    freeLegendary: paid,
    streakRepair: paid,
    offlinePacks: paid,
    familyPlan: tier === 'family',
    aiTutor: tier === 'max',
  };
}

export interface PurchaseResult {
  ok: boolean;
  tier?: Tier;
  error?: string;
  simulated: boolean;
}

export interface BillingProvider {
  name: string;
  purchase(plan: PlanId): Promise<PurchaseResult>;
  restore(): Promise<Tier | null>;
}

const SimulatorProvider: BillingProvider = {
  name: 'Simulator (no real charge)',
  async purchase(plan) {
    return { ok: true, tier: plan, simulated: true };
  },
  async restore() {
    return null;
  },
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function tryRevenueCat(): BillingProvider | null {
  const key = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
  if (!key) return null;
  let Purchases: any = null;
  try {
    // Optional dependency: `npm i react-native-purchases` then rebuild the APK.
    Purchases = require('react-native-purchases');
    Purchases = Purchases.default ?? Purchases;
  } catch {
    return null;
  }
  let configured = false;
  const ensure = () => {
    if (!configured) {
      Purchases.configure({ apiKey: key });
      configured = true;
    }
  };
  const tierFromInfo = (info: any): Tier | null => {
    const active = info?.entitlements?.active ?? {};
    if (active.max) return 'max';
    if (active.family) return 'family';
    if (active.super) return 'super';
    return null;
  };
  return {
    name: 'RevenueCat',
    async purchase(plan) {
      try {
        ensure();
        const offerings = await Purchases.getOfferings();
        const pkg = offerings?.current?.availablePackages?.find((p: any) => p.identifier === plan || p.product?.identifier?.includes(plan));
        if (!pkg) return { ok: false, error: `No RevenueCat package named "${plan}"`, simulated: false };
        const { customerInfo } = await Purchases.purchasePackage(pkg);
        const tier = tierFromInfo(customerInfo);
        return tier ? { ok: true, tier, simulated: false } : { ok: false, error: 'Purchase did not unlock an entitlement', simulated: false };
      } catch (e) {
        return { ok: false, error: (e as Error).message, simulated: false };
      }
    },
    async restore() {
      try {
        ensure();
        return tierFromInfo(await Purchases.restorePurchases());
      } catch {
        return null;
      }
    },
  };
}

let provider: BillingProvider | null = null;
export function getBilling(): BillingProvider {
  if (!provider) provider = tryRevenueCat() ?? SimulatorProvider;
  return provider;
}
