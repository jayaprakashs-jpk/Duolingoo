import React, { useEffect, useState } from 'react';
import { Share, Switch, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { LockedPanel } from '@/components/LockedPanel';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StreakFlame } from '@/components/StreakFlame';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { useEntitlements } from '@/hooks/useEntitlements';
import { createFamily, isRealFamily, joinFamilyByCode, refreshFamilyMembers } from '@/services/family';
import { useApp } from '@/store/app';
import { toast } from '@/store/ui';

export default function Family() {
  const e = useEntitlements();
  const family = useApp((s) => s.family);
  const name = useApp((s) => s.displayName);
  const streak = useApp((s) => s.streak.count);
  const xp = useApp((s) => s.xp);
  const toggle = useApp((s) => s.toggleFamilyMember);
  const remove = useApp((s) => s.removeFamilyMember);
  const [code, setCode] = useState('');
  const real = isRealFamily();

  useEffect(() => {
    if (!e.familyPlan) return;
    void createFamily().then(refreshFamilyMembers);
  }, [e.familyPlan]);

  if (!e.familyPlan)
    return (
      <Screen scroll>
        <ScreenHeader title="Family plan" />
        <LockedPanel title="Super Family" body="One plan for up to 6 people. Invite family with a code and cheer on each other's streaks." feature="family" plan="Super Family" />
      </Screen>
    );

  const members = family?.members ?? [];
  const share = () => Share.share({ message: `Join my LinguaSpark family plan! Open Profile > Family > Join and enter code ${family?.code}` });

  return (
    <Screen scroll>
      <ScreenHeader title="Family plan" />
      <Card border="#1CB0F6" bg="#F2FBFF" style={{ alignItems: 'center', gap: 6 }}>
        <Text style={{ color: '#777', fontWeight: '800' }}>YOUR INVITE CODE</Text>
        <Text style={{ fontSize: 40, fontWeight: '900', letterSpacing: 8, color: '#1899D6' }}>{family?.code ?? '······'}</Text>
        <View style={{ flexDirection: 'row', gap: 8, alignSelf: 'stretch' }}>
          <Button title="Copy" small variant="white" style={{ flex: 1 }} onPress={async () => { await Clipboard.setStringAsync(family?.code ?? ''); toast('Code copied', 'success'); }} />
          <Button title="Share" small variant="blue" style={{ flex: 1 }} onPress={() => void share()} />
        </View>
        <Text style={{ color: '#777', fontSize: 13 }}>{members.length}/5 member slots used</Text>
      </Card>

      {!real ? (
        <Card border="#FF9600" bg="#FFF4E0" style={{ marginTop: 12 }}>
          <Text style={{ color: '#CC7800', fontWeight: '800' }}>Guest Mode: members you add are simulated</Text>
          <Text style={{ color: '#777', marginTop: 2 }}>Sign in with Supabase configured to invite real family members.</Text>
        </Card>
      ) : null}

      <Text style={{ fontSize: 18, fontWeight: '900', color: '#4B4B4B', marginTop: 18, marginBottom: 8 }}>Members</Text>
      <View style={{ gap: 10 }}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ fontSize: 34 }}>😀</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '900', color: '#4B4B4B', fontSize: 16 }}>{name} (you, owner)</Text>
              <Text style={{ color: '#777' }}>⚡ {xp} XP</Text>
            </View>
            <StreakFlame size={20} />
            <Text style={{ fontWeight: '900', color: '#FF9600' }}>{streak}</Text>
          </View>
        </Card>
        {members.map((m) => (
          <Card key={m.id} style={{ opacity: m.active ? 1 : 0.55 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 34 }}>{m.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '900', color: '#4B4B4B', fontSize: 16 }}>
                  {m.name}
                  {m.simulated ? ' (demo)' : ''}
                </Text>
                <Text style={{ color: '#777' }}>⚡ {m.xp} XP · 🔥 {m.streak} days</Text>
              </View>
              <Switch value={m.active} onValueChange={() => toggle(m.id)} trackColor={{ true: '#58CC02', false: '#E5E5E5' }} />
            </View>
            <Button title="Remove" variant="white" small style={{ marginTop: 8 }} onPress={() => remove(m.id)} />
          </Card>
        ))}
        {Array.from({ length: Math.max(0, 5 - members.length) }).map((_, i) => (
          <Card key={`empty-${i}`} style={{ opacity: 0.6, borderStyle: 'dashed' }}>
            <Text style={{ color: '#AFAFAF', fontWeight: '800', textAlign: 'center' }}>＋ Open slot</Text>
          </Card>
        ))}
      </View>

      <Text style={{ fontSize: 18, fontWeight: '900', color: '#4B4B4B', marginTop: 18, marginBottom: 8 }}>Join someone else's family</Text>
      <TextInput
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase().slice(0, 6))}
        placeholder="6-character code"
        placeholderTextColor="#AFAFAF"
        autoCapitalize="characters"
        style={{ borderWidth: 2, borderColor: '#E5E5E5', borderRadius: 14, padding: 14, fontSize: 22, letterSpacing: 6, textAlign: 'center', backgroundColor: '#F7F7F7', color: '#4B4B4B' }}
      />
      <Button
        title="Join"
        style={{ marginTop: 10 }}
        disabled={code.length !== 6}
        onPress={async () => {
          const r = await joinFamilyByCode(code);
          if (r.ok) {
            toast(real ? 'Joined!' : 'Demo member added', 'success');
            setCode('');
            void refreshFamilyMembers();
          } else toast(r.error ?? 'Could not join', 'warn');
        }}
      />
    </Screen>
  );
}
