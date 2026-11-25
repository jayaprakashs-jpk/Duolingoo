import React, { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { DAILY_GOALS } from '@/lib/constants';
import { useApp } from '@/store/app';
import { useCatalog } from '@/store/catalog';

export default function Onboarding() {
  const router = useRouter();
  const courses = useCatalog((s) => s.courses);
  const complete = useApp((s) => s.completeOnboarding);
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const natives = useMemo(() => Array.from(new Map(courses.map((c) => [c.nativeLang, c.nativeName])).entries()), [courses]);
  const [nativeLang, setNative] = useState(natives[0]?.[0] ?? 'ta');
  const targets = courses.filter((c) => c.nativeLang === nativeLang);
  const [courseId, setCourseId] = useState(targets[0]?.id ?? courses[0].id);
  const [goal, setGoal] = useState(20);

  const chosen = courses.find((c) => c.id === courseId) ?? targets[0] ?? courses[0];
  const finish = (placement: boolean) => {
    complete({ name: name.trim() || 'Learner', nativeLang: chosen.nativeLang, targetLang: chosen.targetLang, courseId: chosen.id, dailyGoal: goal });
    router.replace(placement ? '/placement' : '/(tabs)/learn');
  };

  return (
    <Screen scroll>
      <ProgressBar value={(step + 1) / 4} />
      <View style={{ height: 24 }} />

      {step === 0 && (
        <View style={{ gap: 16 }}>
          <Text style={{ fontSize: 64, textAlign: 'center' }}>💬⚡</Text>
          <Text style={{ fontSize: 30, fontWeight: '900', color: '#58CC02', textAlign: 'center' }}>LinguaSpark</Text>
          <Text style={{ fontSize: 18, color: '#777', textAlign: 'center', lineHeight: 26 }}>
            Learn a language in small, playable lessons. Works offline. No account needed.
          </Text>
          <Text style={{ fontWeight: '800', color: '#4B4B4B', marginTop: 12 }}>What should we call you?</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Your name (optional)"
            placeholderTextColor="#AFAFAF"
            style={{ borderWidth: 2, borderColor: '#E5E5E5', borderRadius: 16, padding: 14, fontSize: 18, backgroundColor: '#F7F7F7', color: '#4B4B4B' }}
          />
          <Button title="Get started" onPress={() => setStep(1)} />
          <Button title="I already have an account" variant="white" onPress={() => router.push('/auth')} />
        </View>
      )}

      {step === 1 && (
        <View style={{ gap: 14 }}>
          <Text style={{ fontSize: 26, fontWeight: '900', color: '#4B4B4B' }}>I speak...</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {natives.map(([code, label]) => (
              <Pressable
                key={code}
                onPress={() => {
                  setNative(code);
                  const first = courses.find((c) => c.nativeLang === code);
                  if (first) setCourseId(first.id);
                }}
                style={{ paddingVertical: 12, paddingHorizontal: 18, borderRadius: 16, borderWidth: 2, borderBottomWidth: 4, borderColor: nativeLang === code ? '#84D8FF' : '#E5E5E5', backgroundColor: nativeLang === code ? '#DDF4FF' : '#fff' }}
              >
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#4B4B4B' }}>{label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={{ fontSize: 26, fontWeight: '900', color: '#4B4B4B', marginTop: 8 }}>I want to learn...</Text>
          {targets.map((c) => (
            <Card key={c.id} onPress={() => setCourseId(c.id)} border={courseId === c.id ? '#84D8FF' : '#E5E5E5'} bg={courseId === c.id ? '#DDF4FF' : '#fff'}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text style={{ fontSize: 40 }}>{c.flag}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#4B4B4B' }}>{c.targetName}</Text>
                  <Text style={{ color: '#777' }}>{c.title}</Text>
                </View>
              </View>
            </Card>
          ))}
          <Button title="Continue" onPress={() => setStep(2)} />
        </View>
      )}

      {step === 2 && (
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 26, fontWeight: '900', color: '#4B4B4B' }}>What is your daily goal?</Text>
          {DAILY_GOALS.map((g) => (
            <Card key={g.id} onPress={() => setGoal(g.xp)} border={goal === g.xp ? '#84D8FF' : '#E5E5E5'} bg={goal === g.xp ? '#DDF4FF' : '#fff'}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontSize: 19, fontWeight: '900', color: '#4B4B4B' }}>{g.label}</Text>
                  <Text style={{ color: '#777' }}>{g.note}</Text>
                </View>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#FF9600' }}>{g.xp} XP / day</Text>
              </View>
            </Card>
          ))}
          <Button title="Continue" onPress={() => setStep(3)} />
        </View>
      )}

      {step === 3 && (
        <View style={{ gap: 14 }}>
          <Text style={{ fontSize: 26, fontWeight: '900', color: '#4B4B4B' }}>How much {chosen.targetName} do you know?</Text>
          <Card onPress={() => finish(false)}>
            <Text style={{ fontSize: 19, fontWeight: '900', color: '#4B4B4B' }}>🌱 I am new</Text>
            <Text style={{ color: '#777', marginTop: 2 }}>Start from the very first lesson.</Text>
          </Card>
          <Card onPress={() => finish(true)}>
            <Text style={{ fontSize: 19, fontWeight: '900', color: '#4B4B4B' }}>🎯 Find my level</Text>
            <Text style={{ color: '#777', marginTop: 2 }}>A 5 question placement test unlocks the right lessons.</Text>
          </Card>
        </View>
      )}
    </Screen>
  );
}
