import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Celebration } from '@/components/Celebration';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Screen } from '@/components/ui/Screen';
import { play } from '@/services/sound';
import { useActiveCourse } from '@/hooks/useActiveCourse';
import { useSessionStore } from '@/store/session';

function Meter({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card style={{ flex: 1, alignItems: 'center', gap: 6 }}>
      <Text style={{ fontSize: 30, fontWeight: '900', color }}>{value}</Text>
      <ProgressBar value={value / 100} color={color} height={10} />
      <Text style={{ color: '#777', fontWeight: '800', fontSize: 12 }}>{label}</Text>
    </Card>
  );
}

export default function RoleplayResult() {
  const router = useRouter();
  const g = useSessionStore((s) => s.roleplayGrade);
  const course = useActiveCourse();
  const rp = course.roleplays.find((r) => r.id === g?.roleplayId);
  useEffect(() => {
    if (!g) router.replace('/(tabs)/learn');
    else void play('complete');
  }, [g, router]);
  if (!g) return null;
  const grade = g.accuracy >= 90 ? 'A' : g.accuracy >= 75 ? 'B' : g.accuracy >= 55 ? 'C' : 'D';
  return (
    <Screen scroll>
      {g.accuracy >= 75 ? <Celebration count={18} /> : null}
      <View style={{ alignItems: 'center', gap: 4, marginBottom: 14 }}>
        <Text style={{ fontSize: 64 }}>{rp?.emoji ?? '🎭'}</Text>
        <Text style={{ fontSize: 24, fontWeight: '900', color: '#4B4B4B', textAlign: 'center' }}>{g.title}</Text>
        <Text style={{ fontSize: 44, fontWeight: '900', color: '#CE82FF' }}>Grade {grade}</Text>
        <Text style={{ color: '#777' }}>⚡ +{g.xp} XP · {g.mode === 'ai' ? 'cloud AI' : 'offline tutor'}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
        <Meter label="ACCURACY" value={g.accuracy} color="#58CC02" />
        <Meter label="FLUENCY" value={g.fluency} color="#1CB0F6" />
      </View>

      <Text style={{ fontSize: 19, fontWeight: '900', color: '#4B4B4B', marginBottom: 8 }}>Goals ({g.goalsDone.length}/{g.goalsTotal})</Text>
      <Card style={{ marginBottom: 14, gap: 6 }}>
        {rp?.goals.map((x) => (
          <Text key={x.id} style={{ fontSize: 16, color: g.goalsDone.includes(x.id) ? '#58A700' : '#AFAFAF', fontWeight: '700' }}>
            {g.goalsDone.includes(x.id) ? '✅' : '⬜'} {x.text}
          </Text>
        ))}
      </Card>

      <Text style={{ fontSize: 19, fontWeight: '900', color: '#4B4B4B', marginBottom: 8 }}>Fluency tips</Text>
      <View style={{ gap: 8, marginBottom: 14 }}>
        {g.tips.map((t, i) => (
          <Card key={i} border="#84D8FF" bg="#F2FBFF">
            <Text style={{ color: '#4B4B4B', lineHeight: 22 }}>💡 {t}</Text>
          </Card>
        ))}
      </View>

      {g.better.length ? (
        <>
          <Text style={{ fontSize: 19, fontWeight: '900', color: '#4B4B4B', marginBottom: 8 }}>Better phrasing</Text>
          <View style={{ gap: 8, marginBottom: 18 }}>
            {g.better.map((b, i) => (
              <Card key={i}>
                <Text style={{ color: '#777', fontSize: 13 }}>You said</Text>
                <Text style={{ color: '#EA2B2B', fontWeight: '700' }}>“{b.said}”</Text>
                <Text style={{ color: '#777', fontSize: 13, marginTop: 6 }}>Try</Text>
                <Text style={{ color: '#58A700', fontWeight: '900', fontSize: 16 }}>{b.better}</Text>
              </Card>
            ))}
          </View>
        </>
      ) : null}

      <View style={{ gap: 10 }}>
        <Button title="Try again" variant="purple" onPress={() => router.replace(`/roleplay?id=${encodeURIComponent(g.roleplayId)}`)} />
        <Button title="Done" onPress={() => router.replace('/(tabs)/learn')} />
      </View>
    </Screen>
  );
}
