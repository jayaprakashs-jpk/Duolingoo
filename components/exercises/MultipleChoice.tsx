import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { MultipleChoiceEx } from '@/data/types';
import { SpeakerButton } from '@/components/SpeakerButton';
import { useCourseCtx } from '@/components/CourseContext';
import { play } from '@/services/sound';
import { Shell } from './Shell';
import type { ExProps } from './types';

export function MultipleChoice({ ex, onAnswer, locked, grade }: ExProps<MultipleChoiceEx>) {
  const course = useCourseCtx();
  const [sel, setSel] = useState<number | null>(null);
  const hasEmoji = ex.options.some((o) => o.emoji);
  return (
    <Shell title={ex.prompt}>
      {ex.speak ? (
        <View style={{ alignItems: 'flex-start' }}>
          <SpeakerButton text={ex.speak} lang={course.ttsLocale} size={52} />
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {ex.options.map((o, i) => {
          const selected = sel === i;
          const checked = !!grade;
          const isRight = checked && i === ex.correct;
          const isWrongPick = checked && selected && i !== ex.correct;
          const border = isRight ? '#58CC02' : isWrongPick ? '#FF4B4B' : selected ? '#84D8FF' : '#E5E5E5';
          const bg = isRight ? '#D7FFB8' : isWrongPick ? '#FFDFE0' : selected ? '#DDF4FF' : '#fff';
          return (
            <Pressable
              key={i}
              disabled={locked}
              onPress={() => {
                void play('tap');
                setSel(i);
                onAnswer(i);
              }}
              style={({ pressed }) => ({
                width: hasEmoji ? '48%' : '100%',
                backgroundColor: bg,
                borderColor: border,
                borderWidth: 2,
                borderBottomWidth: pressed ? 2 : 4,
                borderRadius: 16,
                padding: 14,
                alignItems: 'center',
                flexDirection: hasEmoji ? 'column' : 'row',
                gap: 10,
              })}
            >
              {o.emoji ? <Text style={{ fontSize: 44 }}>{o.emoji}</Text> : null}
              <Text style={{ fontSize: 19, fontWeight: '700', color: '#4B4B4B', flexShrink: 1, lineHeight: 28 }}>{o.text}</Text>
            </Pressable>
          );
        })}
      </View>
    </Shell>
  );
}
