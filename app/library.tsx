import React, { useEffect, useMemo, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LockedPanel } from '@/components/LockedPanel';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SpeakerButton } from '@/components/SpeakerButton';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Screen } from '@/components/ui/Screen';
import { useActiveCourse } from '@/hooks/useActiveCourse';
import { useEntitlements } from '@/hooks/useEntitlements';
import { normalize } from '@/lib/text';
import { getWords, type WordRow } from '@/services/db';
import { useApp } from '@/store/app';
import { Press } from '@/components/ui/Press';

export default function Library() {
  const router = useRouter();
  const course = useActiveCourse();
  const e = useEntitlements();
  const saved = useApp((s) => s.savedStories);
  const [tab, setTab] = useState<'words' | 'stories'>('words');
  const [q, setQ] = useState('');
  const [words, setWords] = useState<WordRow[]>([]);

  useEffect(() => {
    void getWords(course.id).then(setWords).catch(() => {});
  }, [course.id]);

  const shown = useMemo(() => {
    const n = normalize(q);
    return words
      .filter((w) => !n || normalize(w.target).includes(n) || normalize(w.native).includes(n))
      .sort((a, b) => a.mastery - b.mastery);
  }, [words, q]);

  const stories = course.units.map((u) => u.story).filter((s) => saved.includes(s.id));

  if (!e.practiceHub)
    return (
      <Screen scroll>
        <ScreenHeader title="Library" />
        <LockedPanel title="Library is a Super perk" body="Search every word you have learned with mastery bars, and replay stories you finished." feature="practice" />
      </Screen>
    );

  return (
    <Screen scroll>
      <ScreenHeader title="Library" />
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        {(['words', 'stories'] as const).map((t) => (
          <Press key={t} onPress={() => setTab(t)} style={{ flex: 1, padding: 12, borderRadius: 14, borderWidth: 2, borderBottomWidth: 4, borderColor: tab === t ? '#84D8FF' : '#E5E5E5', backgroundColor: tab === t ? '#DDF4FF' : '#fff', alignItems: 'center' }}>
            <Text style={{ fontWeight: '900', color: '#4B4B4B' }}>{t === 'words' ? `Words (${words.length})` : `Stories (${stories.length})`}</Text>
          </Press>
        ))}
      </View>

      {tab === 'words' ? (
        <>
          <TextInput value={q} onChangeText={setQ} placeholder="Search words" placeholderTextColor="#AFAFAF" style={{ borderWidth: 2, borderColor: '#E5E5E5', borderRadius: 14, padding: 12, fontSize: 16, backgroundColor: '#F7F7F7', marginBottom: 12, color: '#4B4B4B' }} />
          {!shown.length ? <Text style={{ color: '#777', textAlign: 'center', marginTop: 24 }}>Finish a lesson and the words you meet will show up here.</Text> : null}
          <View style={{ gap: 8 }}>
            {shown.map((w) => (
              <Card key={w.key} style={{ padding: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <SpeakerButton text={w.target} lang={course.ttsLocale} size={36} />
                  <Text style={{ fontSize: 22 }}>{w.emoji ?? ''}</Text>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ fontWeight: '900', color: '#4B4B4B', fontSize: 17 }}>{w.target}</Text>
                    <Text style={{ color: '#777' }}>{w.native}</Text>
                    <ProgressBar value={w.mastery} height={8} color={w.mastery > 0.66 ? '#58CC02' : w.mastery > 0.33 ? '#FFC800' : '#FF4B4B'} />
                  </View>
                  <Text style={{ fontWeight: '900', color: '#777', width: 42, textAlign: 'right' }}>{Math.round(w.mastery * 100)}%</Text>
                </View>
              </Card>
            ))}
          </View>
        </>
      ) : (
        <View style={{ gap: 10 }}>
          {!stories.length ? <Text style={{ color: '#777', textAlign: 'center', marginTop: 24 }}>Finish a story node on the path to save it here.</Text> : null}
          {stories.map((s) => (
            <Card key={s.id} onPress={() => router.push(`/session?kind=story&id=${encodeURIComponent(s.id)}`)}>
              <Text style={{ fontWeight: '900', fontSize: 17, color: '#4B4B4B' }}>📖 {s.title}</Text>
              <Text style={{ color: '#777' }}>Tap to replay</Text>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}
