import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import type { TimedEx } from '@/data/types';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Tile } from '@/components/ui/Tile';
import { useCourseCtx } from '@/components/CourseContext';
import { pick, seededShuffle } from '@/lib/rng';
import { speak } from '@/services/speech';
import { haptic, play } from '@/services/sound';
import { useApp } from '@/store/app';
import { Shell } from './Shell';
import type { ExProps } from './types';

type Sel = { side: 'l' | 'r'; text: string } | null;

export function TimedChallenge({ ex, onAnswer }: ExProps<TimedEx>) {
  const course = useCourseCtx();
  const boosts = useApp((s) => s.inventory.timerBoosts);
  const rampUp = ex.mode === 'ramp_up';
  const [phase, setPhase] = useState<'intro' | 'play' | 'done'>('intro');
  const [total, setTotal] = useState(ex.seconds);
  const endAt = useRef(0);
  const [now, setNow] = useState(Date.now());
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [sel, setSel] = useState<Sel>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [flash, setFlash] = useState<string[]>([]);
  const startedAt = useRef(0);

  const size = rampUp ? Math.min(5, 3 + Math.floor(round / 2)) : 5;
  const board = useMemo(() => pick(ex.pairs, size, `${ex.id}:${round}`), [ex, round, size]);
  const left = useMemo(() => seededShuffle(board.map((p) => p.l), `${ex.id}:${round}L`), [board, ex.id, round]);
  const right = useMemo(() => seededShuffle(board.map((p) => p.r), `${ex.id}:${round}R`), [board, ex.id, round]);

  const finish = (finalScore: number) => {
    setPhase('done');
    setTimeout(() => onAnswer({ score: finalScore, total: finalScore, seconds: Math.round((Date.now() - startedAt.current) / 1000) }, { submit: true }), 900);
  };

  useEffect(() => {
    if (phase !== 'play') return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= endAt.current) {
        clearInterval(id);
        finish(scoreRef.current);
      }
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const scoreRef = useRef(0);
  scoreRef.current = score;

  const start = (boost: boolean) => {
    let secs = ex.seconds;
    if (boost && boosts > 0) {
      useApp.setState((s) => ({ inventory: { ...s.inventory, timerBoosts: s.inventory.timerBoosts - 1 } }));
      secs += 30;
    }
    setTotal(secs);
    startedAt.current = Date.now();
    endAt.current = Date.now() + secs * 1000;
    setNow(Date.now());
    setPhase('play');
  };

  const tap = (side: 'l' | 'r', text: string) => {
    if (phase !== 'play' || matched.includes(text)) return;
    void play('tap');
    if (side === 'l') speak(text, course.ttsLocale);
    if (!sel || sel.side === side) {
      setSel({ side, text });
      return;
    }
    const l = side === 'l' ? text : sel.text;
    const r = side === 'r' ? text : sel.text;
    const pair = board.find((p) => p.l === l && p.r === r);
    if (pair) {
      haptic('success');
      const m = [...matched, pair.l, pair.r];
      setMatched(m);
      setScore((s) => s + 1);
      setSel(null);
      if (m.length >= board.length * 2) {
        if (rampUp) endAt.current += 3000;
        setTimeout(() => {
          setMatched([]);
          setRound((r0) => r0 + 1);
        }, 250);
      }
    } else {
      haptic('error');
      endAt.current -= 2000;
      setFlash([sel.text, text]);
      setSel(null);
      setTimeout(() => setFlash([]), 400);
    }
  };

  const remaining = Math.max(0, (endAt.current - now) / 1000);

  if (phase === 'intro')
    return (
      <Shell title={rampUp ? 'Ramp Up' : 'Match Madness'}>
        <View style={{ alignItems: 'center', gap: 12, paddingVertical: 12 }}>
          <Text style={{ fontSize: 72 }}>⚡</Text>
          <Text style={{ fontSize: 18, color: '#4B4B4B', textAlign: 'center', lineHeight: 27 }}>
            {rampUp
              ? `Boards get bigger as you go. Clear a board for +3 seconds. You have ${ex.seconds} seconds.`
              : `Match as many pairs as you can in ${ex.seconds} seconds. A wrong tap costs 2 seconds.`}
          </Text>
          <Button title="Start" onPress={() => start(false)} variant="orange" style={{ alignSelf: 'stretch' }} />
          {boosts > 0 ? <Button title={`Use Timer Boost (+30s) · ${boosts} left`} onPress={() => start(true)} variant="purple" style={{ alignSelf: 'stretch' }} /> : null}
        </View>
      </Shell>
    );

  if (phase === 'done')
    return (
      <Shell title="Time is up!">
        <View style={{ alignItems: 'center', gap: 8, paddingVertical: 24 }}>
          <Text style={{ fontSize: 72 }}>🏁</Text>
          <Text style={{ fontSize: 32, fontWeight: '900', color: '#FF9600' }}>{score} matches</Text>
        </View>
      </Shell>
    );

  return (
    <Shell title={rampUp ? 'Ramp Up' : 'Match Madness'}>
      <View style={{ gap: 6 }}>
        <ProgressBar value={Math.min(1, remaining / total)} color={remaining < 10 ? '#FF4B4B' : '#FF9600'} height={14} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontWeight: '800', color: '#777' }}>⏱ {Math.ceil(remaining)}s</Text>
          <Text style={{ fontWeight: '800', color: '#58A700' }}>⭐ {score}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          {left.map((t) => (
            <Tile key={t} big label={t} state={matched.includes(t) ? 'matched' : flash.includes(t) ? 'wrong' : sel?.text === t ? 'selected' : 'idle'} onPress={() => tap('l', t)} />
          ))}
        </View>
        <View style={{ flex: 1 }}>
          {right.map((t) => (
            <Tile key={t} big label={t} state={matched.includes(t) ? 'matched' : flash.includes(t) ? 'wrong' : sel?.text === t ? 'selected' : 'idle'} onPress={() => tap('r', t)} />
          ))}
        </View>
      </View>
    </Shell>
  );
}
