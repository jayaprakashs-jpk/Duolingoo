import React from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SpeakerButton } from '@/components/SpeakerButton';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { useActiveCourse } from '@/hooks/useActiveCourse';

export default function Guidebook() {
  const { unit } = useLocalSearchParams<{ unit: string }>();
  const course = useActiveCourse();
  const u = course.units.find((x) => x.id === decodeURIComponent(unit ?? '')) ?? course.units[0];
  const vocab = u.lessons.flatMap((l) => l.vocab);
  return (
    <Screen scroll bg="#fff">
      <ScreenHeader title="Guidebook" />
      <View style={{ backgroundColor: u.color, borderRadius: 18, padding: 16, borderBottomWidth: 5, borderBottomColor: u.dark, marginBottom: 16 }}>
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '900', fontSize: 12, letterSpacing: 1 }}>{u.section.toUpperCase()}</Text>
        <Text style={{ color: '#fff', fontWeight: '900', fontSize: 24 }}>{u.title}</Text>
        <Text style={{ color: '#fff', marginTop: 6, lineHeight: 22 }}>{u.guidebook.intro}</Text>
      </View>

      <Text style={{ fontSize: 20, fontWeight: '900', color: '#4B4B4B', marginBottom: 8 }}>Grammar tips</Text>
      {u.guidebook.tips.map((t, i) => (
        <Card key={i} style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 17, fontWeight: '900', color: u.dark }}>{t.title}</Text>
          <Text style={{ color: '#4B4B4B', fontSize: 16, lineHeight: 24, marginTop: 4 }}>{t.body}</Text>
          {t.examples?.map((ex, j) => (
            <View key={j} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
              <SpeakerButton text={ex.t} lang={course.ttsLocale} size={38} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800', fontSize: 17, color: '#4B4B4B' }}>{ex.t}</Text>
                <Text style={{ color: '#777', fontSize: 15 }}>{ex.n}</Text>
              </View>
              <SpeakerButton text={ex.t} lang={course.ttsLocale} size={32} slow color="#58CC02" />
            </View>
          ))}
        </Card>
      ))}

      <Text style={{ fontSize: 20, fontWeight: '900', color: '#4B4B4B', marginTop: 8, marginBottom: 8 }}>Key vocabulary</Text>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {vocab.map((v, i) => (
          <View key={v.t + i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: '#EFEFEF', backgroundColor: i % 2 ? '#FAFAFA' : '#fff' }}>
            <SpeakerButton text={v.t} lang={course.ttsLocale} size={34} />
            <Text style={{ width: 28, fontSize: 20 }}>{v.e ?? ''}</Text>
            <Text style={{ flex: 1, fontWeight: '800', color: '#4B4B4B', fontSize: 16 }}>{v.t}</Text>
            <Text style={{ flex: 1, color: '#777', fontSize: 15, textAlign: 'right' }}>{v.n}</Text>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
