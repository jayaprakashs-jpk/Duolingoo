import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { PLANS, TIER_LABEL, getBilling, type PlanId } from '@/services/billing';
import { play } from '@/services/sound';
import { useApp } from '@/store/app';
import { toast } from '@/store/ui';

type Cell = boolean | string;
const ROWS: { label: string; free: Cell; super: Cell; family: Cell; max: Cell; key?: string }[] = [
  { label: 'Hearts', free: '5, 4h refill', super: 'Unlimited', family: 'Unlimited', max: 'Unlimited', key: 'hearts' },
  { label: 'Ads', free: 'Yes', super: 'None', family: 'None', max: 'None', key: 'ads' },
  { label: 'Practice Hub', free: false, super: true, family: true, max: true, key: 'practice' },
  { label: 'Legendary attempts', free: '100 gems', super: 'Free', family: 'Free', max: 'Free', key: 'legendary' },
  { label: 'Monthly streak repair', free: false, super: true, family: true, max: true },
  { label: 'Offline lesson packs', free: false, super: true, family: true, max: true, key: 'offline' },
  { label: 'Family (5 members)', free: false, super: false, family: true, max: false, key: 'family' },
  { label: 'AI video call', free: false, super: false, family: false, max: true, key: 'max' },
  { label: 'AI roleplay quests', free: false, super: false, family: false, max: true },
];

const show = (c: Cell) => (c === true ? '✓' : c === false ? '–' : c);

export default function Paywall() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { feature } = useLocalSearchParams<{ feature?: string }>();
  const tier = useApp((s) => s.tier);
  const setTier = useApp((s) => s.setTier);
  const [sel, setSel] = useState<PlanId>(feature === 'max' ? 'max' : feature === 'family' ? 'family' : 'super');
  const [busy, setBusy] = useState(false);
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(withSequence(withTiming(1.04, { duration: 800 }), withTiming(1, { duration: 800 })), -1);
  }, [pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  const plan = PLANS.find((p) => p.id === sel)!;

  const buy = async () => {
    setBusy(true);
    const billing = getBilling();
    const r = await billing.purchase(sel);
    setBusy(false);
    if (r.ok && r.tier) {
      setTier(r.tier);
      void play('complete');
      toast(r.simulated ? `${TIER_LABEL[r.tier]} unlocked (simulated, no charge)` : `${TIER_LABEL[r.tier]} unlocked. Thank you!`, 'success');
      router.back();
    } else toast(r.error ?? 'Purchase cancelled', 'warn');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#1F1B2E' }}>
      <ScrollView contentContainerStyle={{ padding: 18, paddingTop: insets.top + 10, paddingBottom: 130 }}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ alignSelf: 'flex-end', padding: 6 }}>
          <Text style={{ color: '#fff', fontSize: 26, fontWeight: '800' }}>✕</Text>
        </Pressable>
        <Animated.View entering={FadeInDown.duration(400)} style={{ alignItems: 'center', gap: 6, marginBottom: 18 }}>
          <Text style={{ fontSize: 60 }}>💎</Text>
          <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', textAlign: 'center' }}>Learn without limits</Text>
          <Text style={{ color: '#C9C3E0', textAlign: 'center' }}>Pick a plan. You can switch any time in Settings.</Text>
          {tier !== 'free' ? <Text style={{ color: '#58CC02', fontWeight: '900' }}>Current plan: {TIER_LABEL[tier]}</Text> : null}
        </Animated.View>

        {PLANS.map((p, i) => (
          <Animated.View key={p.id} entering={FadeInDown.delay(120 * (i + 1)).duration(400)}>
            <Pressable onPress={() => setSel(p.id)} style={{ backgroundColor: sel === p.id ? '#2D2745' : '#262038', borderColor: sel === p.id ? p.color : '#3A3354', borderWidth: 3, borderRadius: 20, padding: 16, marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: p.color, fontSize: 22, fontWeight: '900' }}>{p.name}</Text>
                <Text style={{ color: '#fff', fontWeight: '800' }}>{p.price}</Text>
              </View>
              <Text style={{ color: '#C9C3E0', marginBottom: 6 }}>{p.tagline}</Text>
              {p.perks.map((perk) => (
                <Text key={perk} style={{ color: '#fff', lineHeight: 22 }}>
                  ✓ {perk}
                </Text>
              ))}
            </Pressable>
          </Animated.View>
        ))}

        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 10, marginBottom: 8 }}>Compare plans</Text>
        <View style={{ backgroundColor: '#262038', borderRadius: 16, overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 10, backgroundColor: '#322B4A' }}>
            <Text style={{ flex: 2.2, color: '#C9C3E0', fontWeight: '800', fontSize: 12 }}> </Text>
            {['Free', 'Super', 'Family', 'Max'].map((h) => (
              <Text key={h} style={{ flex: 1.2, color: '#fff', fontWeight: '900', fontSize: 12, textAlign: 'center' }}>{h}</Text>
            ))}
          </View>
          {ROWS.map((r) => (
            <View key={r.label} style={{ flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 10, borderTopWidth: 1, borderTopColor: '#3A3354', backgroundColor: feature && r.key === feature ? '#3B2F66' : 'transparent' }}>
              <Text style={{ flex: 2.2, color: '#fff', fontSize: 13, fontWeight: '700' }}>{r.label}</Text>
              {[r.free, r.super, r.family, r.max].map((c, i) => (
                <Text key={i} style={{ flex: 1.2, textAlign: 'center', color: c === false ? '#6D6688' : c === true ? '#58CC02' : '#E7E3F5', fontSize: 12, fontWeight: '800' }}>{show(c)}</Text>
              ))}
            </View>
          ))}
        </View>
        <Text style={{ color: '#8F88AB', fontSize: 12, textAlign: 'center', marginTop: 14, lineHeight: 18 }}>
          {getBilling().name === 'RevenueCat' ? 'Billed through Google Play via RevenueCat.' : 'Test build: purchases are simulated and nothing is charged. Connect RevenueCat to sell for real (see README).'}
        </Text>
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: 16 + insets.bottom, backgroundColor: '#1F1B2E', borderTopWidth: 1, borderTopColor: '#3A3354' }}>
        <Animated.View style={pulseStyle}>
          <Button title={tier === sel ? `You have ${plan.name}` : `Get ${plan.name} · ${plan.price}`} onPress={buy} loading={busy} disabled={tier === sel} color={{ bg: plan.color, edge: '#00000055', text: '#fff' }} />
        </Animated.View>
        <Pressable onPress={async () => { const t = await getBilling().restore(); toast(t ? `Restored ${TIER_LABEL[t]}` : 'Nothing to restore on this device', t ? 'success' : 'info'); if (t) setTier(t); }} style={{ padding: 10 }}>
          <Text style={{ color: '#8F88AB', textAlign: 'center', fontWeight: '700' }}>Restore purchases</Text>
        </Pressable>
      </View>
    </View>
  );
}
