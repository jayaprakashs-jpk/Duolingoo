import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { useSessionStore } from '@/store/session';

export default function CallSummary() {
  const router = useRouter();
  const s = useSessionStore((x) => x.callSummary);
  useEffect(() => {
    if (!s) router.replace('/(tabs)/learn');
  }, [s, router]);
  if (!s) return null;
  const mins = Math.floor(s.seconds / 60);
  const secs = s.seconds % 60;
  return (
    <Screen scroll>
      <View style={{ alignItems: 'center', gap: 4, marginBottom: 14 }}>
        <Text style={{ fontSize: 56 }}>📞</Text>
        <Text style={{ fontSize: 26, fontWeight: '900', color: '#4B4B4B' }}>Call with {s.persona} finished</Text>
        <Text style={{ color: '#777' }}>
          {mins}m {secs}s · you spoke {s.turns} time{s.turns === 1 ? '' : 's'} · {s.mode === 'ai' ? 'cloud AI' : 'offline tutor'}
        </Text>
      </View>

      <Text style={{ fontSize: 19, fontWeight: '900', color: '#4B4B4B', marginBottom: 8 }}>Words you used</Text>
      <Card style={{ marginBottom: 14 }}>
        {s.vocab.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {s.vocab.map((v) => (
              <View key={v.t} style={{ backgroundColor: '#E7FFD1', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }}>
                <Text style={{ fontWeight: '800', color: '#58A700' }}>
                  {v.t} <Text style={{ fontWeight: '500', color: '#777' }}>· {v.n}</Text>
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={{ color: '#777' }}>No course words yet. Try using words from your lessons next time.</Text>
        )}
      </Card>

      <Text style={{ fontSize: 19, fontWeight: '900', color: '#4B4B4B', marginBottom: 8 }}>Corrections</Text>
      <View style={{ gap: 10, marginBottom: 14 }}>
        {s.corrections.length ? (
          s.corrections.map((c, i) => (
            <Card key={i} border="#FFC800" bg="#FFFBEA">
              <Text style={{ color: '#777' }}>You said</Text>
              <Text style={{ fontWeight: '800', color: '#EA2B2B', fontSize: 16 }}>“{c.said}”</Text>
              <Text style={{ color: '#4B4B4B', marginTop: 6 }}>{c.hint}</Text>
              <Text style={{ fontWeight: '800', color: '#58A700', marginTop: 4 }}>Try: {c.better}</Text>
            </Card>
          ))
        ) : (
          <Card>
            <Text style={{ color: '#58A700', fontWeight: '800' }}>{s.turns ? 'No common mistakes spotted. Nice!' : 'Say something next time so I can check it.'}</Text>
          </Card>
        )}
      </View>

      <Text style={{ fontSize: 19, fontWeight: '900', color: '#4B4B4B', marginBottom: 8 }}>Transcript</Text>
      <Card style={{ gap: 6, marginBottom: 18 }}>
        {s.transcript.map((t, i) => (
          <Text key={i} style={{ color: t.who === 'you' ? '#1899D6' : '#4B4B4B', lineHeight: 22 }}>
            <Text style={{ fontWeight: '900' }}>{t.who === 'you' ? 'You' : s.persona}: </Text>
            {t.text}
          </Text>
        ))}
      </Card>
      <View style={{ gap: 10 }}>
        <Button title="Call again" variant="purple" onPress={() => router.replace('/video-call')} />
        <Button title="Done" onPress={() => router.replace('/(tabs)/learn')} />
      </View>
    </Screen>
  );
}
