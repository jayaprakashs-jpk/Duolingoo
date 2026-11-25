import React, { useEffect, useState } from 'react';
import { Alert, Switch, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import type { Tier } from '@/data/types';
import { addDays, dayKey } from '@/lib/date';
import { signOutAccount } from '@/services/account';
import { aiLabel, aiMode } from '@/services/ai';
import { TIER_LABEL } from '@/services/billing';
import { queueSize, resetLearningData } from '@/services/db';
import { isSupabaseConfigured } from '@/services/supabase';
import { flushQueue } from '@/services/sync';
import { useApp } from '@/store/app';
import { toast } from '@/store/ui';

const TIERS: { id: Tier; note: string }[] = [
  { id: 'free', note: '5 hearts, ads, no Practice Hub' },
  { id: 'super', note: 'Unlimited hearts, no ads, Practice Hub, offline packs, streak repair' },
  { id: 'family', note: 'Super + invite up to 5 family members' },
  { id: 'max', note: 'Super + AI video call + AI roleplay' },
];

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: '#4B4B4B' }}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: '#58CC02', false: '#E5E5E5' }} />
    </View>
  );
}

export default function Settings() {
  const router = useRouter();
  const tier = useApp((s) => s.tier);
  const setTier = useApp((s) => s.setTier);
  const settings = useApp((s) => s.settings);
  const setSetting = useApp((s) => s.setSetting);
  const email = useApp((s) => s.email);
  const [pending, setPending] = useState(0);
  const mode = aiMode();

  useEffect(() => {
    void queueSize().then(setPending).catch(() => {});
  }, []);

  const test = (label: string, fn: () => void) => <Button key={label} title={label} variant="white" small onPress={fn} style={{ marginBottom: 8 }} />;

  return (
    <Screen scroll>
      <ScreenHeader title="Settings" />

      <Text style={{ fontSize: 18, fontWeight: '900', color: '#4B4B4B', marginBottom: 6 }}>Subscription tier simulator</Text>
      <Text style={{ color: '#777', marginBottom: 10 }}>Switch plans instantly to test every perk. No real purchase.</Text>
      <View style={{ gap: 8 }}>
        {TIERS.map((t) => (
          <Card key={t.id} onPress={() => { setTier(t.id); toast(`Plan set to ${TIER_LABEL[t.id]}`, 'success'); }} border={tier === t.id ? '#CE82FF' : '#E5E5E5'} bg={tier === t.id ? '#FAF3FF' : '#fff'}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 3, borderColor: tier === t.id ? '#CE82FF' : '#CFCFCF', alignItems: 'center', justifyContent: 'center' }}>
                {tier === t.id ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#CE82FF' }} /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '900', color: '#4B4B4B', fontSize: 16 }}>{TIER_LABEL[t.id]}</Text>
                <Text style={{ color: '#777', fontSize: 13 }}>{t.note}</Text>
              </View>
            </View>
          </Card>
        ))}
      </View>

      <Text style={{ fontSize: 18, fontWeight: '900', color: '#4B4B4B', marginTop: 20, marginBottom: 6 }}>Preferences</Text>
      <Card>
        <Toggle label="Sound effects" value={settings.sound} onChange={(v) => setSetting('sound', v)} />
        <Toggle label="Haptic feedback" value={settings.haptics} onChange={(v) => setSetting('haptics', v)} />
        <Toggle label="Show translations" value={settings.showTranslations} onChange={(v) => setSetting('showTranslations', v)} />
      </Card>

      <Text style={{ fontSize: 18, fontWeight: '900', color: '#4B4B4B', marginTop: 20, marginBottom: 6 }}>Backend and AI</Text>
      <Card>
        <Text style={{ color: '#4B4B4B', lineHeight: 24 }}>
          Supabase: <Text style={{ fontWeight: '900' }}>{isSupabaseConfigured ? 'configured' : 'not configured (Guest Mode)'}</Text>
          {'\n'}Account: <Text style={{ fontWeight: '900' }}>{email ?? 'signed out'}</Text>
          {'\n'}Unsynced changes: <Text style={{ fontWeight: '900' }}>{pending}</Text>
          {'\n'}AI tutor: <Text style={{ fontWeight: '900' }}>{aiLabel(mode)}</Text>
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <Button
            title="Sync now"
            small
            variant="blue"
            style={{ flex: 1 }}
            onPress={async () => {
              const r = await flushQueue();
              setPending(r.pending);
              toast(r.skipped === 'guest' ? 'Sign in to sync (Guest Mode)' : r.skipped === 'no-backend' ? 'Add Supabase keys to enable sync' : r.skipped === 'offline' ? 'Offline. Will sync later.' : `Synced ${r.sent}, failed ${r.failed}`, 'info');
            }}
          />
          {email ? <Button title="Sign out" small variant="white" style={{ flex: 1 }} onPress={() => void signOutAccount()} /> : <Button title="Sign in" small variant="white" style={{ flex: 1 }} onPress={() => router.push('/auth')} />}
        </View>
      </Card>

      <Text style={{ fontSize: 18, fontWeight: '900', color: '#4B4B4B', marginTop: 20, marginBottom: 6 }}>Testing tools</Text>
      <Card>
        {test('+500 gems', () => useApp.getState().addGems(500))}
        {test('Earn 50 XP (hit your daily goal)', () => { useApp.getState().addXp(50); toast('+50 XP', 'success'); })}
        {test('Set hearts to 0 (test out-of-hearts)', () => { useApp.setState({ hearts: 0, heartsAt: Date.now() }); toast('Hearts set to 0'); })}
        {test('Simulate 2 missed days (test freeze / repair)', () => {
          const s = useApp.getState();
          const count = Math.max(s.streak.count, 5);
          useApp.setState({ streak: { ...s.streak, count, lastGoalDay: addDays(dayKey(), -3) } });
          s.refreshStreak();
          toast('Missed days simulated. Check the streak.', 'info');
        })}
        {test('Clear "Can\'t speak now" lock', () => useApp.setState({ cantSpeakUntil: 0 }))}
      </Card>

      <Text style={{ fontSize: 18, fontWeight: '900', color: '#4B4B4B', marginTop: 20, marginBottom: 6 }}>Data</Text>
      <Button
        title="Reset all progress"
        variant="red"
        onPress={() =>
          Alert.alert('Reset everything?', 'This deletes your progress, mistakes, words and downloads on this phone.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Reset',
              style: 'destructive',
              onPress: async () => {
                await resetLearningData().catch(() => {});
                useApp.getState().resetAll();
                router.replace('/onboarding');
              },
            },
          ])
        }
      />
      <Text style={{ color: '#AFAFAF', textAlign: 'center', marginTop: 16 }}>LinguaSpark {Constants.expoConfig?.version ?? '1.0.0'}</Text>
    </Screen>
  );
}
