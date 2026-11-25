import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StreakFlame } from '@/components/StreakFlame';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LEAGUES } from '@/data/league';
import { useActiveCourse } from '@/hooks/useActiveCourse';
import { useEntitlements } from '@/hooks/useEntitlements';
import { DAILY_GOALS } from '@/lib/constants';
import { TIER_LABEL } from '@/services/billing';
import { isSupabaseConfigured } from '@/services/supabase';
import { useApp } from '@/store/app';

function Row({ icon, title, sub, onPress, tag }: { icon: string; title: string; sub?: string; onPress: () => void; tag?: string }) {
  return (
    <Card onPress={onPress}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={{ fontSize: 28 }}>{icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '900', color: '#4B4B4B', fontSize: 16 }}>{title}</Text>
          {sub ? <Text style={{ color: '#777', fontSize: 13 }}>{sub}</Text> : null}
        </View>
        {tag ? (
          <View style={{ backgroundColor: '#CE82FF', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 11 }}>{tag}</Text>
          </View>
        ) : null}
        <Text style={{ color: '#AFAFAF', fontSize: 22 }}>›</Text>
      </View>
    </Card>
  );
}

export default function Profile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const course = useActiveCourse();
  const name = useApp((s) => s.displayName);
  const email = useApp((s) => s.email);
  const xp = useApp((s) => s.xp);
  const streak = useApp((s) => s.streak);
  const league = useApp((s) => s.league);
  const goal = useApp((s) => s.dailyGoal);
  const setGoal = useApp((s) => s.setDailyGoal);
  const e = useEntitlements();

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 30 }}>
        <View style={{ alignItems: 'center', gap: 4, paddingVertical: 8 }}>
          <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: '#DDF4FF', alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#84D8FF' }}>
            <Text style={{ fontSize: 52 }}>😀</Text>
          </View>
          <Text style={{ fontSize: 26, fontWeight: '900', color: '#4B4B4B' }}>{name}</Text>
          <Text style={{ color: '#777' }}>{email ?? 'Guest mode · progress saved on this phone'}</Text>
          <View style={{ backgroundColor: e.isPaid ? '#CE82FF' : '#E5E5E5', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 3, marginTop: 4 }}>
            <Text style={{ color: e.isPaid ? '#fff' : '#777', fontWeight: '900' }}>{TIER_LABEL[e.tier]}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Card style={{ flex: 1, alignItems: 'center' }}>
            <StreakFlame size={26} lit={streak.count > 0} />
            <Text style={{ fontWeight: '900', fontSize: 20, color: '#FF9600' }}>{streak.count}</Text>
            <Text style={{ color: '#777', fontSize: 12 }}>day streak</Text>
          </Card>
          <Card style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 26 }}>⚡</Text>
            <Text style={{ fontWeight: '900', fontSize: 20, color: '#FFC800' }}>{xp}</Text>
            <Text style={{ color: '#777', fontSize: 12 }}>total XP</Text>
          </Card>
          <Card style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 26 }}>{LEAGUES[league.tier].emoji}</Text>
            <Text style={{ fontWeight: '900', fontSize: 16, color: '#4B4B4B' }}>{LEAGUES[league.tier].name}</Text>
            <Text style={{ color: '#777', fontSize: 12 }}>league</Text>
          </Card>
        </View>

        {!e.isPaid ? <Button title="Try Super" variant="purple" onPress={() => router.push('/paywall')} /> : null}

        <Text style={{ fontWeight: '900', color: '#4B4B4B', fontSize: 18, marginTop: 6 }}>Daily goal</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {DAILY_GOALS.map((g) => (
            <Card key={g.id} onPress={() => setGoal(g.xp)} border={goal === g.xp ? '#84D8FF' : '#E5E5E5'} bg={goal === g.xp ? '#DDF4FF' : '#fff'} style={{ flex: 1, padding: 8, alignItems: 'center' }}>
              <Text style={{ fontWeight: '900', color: '#4B4B4B', fontSize: 13 }}>{g.label}</Text>
              <Text style={{ color: '#FF9600', fontWeight: '900' }}>{g.xp}</Text>
            </Card>
          ))}
        </View>

        <Text style={{ fontWeight: '900', color: '#4B4B4B', fontSize: 18, marginTop: 6 }}>More</Text>
        <Row icon="🌍" title="My courses" sub={course.title} onPress={() => router.push('/courses')} />
        <Row icon="🔥" title="Streak calendar" sub={`${streak.freezes}/2 freezes equipped`} onPress={() => router.push('/streak')} />
        <Row icon="🛒" title="Shop" sub="Freezes, refills, boosts" onPress={() => router.push('/shop')} />
        {e.familyPlan ? <Row icon="👨‍👩‍👧‍👦" title="Family plan" sub="Invite up to 5 members" onPress={() => router.push('/family')} /> : <Row icon="👨‍👩‍👧‍👦" title="Super Family" sub="Share one plan with 5 people" tag="FAMILY" onPress={() => router.push(e.familyPlan ? '/family' : '/paywall?feature=family')} />}
        <Row icon="🛠️" title="Curriculum Studio" sub="Import courses from JSON" onPress={() => router.push('/studio')} />
        <Row icon="⬇️" title="Offline packs" sub="Download units for airplane mode" onPress={() => router.push(e.offlinePacks ? '/packs' : '/paywall?feature=offline')} />
        <Row icon="⚙️" title="Settings" sub="Subscription simulator, sound, backend" onPress={() => router.push('/settings')} />
        {!email ? <Row icon="☁️" title={isSupabaseConfigured ? 'Sign in to sync' : 'Cloud sync (not configured)'} sub={isSupabaseConfigured ? 'Back up progress and join real leagues' : 'Add Supabase keys to enable'} onPress={() => router.push('/auth')} /> : null}
      </ScrollView>
    </View>
  );
}
