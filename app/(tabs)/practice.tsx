import React, { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { LockedPanel } from '@/components/LockedPanel';
import { TopBar } from '@/components/TopBar';
import { Card } from '@/components/ui/Card';
import { useActiveCourse } from '@/hooks/useActiveCourse';
import { useEntitlements } from '@/hooks/useEntitlements';
import { mistakeCount } from '@/services/db';

function Tool({ icon, title, sub, badge, locked, onPress }: { icon: string; title: string; sub: string; badge?: string; locked?: boolean; onPress: () => void }) {
  return (
    <Card onPress={onPress} style={{ opacity: locked ? 0.75 : 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Text style={{ fontSize: 34 }}>{icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '900', color: '#4B4B4B' }}>{title}</Text>
          <Text style={{ color: '#777', fontSize: 14 }}>{sub}</Text>
        </View>
        {badge ? (
          <View style={{ backgroundColor: '#FF4B4B', borderRadius: 12, minWidth: 28, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ color: '#fff', fontWeight: '900', textAlign: 'center' }}>{badge}</Text>
          </View>
        ) : null}
        {locked ? <Text style={{ fontSize: 20 }}>🔒</Text> : null}
      </View>
    </Card>
  );
}

export default function Practice() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const course = useActiveCourse();
  const e = useEntitlements();
  const [mistakes, setMistakes] = useState(0);

  useFocusEffect(
    useCallback(() => {
      void mistakeCount(course.id).then(setMistakes).catch(() => {});
    }, [course.id])
  );

  const hub = (path: string, feature = 'practice') => () => (e.practiceHub ? router.push(path) : router.push(`/paywall?feature=${feature}`));

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top }}>
      <TopBar />
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ gap: 12, padding: 16, paddingBottom: 32 }}>
          <Text style={{ fontSize: 26, fontWeight: '900', color: '#4B4B4B' }}>Practice Hub</Text>
          {!e.practiceHub ? <LockedPanel title="Practice Hub is a Super perk" body="Mistakes Inbox, weak-skill practice, speaking and listening gyms and your vocabulary library." feature="practice" /> : null}

          <Tool icon="❤️" title="Practice to earn hearts" sub="Free for everyone. Win a heart." onPress={() => router.push('/session?kind=heart')} />
          <Tool icon="📥" title="Mistakes Inbox" sub="10-question drills. Get each one right twice." badge={mistakes ? String(mistakes) : undefined} locked={!e.practiceHub} onPress={hub('/session?kind=mistakes')} />
          <Tool icon="🎯" title="Targeted weak-skill practice" sub="Spaced repetition on your lowest-mastery words" locked={!e.practiceHub} onPress={hub('/session?kind=weak')} />
          <Tool icon="🎤" title="Speaking gym" sub="Pronunciation workout" locked={!e.practiceHub} onPress={hub('/session?kind=gymSpeak')} />
          <Tool icon="🎧" title="Listening gym" sub="Audio-only workout" locked={!e.practiceHub} onPress={hub('/session?kind=gymListen')} />
          <Tool icon="📚" title="Vocabulary & Stories library" sub="Search every word you learned, replay stories" locked={!e.practiceHub} onPress={hub('/library')} />
          <Tool icon="⬇️" title="Offline lesson packs" sub="Download units for airplane-mode learning" locked={!e.offlinePacks} onPress={() => (e.offlinePacks ? router.push('/packs') : router.push('/paywall?feature=offline'))} />

          <Text style={{ fontSize: 22, fontWeight: '900', color: '#4B4B4B', marginTop: 10 }}>AI Tutor</Text>
          {!e.aiTutor ? <LockedPanel title="Max unlocks your AI tutor" body={`Video calls with ${course.persona.name} and roleplay side-quests, with grading at the end.`} feature="max" plan="Max" /> : null}
          <Tool icon={course.persona.emoji} title={`Video call with ${course.persona.name}`} sub="Talk out loud. Live subtitles. Post-call summary." locked={!e.aiTutor} onPress={() => (e.aiTutor ? router.push('/video-call') : router.push('/paywall?feature=max'))} />
          {course.roleplays.map((r) => (
            <Tool key={r.id} icon={r.emoji} title={r.title} sub={`${r.level} · ${r.persona.name}, ${r.persona.role}`} locked={!e.aiTutor} onPress={() => (e.aiTutor ? router.push(`/roleplay?id=${encodeURIComponent(r.id)}`) : router.push('/paywall?feature=max'))} />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}
