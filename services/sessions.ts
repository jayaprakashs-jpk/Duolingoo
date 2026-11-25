// Builds the exercise list for every kind of practice session.
import type { Course, Exercise, Lesson, Unit } from '@/data/types';
import { randomShuffle } from '@/lib/rng';
import { drillFromWords } from './drills';
import { getMistakes, getPack, getWords, weakestWords } from './db';

export type SessionKind = 'lesson' | 'story' | 'timed' | 'legendary' | 'jump' | 'heart' | 'mistakes' | 'weak' | 'gymSpeak' | 'gymListen';

export interface SessionDef {
  kind: SessionKind;
  title: string;
  subtitle?: string;
  courseId: string;
  exercises: Exercise[];
  lessonId?: string;
  unitId?: string;
  useHearts: boolean;
  /** base XP for finishing */
  xp: number;
  /** minimum accuracy to pass (legendary / jump) */
  passAccuracy?: number;
  color: string;
  countsAsLesson: boolean;
  heartReward?: boolean;
  vocabToIntroduce?: Lesson['vocab'];
}

export class SessionError extends Error {}

export const unitIdOf = (lessonId: string): string => lessonId.split('.').slice(0, 2).join('.');

async function resolveUnit(course: Course, unitId: string): Promise<Unit> {
  const pack = await getPack(unitId);
  const unit = pack ?? course.units.find((u) => u.id === unitId);
  if (!unit) throw new SessionError('That unit is not available.');
  return unit;
}

function isSpeaking(e: Exercise): boolean {
  return e.type === 'SPEAKING_REPEAT';
}

export interface BuildContext {
  course: Course;
  completed: Set<string>;
}

export async function buildSession(kind: SessionKind, ctx: BuildContext, id?: string): Promise<SessionDef> {
  const { course } = ctx;
  const base = { courseId: course.id, countsAsLesson: false, useHearts: false } as const;

  if (kind === 'lesson' || kind === 'story' || kind === 'timed') {
    if (!id) throw new SessionError('Missing lesson id.');
    const unit = await resolveUnit(course, unitIdOf(id));
    const lesson = [...unit.lessons, unit.story, unit.timed].find((l) => l.id === id);
    if (!lesson) throw new SessionError('Lesson not found.');
    return {
      ...base,
      kind,
      title: lesson.title,
      subtitle: unit.title,
      lessonId: lesson.id,
      unitId: unit.id,
      exercises: lesson.exercises,
      useHearts: kind === 'lesson',
      xp: kind === 'lesson' ? 10 : kind === 'story' ? 14 : 0,
      color: unit.color,
      countsAsLesson: kind === 'lesson',
      vocabToIntroduce: lesson.vocab,
    };
  }

  if (kind === 'legendary') {
    if (!id) throw new SessionError('Missing unit id.');
    const unit = await resolveUnit(course, id);
    const pool = unit.lessons.flatMap((l) => l.exercises).filter((e) => !isSpeaking(e) && e.type !== 'MATCH_PAIRS');
    return { ...base, kind, title: `Legendary: ${unit.title}`, subtitle: 'Prove you have mastered this unit', unitId: unit.id, exercises: randomShuffle(pool).slice(0, 12), xp: 40, passAccuracy: 0.8, color: '#FFC800' };
  }

  if (kind === 'jump') {
    if (!id) throw new SessionError('Missing unit id.');
    const idx = course.units.findIndex((u) => u.id === id);
    if (idx <= 0) throw new SessionError('There is nothing to skip before this unit.');
    const skipped = course.units.slice(0, idx);
    const pool = skipped
      .flatMap((u) => u.lessons.flatMap((l) => l.exercises))
      .filter((e) => ['WORD_BANK', 'TYPE_TRANSLATION', 'MULTIPLE_CHOICE', 'FILL_BLANK', 'DIALOGUE_COMPLETE', 'LISTENING_TAP'].includes(e.type));
    return { ...base, kind, title: 'Jump here', subtitle: `Pass to skip ahead to ${course.units[idx].title}`, unitId: id, exercises: randomShuffle(pool).slice(0, 10), xp: 0, passAccuracy: 0.8, color: course.units[idx].color };
  }

  if (kind === 'mistakes') {
    const list = await getMistakes(course.id, 10);
    if (!list.length) throw new SessionError('Your Mistakes Inbox is empty. Nice work!');
    return { ...base, kind, title: 'Mistakes Inbox', subtitle: 'Answer each one right twice to clear it', exercises: list.map((m) => m.exercise), xp: 10, color: '#FF4B4B', countsAsLesson: false };
  }

  if (kind === 'weak' || kind === 'heart') {
    let words = await weakestWords(course.id, kind === 'heart' ? 6 : 10);
    if (words.length < 4) {
      // not enough learned words yet: fall back to the first lesson's vocabulary so the drill still works
      const seed = course.units[0].lessons[0].vocab.map((v) => ({ target: v.t, native: v.n, emoji: v.e }));
      words = [...words, ...seed.filter((s) => !words.some((w) => w.target === s.target))].slice(0, 6) as typeof words;
    }
    const ex = drillFromWords(words, course, { count: kind === 'heart' ? 5 : 10 });
    if (!ex.length) throw new SessionError('Learn a few words first.');
    return kind === 'heart'
      ? { ...base, kind, title: 'Practice to earn hearts', subtitle: 'Finish to win a heart', exercises: ex.slice(0, 6), xp: 5, color: '#FF4B4B', heartReward: true }
      : { ...base, kind, title: 'Weak-skill practice', subtitle: 'Your lowest-mastery words', exercises: ex, xp: 10, color: '#1CB0F6' };
  }

  if (kind === 'gymSpeak' || kind === 'gymListen') {
    const doneLessons = course.units.flatMap((u) => u.lessons).filter((l) => ctx.completed.has(l.id));
    const source = doneLessons.length ? doneLessons : course.units[0].lessons.slice(0, 2);
    const want = kind === 'gymSpeak' ? 'SPEAKING_REPEAT' : 'LISTENING_TAP';
    const pool = source.flatMap((l) => l.exercises).filter((e) => e.type === want);
    const words = await getWords(course.id);
    const extra = drillFromWords(words.slice(0, 6), course, { count: 6, audioOnly: true }).filter((e) => (kind === 'gymSpeak' ? e.type === 'SPEAKING_REPEAT' : e.type === 'LISTENING_TAP'));
    const ex = randomShuffle([...pool, ...extra]).slice(0, kind === 'gymSpeak' ? 8 : 10);
    if (!ex.length) throw new SessionError('Finish a lesson first to unlock gym exercises.');
    return { ...base, kind, title: kind === 'gymSpeak' ? 'Speaking gym' : 'Listening gym', subtitle: kind === 'gymSpeak' ? 'Pronunciation workout' : 'Audio-only workout', exercises: ex, xp: 10, color: kind === 'gymSpeak' ? '#CE82FF' : '#1CB0F6' };
  }

  throw new SessionError('Unknown session type.');
}
