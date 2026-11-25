import React, { useEffect, useState } from 'react';
import { Modal, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Celebration } from '@/components/Celebration';
import { StreakFlame } from '@/components/StreakFlame';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { useEntitlements } from '@/hooks/useEntitlements';
import { play } from '@/services/sound';
import { useSessionStore } from '@/store/session';

function Stat({ label, value, color, emoji }: { label: string; value: string; color: string; emoji: string }) {
  return (
    <Card border={color} style={{ flex: 1, padding: 0, overflow: 'hidden', borderRadius: 16 }}>
      <View style={{ backgroundColor: color, paddingVertical: 4 }}>
        <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '900', fontSize: 11, letterSpacing: 1 }}>{label}</Text>
      </View>
      <View style={{ paddingVertical: 14, alignItems: 'center' }}>
        <Text style={{ fontSize: 22, fontWeight: '900', color }}>
          {emoji} {value}
        </Text>
      </View>
    </Card>
  );
}

export default function Complete() {
  const router = useRouter();
  const r = useSessionStore((s) => s.lastResult);
  const ent = useEntitlements();
  const [ad, setAd] = useState(!ent.noAds && !!r?.passed);
  const [count, setCount] = useState(4);

  useEffect(() => {
    void play(r?.passed ? 'complete' : 'wrong');
  }, [r]);

  useEffect(() => {
    if (!ad) return;
    if (count <= 0) return;
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [ad, count]);

  useEffect(() => {
    if (!r) router.replace('/(tabs)/learn');
  }, [r, router]);

  if (!r) return null;
  const leave = () => router.replace('/(tabs)/learn');
  const retry = () => {
    if (r.kind === 'legendary' && r.unitId) router.replace(`/session?kind=legendary&id=${encodeURIComponent(r.unitId)}`);
    else leave();
  };

  return (
    <Screen>
      {r.passed ? <Celebration /> : null}
      <View style={{ flex: 1, justifyContent: 'center', gap: 18 }}>
        <Text style={{ fontSize: 72, textAlign: 'center' }}>{r.passed ? (r.kind === 'legendary' ? '👑' : r.perfect ? '🏆' : '🎉') : '💪'}</Text>
        <Text style={{ fontSize: 28, fontWeight: '900', color: r.passed ? '#FFC800' : '#4B4B4B', textAlign: 'center' }}>
          {r.passed ? (r.kind === 'legendary' ? 'Legendary!' : r.kind === 'jump' ? 'You jumped ahead!' : r.heartEarned ? 'Heart earned!' : 'Lesson complete!') : 'Not quite yet'}
        </Text>
        <Text style={{ textAlign: 'center', color: '#777', fontSize: 16 }}>{r.note ?? r.title}</Text>

        {r.passed ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Stat label="TOTAL XP" value={`${r.xp + r.bonusXp}`} color="#FFC800" emoji="⚡" />
            <Stat label="ACCURACY" value={`${Math.round(r.accuracy * 100)}%`} color="#58CC02" emoji="🎯" />
            {r.gems ? <Stat label="GEMS" value={`+${r.gems}`} color="#1CB0F6" emoji="💎" /> : null}
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Stat label="ACCURACY" value={`${Math.round(r.accuracy * 100)}%`} color="#FF4B4B" emoji="🎯" />
          </View>
        )}

        {r.bonusXp > 0 ? <Text style={{ textAlign: 'center', color: '#CE82FF', fontWeight: '800' }}>⚡ XP Boost bonus +{r.bonusXp}</Text> : null}
        {r.heartEarned ? <Text style={{ textAlign: 'center', color: '#FF4B4B', fontWeight: '800', fontSize: 18 }}>❤️ +1 heart</Text> : null}

        {r.streakExtended ? (
          <Card border="#FF9600" bg="#FFF4E0">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <StreakFlame size={44} />
              <View>
                <Text style={{ fontSize: 20, fontWeight: '900', color: '#FF9600' }}>{r.streakCount} day streak!</Text>
                <Text style={{ color: '#777' }}>You hit your daily goal. See you tomorrow.</Text>
              </View>
            </View>
          </Card>
        ) : null}
      </View>
      {r.passed ? <Button title="Continue" onPress={leave} /> : <Button title={r.kind === 'legendary' ? 'Try again' : 'Back to path'} onPress={retry} variant={r.passed ? 'green' : 'blue'} />}

      <Modal visible={ad} transparent animationType="fade" onRequestClose={() => count <= 0 && setAd(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20, gap: 12, alignItems: 'center' }}>
            <Text style={{ fontSize: 12, fontWeight: '900', color: '#777' }}>ADVERTISEMENT (placeholder)</Text>
            <View style={{ width: '100%', height: 200, backgroundColor: '#F0F0F0', borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 44 }}>📣</Text>
              <Text style={{ fontWeight: '800', color: '#777', marginTop: 6 }}>Interstitial ad slot</Text>
            </View>
            <Button title="Remove ads with Super" variant="purple" onPress={() => { setAd(false); router.push('/paywall?feature=ads'); }} style={{ alignSelf: 'stretch' }} />
            <Button title={count > 0 ? `Skip in ${count}` : 'Close ad'} variant="white" disabled={count > 0} onPress={() => setAd(false)} style={{ alignSelf: 'stretch' }} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
