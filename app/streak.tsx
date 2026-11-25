import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StreakFlame } from '@/components/StreakFlame';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { STREAK_MILESTONES } from '@/lib/constants';
import { dayKey, daysInMonth } from '@/lib/date';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useApp } from '@/store/app';

export default function StreakScreen() {
  const streak = useApp((s) => s.streak);
  const dayXp = useApp((s) => s.dayXp);
  const goal = useApp((s) => s.dailyGoal);
  const e = useEntitlements();
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
  const days = daysInMonth(now.getFullYear(), now.getMonth());
  const today = dayKey();
  const cells = useMemo(() => {
    const out: (number | null)[] = Array.from({ length: (first + 6) % 7 }, () => null);
    for (let d = 1; d <= days; d++) out.push(d);
    return out;
  }, [first, days]);
  const key = (d: number) => dayKey(new Date(now.getFullYear(), now.getMonth(), d));
  const label = now.toLocaleString('en', { month: 'long', year: 'numeric' });

  return (
    <Screen scroll>
      <ScreenHeader title="Streak" />
      <Card border="#FF9600" bg="#FFF4E0" style={{ alignItems: 'center', gap: 4 }}>
        <StreakFlame size={64} lit={streak.lastGoalDay === today} />
        <Text style={{ fontSize: 40, fontWeight: '900', color: '#FF9600' }}>{streak.count}</Text>
        <Text style={{ color: '#777', fontWeight: '700' }}>day streak · best {streak.best}</Text>
        <Text style={{ color: '#777', marginTop: 4 }}>Goal: {goal} XP a day · today {dayXp[today] ?? 0} XP</Text>
      </Card>

      <Text style={{ fontSize: 18, fontWeight: '900', color: '#4B4B4B', marginTop: 18, marginBottom: 8 }}>{label}</Text>
      <Card>
        <View style={{ flexDirection: 'row' }}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <Text key={i} style={{ flex: 1, textAlign: 'center', color: '#AFAFAF', fontWeight: '800' }}>{d}</Text>
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
          {cells.map((d, i) => {
            if (d === null) return <View key={i} style={{ width: `${100 / 7}%`, height: 44 }} />;
            const kind = streak.goalDays[key(d)];
            const isToday = key(d) === today;
            const bg = kind === 'goal' ? '#FF9600' : kind === 'freeze' ? '#84D8FF' : kind === 'repair' ? '#CE82FF' : 'transparent';
            return (
              <View key={i} style={{ width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', borderWidth: isToday ? 2 : 0, borderColor: '#1CB0F6' }}>
                  <Text style={{ color: kind ? '#fff' : '#4B4B4B', fontWeight: '800' }}>{kind === 'freeze' ? '🧊' : d}</Text>
                </View>
              </View>
            );
          })}
        </View>
        <Text style={{ color: '#777', fontSize: 12, marginTop: 8 }}>🟠 goal met   🧊 freeze used   🟣 repaired</Text>
      </Card>

      <Card style={{ marginTop: 14 }}>
        <Text style={{ fontWeight: '900', color: '#4B4B4B', fontSize: 17 }}>🧊 Streak Freezes: {streak.freezes}/2 equipped</Text>
        <Text style={{ color: '#777', marginTop: 4 }}>A freeze protects one missed day. Buy them in the shop.</Text>
        <Text style={{ color: '#777', marginTop: 8 }}>
          🔧 Monthly streak repair: {e.streakRepair ? (streak.repairMonth === dayKey().slice(0, 7) ? 'used this month' : 'ready (automatic)') : 'Super feature'}
        </Text>
      </Card>

      <Text style={{ fontSize: 18, fontWeight: '900', color: '#4B4B4B', marginTop: 18, marginBottom: 8 }}>Streak Society</Text>
      {STREAK_MILESTONES.map((m) => {
        const got = streak.milestones.includes(m.days);
        return (
          <Card key={m.days} style={{ marginBottom: 10, opacity: got ? 1 : 0.7 }} border={got ? '#FFC800' : '#E5E5E5'}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 32 }}>{got ? '🏅' : '🔒'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '900', color: '#4B4B4B', fontSize: 16 }}>{m.title}</Text>
                <Text style={{ color: '#777' }}>{m.days} day streak · +{m.gems} gems</Text>
              </View>
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}
