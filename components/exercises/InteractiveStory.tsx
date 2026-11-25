import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import type { StoryEx } from '@/data/types';
import { Button } from '@/components/ui/Button';
import { useCourseCtx } from '@/components/CourseContext';
import { speak, stopSpeaking } from '@/services/speech';
import { haptic, play } from '@/services/sound';
import { Shell } from './Shell';
import type { ExProps } from './types';
import { Press } from '@/components/ui/Press';

export function InteractiveStory({ ex, onAnswer, locked, scrollToEnd }: ExProps<StoryEx> & { scrollToEnd?: () => void }) {
  const course = useCourseCtx();
  const [shown, setShown] = useState(1);
  const [showTr, setShowTr] = useState(true);
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [score, setScore] = useState(0);

  const cur = shown - 1;
  const question = ex.questions.find((q) => q.after === cur);
  const qIdx = question ? ex.questions.indexOf(question) : -1;
  const answered = qIdx >= 0 && picked[qIdx] !== undefined;
  const mustAnswer = !!question && !answered;
  const last = shown >= ex.parts.length;

  useEffect(() => {
    const p = ex.parts[cur];
    if (p) speak(p.text, course.ttsLocale);
    const t = setTimeout(() => scrollToEnd?.(), 200);
    return () => {
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown]);

  useEffect(() => () => stopSpeaking(), []);

  const castOf = (id: string) => ex.cast.find((c) => c.id === id) ?? { id, name: id, emoji: '🧑' };

  const choose = (i: number) => {
    if (answered || !question) return;
    const ok = i === question.correct;
    setPicked((p) => ({ ...p, [qIdx]: i }));
    if (ok) setScore((s) => s + 1);
    void play(ok ? 'correct' : 'wrong');
    haptic(ok ? 'success' : 'error');
    setTimeout(() => scrollToEnd?.(), 200);
  };

  const next = () => {
    if (last) {
      stopSpeaking();
      onAnswer({ score, total: ex.questions.length }, { submit: true });
    } else setShown((s) => s + 1);
  };

  return (
    <Shell title={ex.title}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {ex.cast.map((c) => (
            <View key={c.id} style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 30 }}>{c.emoji}</Text>
              <Text style={{ fontSize: 11, color: '#777', fontWeight: '700' }}>{c.name}</Text>
            </View>
          ))}
        </View>
        <Press onPress={() => setShowTr((v) => !v)} style={{ padding: 8 }}>
          <Text style={{ color: '#1CB0F6', fontWeight: '800' }}>{showTr ? 'HIDE' : 'SHOW'} TRANSLATION</Text>
        </Press>
      </View>

      <View style={{ gap: 12 }}>
        {ex.parts.slice(0, shown).map((p, i) => {
          const c = castOf(p.who);
          const left = ex.cast.findIndex((x) => x.id === p.who) % 2 === 0;
          return (
            <Animated.View key={i} entering={FadeInDown.duration(300)} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, justifyContent: left ? 'flex-start' : 'flex-end' }}>
              {left ? (
                <Animated.Text entering={ZoomIn.springify()} style={{ fontSize: 34 }}>
                  {c.emoji}
                </Animated.Text>
              ) : null}
              <Press onPress={() => speak(p.text, course.ttsLocale)} style={{ maxWidth: '78%', backgroundColor: left ? '#fff' : '#DDF4FF', borderWidth: 2, borderColor: left ? '#E5E5E5' : '#84D8FF', borderRadius: 18, padding: 12 }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#4B4B4B', lineHeight: 27 }}>{p.text}</Text>
                {showTr ? <Text style={{ color: '#777', fontSize: 14, marginTop: 4, lineHeight: 21 }}>{p.tr}</Text> : null}
                <Text style={{ fontSize: 12, color: '#1CB0F6', marginTop: 4 }}>🔊 tap to replay</Text>
              </Press>
              {!left ? (
                <Animated.Text entering={ZoomIn.springify()} style={{ fontSize: 34 }}>
                  {c.emoji}
                </Animated.Text>
              ) : null}
            </Animated.View>
          );
        })}
      </View>

      {question ? (
        <Animated.View entering={FadeInDown.duration(300)} style={{ backgroundColor: '#FFF9E0', borderRadius: 18, padding: 14, gap: 10, borderWidth: 2, borderColor: '#FFC800' }}>
          <Text style={{ fontWeight: '900', color: '#4B4B4B', fontSize: 18 }}>Quick check: {question.q}</Text>
          {question.options.map((o, i) => {
            const chosen = picked[qIdx] === i;
            const right = answered && i === question.correct;
            const wrong = answered && chosen && i !== question.correct;
            return (
              <Press key={i} disabled={answered || locked} onPress={() => choose(i)} style={{ backgroundColor: right ? '#D7FFB8' : wrong ? '#FFDFE0' : '#fff', borderColor: right ? '#58CC02' : wrong ? '#FF4B4B' : '#E5E5E5', borderWidth: 2, borderBottomWidth: 4, borderRadius: 14, padding: 12 }}>
                <Text style={{ fontSize: 17, fontWeight: '700', color: '#4B4B4B' }}>{o}</Text>
              </Press>
            );
          })}
        </Animated.View>
      ) : null}

      <Button title={last ? 'Finish story' : 'Continue'} disabled={mustAnswer || locked} onPress={next} variant="green" />
    </Shell>
  );
}
