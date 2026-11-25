import React from 'react';
import { Text, View } from 'react-native';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useNow } from '@/hooks/useNow';
import { MAX_HEARTS, PRICES } from '@/lib/constants';
import { formatCountdown } from '@/lib/date';
import { play } from '@/services/sound';
import { useApp, type ShopItem } from '@/store/app';
import { toast } from '@/store/ui';

interface Item {
  id: ShopItem;
  icon: string;
  title: string;
  desc: string;
  price: number;
}

const ITEMS: Item[] = [
  { id: 'streakFreeze', icon: '🧊', title: 'Streak Freeze', desc: 'Protects your streak for one missed day. Equip up to 2.', price: PRICES.streakFreeze },
  { id: 'heartRefill', icon: '❤️', title: 'Full Heart Refill', desc: `Refill to ${MAX_HEARTS} hearts instantly.`, price: PRICES.heartRefill },
  { id: 'wager', icon: '🎲', title: 'Double or Nothing', desc: 'Keep your goal for 7 days in a row and your 50 gems become 100.', price: PRICES.wager },
  { id: 'xpBoost', icon: '🧪', title: 'XP Boost potion', desc: 'Double XP for 15 minutes.', price: PRICES.xpBoost },
  { id: 'timerBoost', icon: '⏱️', title: 'Timer Boost', desc: '+30 seconds in your next Match Madness or Ramp Up.', price: PRICES.timerBoost },
];

export default function Shop() {
  const gems = useApp((s) => s.gems);
  const freezes = useApp((s) => s.streak.freezes);
  const inv = useApp((s) => s.inventory);
  const wager = useApp((s) => s.wager);
  const hearts = useApp((s) => s.hearts);
  const buy = useApp((s) => s.buyItem);
  const e = useEntitlements();
  const now = useNow(1000);
  const boostLeft = Math.max(0, inv.xpBoostUntil - now);

  const status = (id: ShopItem): string | null => {
    if (id === 'streakFreeze') return `${freezes}/2 equipped`;
    if (id === 'heartRefill') return e.unlimitedHearts ? 'Unlimited hearts active' : `${hearts}/${MAX_HEARTS} hearts`;
    if (id === 'wager') return wager ? `Day ${wager.days}/7 running` : null;
    if (id === 'xpBoost') return boostLeft ? `Active · ${formatCountdown(boostLeft)} left` : null;
    if (id === 'timerBoost') return `${inv.timerBoosts} owned`;
    return null;
  };

  return (
    <Screen scroll>
      <ScreenHeader title="Shop" right={<Text className="text-lg font-black text-macaw">💎 {gems}</Text>} />
      <View className="gap-3">
        {ITEMS.map((it) => (
          <Card key={it.id}>
            <View className="flex-row items-center gap-3.5">
              <Text className="text-[40px]">{it.icon}</Text>
              <View className="flex-1">
                <Text className="text-[17px] font-black text-eel">{it.title}</Text>
                <Text className="text-sm leading-5 text-wolf">{it.desc}</Text>
                {status(it.id) ? <Text className="mt-1 font-extrabold text-featherDark">{status(it.id)}</Text> : null}
              </View>
            </View>
            <Button
              title={`💎 ${it.price}`}
              variant="blue"
              small
              style={{ marginTop: 10 }}
              disabled={gems < it.price}
              onPress={() => {
                const r = buy(it.id);
                if (r.ok) {
                  void play('gem');
                  toast(`${it.title} purchased!`, 'success');
                } else toast(r.reason ?? 'Could not buy', 'warn');
              }}
            />
          </Card>
        ))}
      </View>
      <Text className="mt-4 text-center text-hare">Earn gems from lessons, daily quests and league finishes.</Text>
    </Screen>
  );
}
