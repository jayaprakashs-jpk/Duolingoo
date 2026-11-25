import React from 'react';
import { Text, View } from 'react-native';
import type { WordBankEx } from '@/data/types';
import { SpeakerButton } from '@/components/SpeakerButton';
import { useCourseCtx } from '@/components/CourseContext';
import { Shell } from './Shell';
import { TileBuilder } from './TileBuilder';
import type { ExProps } from './types';

export function WordBank({ ex, onAnswer, locked, grade }: ExProps<WordBankEx>) {
  const course = useCourseCtx();
  const toTarget = ex.dir === 'toTarget';
  return (
    <Shell title={toTarget ? `Write this in ${course.targetName}` : 'Translate this sentence'}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {!toTarget ? <SpeakerButton text={ex.prompt} lang={course.ttsLocale} size={46} /> : null}
        <View style={{ flex: 1, borderWidth: 2, borderColor: '#E5E5E5', borderRadius: 16, padding: 12 }}>
          <Text style={{ fontSize: 20, fontWeight: '600', color: '#4B4B4B', lineHeight: 30 }}>{ex.prompt}</Text>
        </View>
      </View>
      <TileBuilder bank={ex.bank} locked={locked} correct={grade ? grade.correct : null} onChange={(t) => onAnswer(t)} />
    </Shell>
  );
}
