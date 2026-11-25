import React, { useState } from 'react';
import { Text, View } from 'react-native';
import type { DialogueEx } from '@/data/types';
import { useCourseCtx } from '@/components/CourseContext';
import { speak } from '@/services/speech';
import { play } from '@/services/sound';
import { Bubble, Shell } from './Shell';
import type { ExProps } from './types';
import { Press } from '@/components/ui/Press';

export function DialogueComplete({ ex, onAnswer, locked, grade }: ExProps<DialogueEx>) {
  const course = useCourseCtx();
  const [sel, setSel] = useState<number | null>(null);
  const nextWho: 'A' | 'B' = ex.lines.length % 2 === 0 ? 'A' : 'B';
  return (
    <Shell title="Choose the natural reply">
      <View style={{ gap: 10 }}>
        {ex.lines.map((l, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, justifyContent: l.who === 'A' ? 'flex-start' : 'flex-end' }}>
            {l.who === 'A' ? <Text style={{ fontSize: 34 }}>🧑</Text> : null}
            <Bubble who={l.who} text={l.text} sub={i === 0 ? ex.translation : undefined} onPress={() => speak(l.text, course.ttsLocale)} />
            {l.who === 'B' ? <Text style={{ fontSize: 34 }}>🧑‍🦰</Text> : null}
          </View>
        ))}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, justifyContent: nextWho === 'A' ? 'flex-start' : 'flex-end' }}>
          {nextWho === 'A' ? <Text style={{ fontSize: 34 }}>🧑</Text> : null}
          <Bubble who={nextWho} text={sel === null ? '. . .' : ex.options[sel]} />
          {nextWho === 'B' ? <Text style={{ fontSize: 34 }}>🧑‍🦰</Text> : null}
        </View>
      </View>
      <View style={{ gap: 10, marginTop: 6 }}>
        {ex.options.map((o, i) => {
          const checked = !!grade;
          const right = checked && i === ex.correct;
          const wrong = checked && sel === i && i !== ex.correct;
          const border = right ? '#58CC02' : wrong ? '#FF4B4B' : sel === i ? '#84D8FF' : '#E5E5E5';
          const bg = right ? '#D7FFB8' : wrong ? '#FFDFE0' : sel === i ? '#DDF4FF' : '#fff';
          return (
            <Press
              key={i}
              disabled={locked}
              onPress={() => {
                void play('tap');
                setSel(i);
                onAnswer(i);
              }}
              style={({ pressed }) => ({ backgroundColor: bg, borderColor: border, borderWidth: 2, borderBottomWidth: pressed ? 2 : 4, borderRadius: 16, padding: 14 })}
            >
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#4B4B4B', lineHeight: 27 }}>{o}</Text>
            </Press>
          );
        })}
      </View>
    </Shell>
  );
}
