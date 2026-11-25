import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LessonRunner, type RunSummary } from '@/components/LessonRunner';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { useActiveCourse, useCourseCompleted } from '@/hooks/useActiveCourse';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useHearts } from '@/hooks/useHearts';
import { dayKey } from '@/lib/date';
import { introduceWords } from '@/services/db';
import { buildSession, SessionError, type SessionDef, type SessionKind } from '@/services/sessions';
import { useApp } from '@/store/app';
import { useSessionStore } from '@/store/session';

export default function SessionScreen() {
  const { kind, id } = useLocalSearchParams<{ kind: SessionKind; id?: string }>();
  const router = useRouter();
  const course = useActiveCourse();
  const completed = useCourseCompleted(course.id);
  const hearts = useHearts();
  const ent = useEntitlements();
  const [def, setDef] = useState<SessionDef | null>(null);
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);

  useEffect(() => {
    let alive = true;
    if (kind === 'lesson' && hearts.empty) {
      router.replace('/hearts');
      return;
    }
    buildSession(kind, { course, completed }, id ? decodeURIComponent(id) : undefined)
      .then((d) => alive && setDef(d))
      .catch((e) => alive && setError(e instanceof SessionError ? e.message : 'Could not start this session.'));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, id]);

  if (error)
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <Text style={{ fontSize: 56 }}>🌱</Text>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#4B4B4B', textAlign: 'center' }}>{error}</Text>
          <Button title="Back" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  if (!def)
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#58CC02" />
        </View>
      </Screen>
    );

  const finishSession = async (s: RunSummary) => {
    if (done.current) return;
    done.current = true;
    const st = useApp.getState();
    const before = st.streak.lastGoalDay;
    const passed = def.passAccuracy ? s.accuracy >= def.passAccuracy : true;
    const perfect = s.accuracy === 1 && s.total > 0;

    let baseXp = 0;
    let gems = 0;
    if (passed) {
      if (def.kind === 'timed') {
        baseXp = Math.min(30, 5 + 2 * s.timedScore);
        gems = Math.floor(s.timedScore / 2);
      } else if (def.kind === 'lesson' || def.kind === 'story') {
        baseXp = def.xp + (s.accuracy >= 0.9 ? 5 : 0) + (perfect ? 2 : 0);
        gems = 10 + (perfect ? 5 : 0);
      } else if (def.kind === 'legendary') {
        baseXp = def.xp;
        gems = 50;
      } else {
        baseXp = def.xp;
      }
    }
    const gained = baseXp > 0 ? st.addXp(baseXp) : 0;
    if (gems) st.addGems(gems);

    st.bumpStats({
      lessons: def.countsAsLesson && passed ? 1 : 0,
      acc90: def.countsAsLesson && passed && s.accuracy >= 0.9 ? 1 : 0,
      perfect: def.countsAsLesson && passed && perfect ? 1 : 0,
      speaking: s.speakingDone,
      listening: s.listeningDone,
      words: s.wordsPracticed,
    });

    if (passed && def.lessonId && (def.kind === 'lesson' || def.kind === 'story' || def.kind === 'timed')) {
      st.finishLesson({ courseId: course.id, lessonId: def.lessonId, accuracy: s.accuracy, countsAsLesson: def.countsAsLesson });
      if (def.vocabToIntroduce?.length) await introduceWords(course.id, def.vocabToIntroduce).catch(() => {});
      if (def.kind === 'story' && !useApp.getState().savedStories.includes(def.lessonId)) st.toggleSavedStory(def.lessonId);
    }
    if (passed && def.kind === 'legendary' && def.unitId) st.setLegendary(course.id, def.unitId);
    if (passed && def.kind === 'jump' && def.unitId) {
      const idx = course.units.findIndex((u) => u.id === def.unitId);
      st.markLessonsComplete(course.id, course.units.slice(0, idx).flatMap((u) => u.lessons.map((l) => l.id)));
    }
    if (passed && def.heartReward) st.addHeart(1);

    const after = useApp.getState();
    useSessionStore.getState().setResult({
      kind: def.kind,
      title: def.title,
      courseId: course.id,
      xp: baseXp,
      bonusXp: Math.max(0, gained - baseXp),
      gems,
      accuracy: s.accuracy,
      correct: s.firstTryCorrect,
      total: s.total,
      passed,
      perfect,
      streakExtended: after.streak.lastGoalDay === dayKey() && before !== dayKey(),
      streakCount: after.streak.count,
      durationMs: s.durationMs,
      unitId: def.unitId,
      lessonId: def.lessonId,
      heartEarned: !!def.heartReward && passed,
      note:
        def.kind === 'legendary' && !passed
          ? `You need ${Math.round((def.passAccuracy ?? 0.8) * 100)}% to pass.${ent.freeLegendary ? ' Try again for free!' : ''}`
          : def.kind === 'jump' && !passed
            ? 'Not quite. You can still take the lessons one by one.'
            : undefined,
    });
    router.replace('/complete');
  };

  return (
    <LessonRunner
      course={course}
      exercises={def.exercises}
      lessonId={def.lessonId ?? def.kind}
      useHearts={def.useHearts}
      accent={def.color}
      onQuit={() => router.back()}
      onDone={(s) => void finishSession(s)}
    />
  );
}
