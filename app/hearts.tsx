import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { useHearts } from '@/hooks/useHearts';
import { MAX_HEARTS, PRICES } from '@/lib/constants';
import { formatCountdown } from '@/lib/date';
import { useApp } from '@/store/app';
import { toast } from '@/store/ui';

export default function HeartsSheet() {
  const router = useRouter();
  const h = useHearts();
  const gems = useApp((s) => s.gems);
  const buyItem = useApp((s) => s.buyItem);
  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
      <Pressable style={{ flex: 1 }} onPress={() => router.back()} />
      <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 10, paddingBottom: 30 }}>
        <Text style={{ fontSize: 22, fontWeight: '900', color: '#4B4B4B', textAlign: 'center' }}>Hearts</Text>
        <Text style={{ fontSize: 34, textAlign: 'center' }}>{Array.from({ length: MAX_HEARTS }).map((_, i) => (i < h.hearts ? '❤️' : '🤍')).join(' ')}</Text>
        <Text style={{ textAlign: 'center', color: '#777' }}>
          {h.full ? 'Your hearts are full. Mistakes cost one heart each.' : `Next heart in ${formatCountdown(h.nextMs)}. A heart comes back every 4 hours.`}
        </Text>
        <Button title="Practice to earn a heart" onPress={() => { router.back(); router.push('/session?kind=heart'); }} disabled={h.unlimited} />
        <Button
          title={`Refill hearts · ${PRICES.heartRefill} gems`}
          variant="blue"
          disabled={h.full || gems < PRICES.heartRefill}
          onPress={() => {
            const r = buyItem('heartRefill');
            toast(r.ok ? 'Hearts refilled!' : (r.reason ?? 'Could not refill'), r.ok ? 'success' : 'warn');
            if (r.ok) router.back();
          }}
        />
        <Button title="Unlimited hearts with Super" variant="purple" onPress={() => { router.back(); router.push('/paywall?feature=hearts'); }} />
      </View>
    </View>
  );
}
