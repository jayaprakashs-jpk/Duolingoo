import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Course, Exercise } from '@/data/types';
import { useHearts } from '@/hooks/useHearts';
import { C } from '@/lib/constants';
import { explainAnswer, type ExplainSection } from '@/services/explain';
import { grade as gradeAnswer, speakableAnswer, type Grade } from '@/services/grading';
import { recordExercise, recordWord } from '@/services/db';
import { queueMistake } from '@/services/sync';
import { speak, stopSpeaking } from '@/services/speech';
import { haptic, play } from '@/services/sound';
import { useApp } from '@/store/app';
import { CourseProvider } from './CourseContext';
import { ExplainModal, FeedbackSheet } from './FeedbackSheet';
import { FeedbackAnim } from './FeedbackAnim';
import { OutOfHeartsModal } from './OutOfHeartsModal';
import { Button } from './ui/Button';
import { ProgressBar } from './ui/ProgressBar';
import { AUTO_SUBMIT, ExerciseView, SILENT_RESULT } from './exercises/ExerciseView';

export interface ExResult {
  ex: Exercise;
  grade: Grade;
  attempt: number;
}

export interface RunSummary {
  results: ExResult[];
  total: number;
  firstTryCorrect: number;
  accuracy: number;
  heartsLost: number;
  durationMs: number;
  timedScore: number;
  speakingDone: number;
  listeningDone: number;
  wordsPracticed: number;
}

interface Props {
  course: Course;
  exercises: Exercise[];
  lessonId?: string;
  useHearts: boolean;
  accent?: string;
  /** adaptive mode (placement): called after each exercise, return null to finish */
  getNext?: (history: ExResult[]) => Exercise | null;
  /** total used for the progress bar when `getNext` is set */
  expectedTotal?: number;
  logMistakes?: boolean;
  onQuit: () => void;
  onDone: (s: RunSummary) => void;
}

interface Flow {
  queue: Exercise[];
  idx: number;
  grade: Grade | null;
  answer: unknown;
}

const isSpeaking = (e: Exercise) => e.type === 'SPEAKING_REPEAT';

export function LessonRunner(props: Props) {
  const { course, useHearts: costHearts, accent = C.feather } = props;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const hearts = useHearts();
  const loseHeart = useApp((s) => s.loseHeart);
  const bumpStats = useApp((s) => s.bumpStats);
  const setCantSpeak = useApp((s) => s.setCantSpeak);
  const userId = useApp((s) => s.userId);
  const scrollRef = useRef<ScrollView>(null);

  const initial = useMemo(() => {
    const blocked = useApp.getState().cantSpeakUntil > Date.now();
    const list = blocked ? props.exercises.filter((e) => !isSpeaking(e)) : props.exercises.slice();
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [flow, setFlowState] = useState<Flow>({ queue: initial, idx: 0, grade: null, answer: null });
  const flowRef = useRef(flow);
  const setFlow = useCallback((f: Flow | ((p: Flow) => Flow)) => {
    const next = typeof f === 'function' ? f(flowRef.current) : f;
    flowRef.current = next;
    setFlowState(next);
  }, []);

  const [shake, setShake] = useState({ n: 0, ok: true });
  const [explain, setExplain] = useState<ExplainSection[] | null>(null);
  const [outOfHearts, setOutOfHearts] = useState(false);
  const [solvedCount, setSolvedCount] = useState(0);

  const results = useRef<ExResult[]>([]);
  const attempts = useRef<Record<string, number>>({});
  const firstTry = useRef<Record<string, boolean>>({});
  const solved = useRef<Set<string>>(new Set());
  const heartsLost = useRef(0);
  const started = useRef(Date.now());
  const counters = useRef({ speaking: 0, listening: 0, words: 0, timed: 0 });
  const finished = useRef(false);

  const totalPlanned = props.getNext ? props.expectedTotal ?? initial.length : initial.length;
  const ex = flow.queue[flow.idx];

  useEffect(() => () => stopSpeaking(), []);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    const ids = Object.keys(firstTry.current);
    const ok = ids.filter((i) => firstTry.current[i]).length;
    props.onDone({
      results: results.current,
      total: ids.length,
      firstTryCorrect: ok,
      accuracy: ids.length ? ok / ids.length : 1,
      heartsLost: heartsLost.current,
      durationMs: Date.now() - started.current,
      timedScore: counters.current.timed,
      speakingDone: counters.current.speaking,
      listeningDone: counters.current.listening,
      wordsPracticed: counters.current.words,
    });
  }, [props]);

  const check = useCallback(
    (override?: unknown) => {
      const f = flowRef.current;
      if (f.grade) return;
      const cur = f.queue[f.idx];
      const a = override !== undefined ? override : f.answer;
      if (a === null || a === undefined) return;
      const g = gradeAnswer(cur, a);
      const attempt = (attempts.current[cur.id] ?? 0) + 1;
      attempts.current[cur.id] = attempt;
      if (attempt === 1) firstTry.current[cur.id] = g.correct;
      if (g.correct) solved.current.add(cur.id);
      results.current.push({ ex: cur, grade: g, attempt });
      setSolvedCount(solved.current.size);

      void play(g.correct ? 'correct' : 'wrong');
      haptic(g.correct ? 'success' : 'error');
      setShake((s) => ({ n: s.n + 1, ok: g.correct }));

      if (cur.type === 'TIMED_CHALLENGE') counters.current.timed = (a as { score: number }).score;
      if (cur.type === 'SPEAKING_REPEAT' && g.correct) counters.current.speaking += 1;
      if (cur.type === 'LISTENING_TAP' && g.correct) counters.current.listening += 1;
      if (g.correct) counters.current.words += cur.focus?.length ?? 0;

      let queue = f.queue;
      if (!g.correct) {
        if (g.costsHeart && costHearts) {
          loseHeart();
          heartsLost.current += 1;
          void play('heart');
        }
        if (g.requeue && attempt <= 2) queue = [...queue, cur];
      }

      if (props.logMistakes !== false) {
        void recordExercise(course.id, props.lessonId ?? 'practice', cur, g.correct).catch(() => {});
        if (!g.correct && userId) queueMistake(userId, course.id, props.lessonId ?? 'practice', cur.id);
      }
      for (const w of cur.focus ?? []) void recordWord(course.id, w, g.correct, attempt === 1).catch(() => {});

      setFlow({ ...f, queue, grade: g, answer: a });

      if (g.correct && ['WORD_BANK', 'TYPE_TRANSLATION', 'FILL_BLANK', 'DIALOGUE_COMPLETE'].includes(cur.type)) {
        const say = speakableAnswer(cur);
        if (say) speak(say, course.ttsLocale);
      }
      if (SILENT_RESULT.has(cur.type)) setTimeout(() => advance(false), 150);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [course, costHearts, loseHeart, props.lessonId, props.logMistakes, userId]
  );

  const advance = useCallback(
    (lastWrong: boolean) => {
      const f = flowRef.current;
      if (costHearts && lastWrong) {
        const st = useApp.getState();
        const unlimited = st.tier !== 'free';
        if (!unlimited && st.hearts <= 0) {
          setOutOfHearts(true);
          return;
        }
      }
      stopSpeaking();
      if (f.idx + 1 < f.queue.length) {
        setFlow({ ...f, idx: f.idx + 1, grade: null, answer: null });
        return;
      }
      if (props.getNext) {
        const nx = props.getNext(results.current);
        if (nx) {
          setFlow({ queue: [...f.queue, nx], idx: f.idx + 1, grade: null, answer: null });
          return;
        }
      }
      finish();
    },
    [costHearts, finish, props, setFlow]
  );

  const skipSpeaking = useCallback(() => {
    setCantSpeak();
    const f = flowRef.current;
    const kept = f.queue.filter((e, i) => i < f.idx || !isSpeaking(e));
    if (f.idx >= kept.length) {
      setFlow({ ...f, queue: kept, grade: null, answer: null });
      finish();
      return;
    }
    setFlow({ queue: kept, idx: f.idx, grade: null, answer: null });
  }, [finish, setCantSpeak, setFlow]);

  const quit = () =>
    Alert.alert('Quit this lesson?', 'You will lose the progress you made in it.', [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Quit', style: 'destructive', onPress: props.onQuit },
    ]);

  if (!ex) return null;

  const auto = AUTO_SUBMIT.has(ex.type);
  const g = flow.grade;
  const showSheet = !!g && !SILENT_RESULT.has(ex.type);
  const progress = totalPlanned ? Math.min(1, solvedCount / totalPlanned) : 0;

  return (
    <CourseProvider course={course}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 }}>
          <Pressable onPress={quit} accessibilityLabel="Quit lesson" hitSlop={12}>
            <Text style={{ fontSize: 26, color: '#AFAFAF', fontWeight: '800' }}>✕</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <ProgressBar value={progress} color={accent} />
          </View>
          {costHearts ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 22 }}>{hearts.unlimited ? '💖' : '❤️'}</Text>
              <Text style={{ fontWeight: '900', color: '#FF4B4B', fontSize: 18 }}>{hearts.unlimited ? '∞' : hearts.hearts}</Text>
            </View>
          ) : null}
        </View>

        <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 18, paddingBottom: 220 }} keyboardShouldPersistTaps="handled">
          <FeedbackAnim trigger={shake}>
            <ExerciseView
              key={`${ex.id}:${flow.idx}`}
              ex={ex}
              locked={!!g}
              grade={g}
              onAnswer={(a, o) => {
                if (o?.submit) check(a);
                else setFlow({ ...flowRef.current, answer: a });
              }}
              onSkipSpeaking={skipSpeaking}
              scrollToEnd={() => scrollRef.current?.scrollToEnd({ animated: true })}
            />
          </FeedbackAnim>
        </ScrollView>

        {!g && !auto ? (
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: 16 + insets.bottom, backgroundColor: '#fff', borderTopWidth: 2, borderTopColor: '#E5E5E5' }}>
            <Button title="Check" onPress={() => check()} disabled={flow.answer === null || flow.answer === undefined} variant="green" color={{ bg: accent, edge: accent }} />
          </View>
        ) : null}

        {showSheet && g ? (
          <FeedbackSheet
            grade={g}
            seed={results.current.length}
            onContinue={() => advance(!g.correct)}
            onExplain={() => setExplain(explainAnswer(ex, g, course))}
            onSpeak={speakableAnswer(ex) ? () => speak(speakableAnswer(ex) as string, course.ttsLocale) : undefined}
          />
        ) : null}
      </KeyboardAvoidingView>

      <ExplainModal visible={!!explain} sections={explain ?? []} onClose={() => setExplain(null)} />

      <OutOfHeartsModal
        visible={outOfHearts}
        onPractice={() => {
          setOutOfHearts(false);
          props.onQuit();
          router.push('/session?kind=heart');
        }}
        onUpgrade={() => {
          setOutOfHearts(false);
          router.push('/paywall');
        }}
        onQuit={() => {
          setOutOfHearts(false);
          props.onQuit();
        }}
        onRefilled={() => {
          setOutOfHearts(false);
          const f = flowRef.current;
          if (f.idx + 1 < f.queue.length) setFlow({ ...f, idx: f.idx + 1, grade: null, answer: null });
          else finish();
        }}
      />
    </CourseProvider>
  );
}
