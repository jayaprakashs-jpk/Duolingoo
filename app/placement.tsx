import React, { useMemo, useRef } from 'react';
import { useRouter } from 'expo-router';
import { LessonRunner, type ExResult } from '@/components/LessonRunner';
import type { Exercise } from '@/data/types';
import { useActiveCourse } from '@/hooks/useActiveCourse';
import { useApp } from '@/store/app';
import { toast } from '@/store/ui';

const GOOD = new Set(['WORD_BANK', 'TYPE_TRANSLATION', 'MULTIPLE_CHOICE', 'FILL_BLANK', 'DIALOGUE_COMPLETE']);

/**
 * Adaptive placement: binary search over the course's 15 lessons.
 * Right answer -> try a harder lesson, wrong answer -> an easier one. Five questions narrow it to ~1 lesson.
 */
export default function Placement() {
  const router = useRouter();
  const course = useActiveCourse();
  const markLessonsComplete = useApp((s) => s.markLessonsComplete);
  const lessons = useMemo(() => course.units.flatMap((u) => u.lessons), [course]);
  const range = useRef({ lo: 0, hi: lessons.length }); // lessons [0, lo) known, [hi, end) unknown/too hard
  const asked = useRef(0);

  const pickFrom = (lessonIdx: number): Exercise => {
    const l = lessons[Math.max(0, Math.min(lessons.length - 1, lessonIdx))];
    const pool = l.exercises.filter((e) => GOOD.has(e.type));
    return { ...pool[(asked.current * 3 + 1) % pool.length] };
  };

  const first = useMemo(() => [pickFrom(Math.floor(lessons.length / 2))], []); // eslint-disable-line react-hooks/exhaustive-deps

  const getNext = (history: ExResult[]): Exercise | null => {
    const last = history[history.length - 1];
    const mid = Math.floor((range.current.lo + range.current.hi) / 2);
    if (last.grade.correct) range.current.lo = Math.min(range.current.hi, mid + 1);
    else range.current.hi = Math.max(range.current.lo, mid);
    asked.current += 1;
    if (asked.current >= 5 || range.current.lo >= range.current.hi) return null;
    return pickFrom(Math.floor((range.current.lo + range.current.hi) / 2));
  };

  return (
    <LessonRunner
      course={course}
      exercises={first}
      useHearts={false}
      logMistakes={false}
      getNext={getNext}
      expectedTotal={5}
      onQuit={() => router.replace('/(tabs)/learn')}
      onDone={() => {
        const known = Math.max(0, range.current.lo - 1);
        const ids = lessons.slice(0, known).map((l) => l.id);
        if (ids.length) markLessonsComplete(course.id, ids);
        else useApp.setState((s) => ({ progress: { ...s.progress, [course.id]: { ...(s.progress[course.id] ?? { completed: {}, legendary: {} }), placed: true } } }));
        const u = course.units.find((un) => un.lessons.some((l) => l.id === lessons[Math.min(known, lessons.length - 1)].id));
        toast(known ? `Placed! We unlocked ${known} lessons. You start in ${u?.title ?? 'the path'}.` : 'Start from the beginning. You will fly through it!', 'success');
        router.replace('/(tabs)/learn');
      }}
    />
  );
}
