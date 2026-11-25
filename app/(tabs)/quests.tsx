import React, { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TopBar } from '@/components/TopBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useNow } from '@/hooks/useNow';
import { dayKey, formatCountdown, weekId } from '@/lib/date';
import { play } from '@/services/sound';
import { emptyDaily, friendQuest, MONTHLY_GOAL, questsForDay } from '@/services/quests';
import { useApp } from '@/store/app';
import { toast } from '@/store/ui';

export default function Quests() {
  const insets = useSafeAreaInsets();
  const now = useNow(1000);
  const daily = useApp((s) => s.daily);
  const goal = useApp((s) => s.dailyGoal);
  const dayXp = useApp((s) => s.dayXp[dayKey()] ?? 0);
  const monthly = useApp((s) => s.monthly);
  const league = useApp((s) => s.league);
  const claimedWeek = useApp((s) => s.friendClaimedWeek);
  const claimQuest = useApp((s) => s.claimQuest);
  const claimFriend = useApp((s) => s.claimFriendQuest);

  const today = dayKey();
  const d = daily.day === today ? daily : emptyDaily(today);
  const quests = useMemo(() => questsForDay(today), [today]);
  const wk = weekId();
  const f = friendQuest(wk, league.weekId === wk ? league.weeklyXp : 0, now);
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  const monthDone = monthly.month === dayKey().slice(0, 7) ? monthly.lessons : 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top }}>
      <TopBar />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 30 }}>
        <Text style={{ fontSize: 26, fontWeight: '900', color: '#4B4B4B' }}>Quests</Text>

        <Card border="#FFC800" bg="#FFFBEA">
          <Text style={{ fontWeight: '900', color: '#4B4B4B', fontSize: 17 }}>⚡ Daily goal</Text>
          <View style={{ marginVertical: 8 }}>
            <ProgressBar value={dayXp / goal} color="#FFC800" height={18} />
          </View>
          <Text style={{ color: '#777', fontWeight: '700' }}>
            {Math.min(dayXp, goal)} / {goal} XP{dayXp >= goal ? ' · goal reached 🎉' : ''}
          </Text>
        </Card>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#4B4B4B' }}>Daily quests</Text>
          <Text style={{ color: '#FF9600', fontWeight: '800' }}>⏳ {formatCountdown(midnight.getTime() - now)}</Text>
        </View>
        {quests.map((q) => {
          const val = Math.min(d[q.metric] as number, q.goal);
          const claimed = d.claimed.includes(q.id);
          const ready = val >= q.goal && !claimed;
          return (
            <Card key={q.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text style={{ fontSize: 30 }}>{q.icon}</Text>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={{ fontWeight: '900', color: '#4B4B4B', fontSize: 16 }}>{q.title}</Text>
                  <ProgressBar value={val / q.goal} height={12} color={claimed ? '#AFAFAF' : '#58CC02'} />
                  <Text style={{ color: '#777', fontSize: 13 }}>
                    {val}/{q.goal} · reward 💎 {q.gems}
                  </Text>
                </View>
                {ready ? (
                  <Button
                    title="Claim"
                    small
                    variant="gold"
                    onPress={() => {
                      if (claimQuest(q.id)) {
                        void play('gem');
                        toast(`+${q.gems} gems!`, 'success');
                      }
                    }}
                  />
                ) : claimed ? (
                  <Text style={{ fontSize: 24 }}>✅</Text>
                ) : null}
              </View>
            </Card>
          );
        })}

        <Text style={{ fontSize: 20, fontWeight: '900', color: '#4B4B4B', marginTop: 6 }}>Friend quest</Text>
        <Card border="#CE82FF" bg="#FAF3FF">
          <Text style={{ fontWeight: '900', color: '#4B4B4B', fontSize: 16 }}>🤝 Earn {f.target} XP together with {f.partner} this week</Text>
          <View style={{ marginVertical: 10 }}>
            <ProgressBar value={(f.myXp + f.partnerXp) / f.target} color="#CE82FF" height={14} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: '#4B4B4B', fontWeight: '700' }}>😀 You {f.myXp} XP</Text>
            <Text style={{ color: '#4B4B4B', fontWeight: '700' }}>{f.partnerAvatar} {f.partner} {f.partnerXp} XP</Text>
          </View>
          {f.done && claimedWeek !== wk ? (
            <Button title={`Claim ${f.gems} gems`} variant="purple" small style={{ marginTop: 10 }} onPress={() => claimFriend() && toast(`+${f.gems} gems!`, 'success')} />
          ) : claimedWeek === wk ? (
            <Text style={{ color: '#58A700', fontWeight: '800', marginTop: 8 }}>✅ Claimed this week</Text>
          ) : null}
          <Text style={{ color: '#AFAFAF', fontSize: 12, marginTop: 8 }}>Partner progress is simulated until friends are connected through your Supabase backend.</Text>
        </Card>

        <Text style={{ fontSize: 20, fontWeight: '900', color: '#4B4B4B', marginTop: 6 }}>Monthly challenge</Text>
        <Card border="#1CB0F6" bg="#F2FBFF">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Text style={{ fontSize: 46, opacity: monthDone >= MONTHLY_GOAL ? 1 : 0.4 }}>🏅</Text>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ fontWeight: '900', color: '#4B4B4B', fontSize: 16 }}>Complete {MONTHLY_GOAL} lessons this month</Text>
              <ProgressBar value={monthDone / MONTHLY_GOAL} color="#1CB0F6" height={14} />
              <Text style={{ color: '#777' }}>
                {Math.min(monthDone, MONTHLY_GOAL)}/{MONTHLY_GOAL} · earn the {new Date().toLocaleString('en', { month: 'long' })} badge
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}
