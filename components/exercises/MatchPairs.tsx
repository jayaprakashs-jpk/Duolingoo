import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import type { MatchPairsEx } from '@/data/types';
import { Tile } from '@/components/ui/Tile';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useCourseCtx } from '@/components/CourseContext';
import { seededShuffle } from '@/lib/rng';
import { speak } from '@/services/speech';
import { haptic, play } from '@/services/sound';
import { Shell } from './Shell';
import type { ExProps } from './types';

type Sel = { side: 'l' | 'r'; i: number } | null;

export function MatchPairs({ ex, onAnswer, locked }: ExProps<MatchPairsEx>) {
  const course = useCourseCtx();
  const left = useMemo(() => seededShuffle(ex.pairs.map((p) => p.l), ex.id + 'L'), [ex]);
  const right = useMemo(() => seededShuffle(ex.pairs.map((p) => p.r), ex.id + 'R'), [ex]);
  const [sel, setSel] = useState<Sel>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [flash, setFlash] = useState<{ side: 'l' | 'r'; i: number }[]>([]);
  const errors = useRef(0);
  const finished = useRef(false);
  const [remaining, setRemaining] = useState(ex.countdown ?? 0);

  useEffect(() => {
    if (!ex.countdown) return;
    const end = Date.now() + ex.countdown * 1000;
    const id = setInterval(() => {
      const left = Math.max(0, end - Date.now());
      setRemaining(left / 1000);
      if (left <= 0 && !finished.current) {
        finished.current = true;
        errors.current += ex.pairs.length - done.size; // unmatched pairs count as mistakes
        onAnswer({ errors: errors.current }, { submit: true });
      }
    }, 200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ex.countdown]);

  const tap = (side: 'l' | 'r', i: number) => {
    if (locked || finished.current) return;
    void play('tap');
    if (side === 'l') speak(left[i], course.ttsLocale);
    if (!sel || sel.side === side) {
      setSel({ side, i });
      return;
    }
    const l = side === 'l' ? left[i] : left[sel.i];
    const r = side === 'r' ? right[i] : right[sel.i];
    const ok = ex.pairs.some((p) => p.l === l && p.r === r);
    if (ok) {
      haptic('success');
      const next = new Set(done);
      next.add(l);
      setDone(next);
      setSel(null);
      if (next.size === ex.pairs.length) {
        finished.current = true;
        setTimeout(() => onAnswer({ errors: errors.current }, { submit: true }), 250);
      }
    } else {
      haptic('error');
      errors.current += 1;
      setFlash([{ side, i }, sel]);
      setSel(null);
      setTimeout(() => setFlash([]), 450);
    }
  };

  const stateOf = (side: 'l' | 'r', i: number) => {
    const text = side === 'l' ? left[i] : right[i];
    const pair = side === 'l' ? ex.pairs.find((p) => p.l === text) : ex.pairs.find((p) => p.r === text);
    if (pair && done.has(pair.l)) return 'matched' as const;
    if (flash.some((f) => f.side === side && f.i === i)) return 'wrong' as const;
    if (sel && sel.side === side && sel.i === i) return 'selected' as const;
    return 'idle' as const;
  };

  return (
    <Shell title="Tap the matching pairs">
      {ex.countdown ? (
        <View style={{ gap: 4 }}>
          <ProgressBar value={remaining / ex.countdown} color={remaining < 5 ? '#FF4B4B' : '#FF9600'} height={12} />
          <Text style={{ color: '#777', fontWeight: '700' }}>{Math.ceil(remaining)}s</Text>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          {left.map((t, i) => (
            <Tile key={t} label={t} state={stateOf('l', i)} onPress={() => tap('l', i)} big />
          ))}
        </View>
        <View style={{ flex: 1 }}>
          {right.map((t, i) => (
            <Tile key={t} label={t} state={stateOf('r', i)} onPress={() => tap('r', i)} big />
          ))}
        </View>
      </View>
    </Shell>
  );
}
