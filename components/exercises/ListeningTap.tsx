import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import type { ListeningTapEx } from '@/data/types';
import { SpeakerPair } from '@/components/SpeakerButton';
import { useCourseCtx } from '@/components/CourseContext';
import { speak } from '@/services/speech';
import { Shell } from './Shell';
import { TileBuilder } from './TileBuilder';
import type { ExProps } from './types';

export function ListeningTap({ ex, onAnswer, locked, grade }: ExProps<ListeningTapEx>) {
  const course = useCourseCtx();
  useEffect(() => {
    const t = setTimeout(() => speak(ex.audio, course.ttsLocale), 350);
    return () => clearTimeout(t);
  }, [ex.audio, course.ttsLocale]);
  return (
    <Shell title="Tap what you hear">
      <View style={{ alignItems: 'center', paddingVertical: 10 }}>
        <SpeakerPair text={ex.audio} lang={course.ttsLocale} />
        <Text style={{ color: '#AFAFAF', marginTop: 8, fontSize: 13 }}>🔊 normal speed   🐢 slow (0.6x)</Text>
      </View>
      <TileBuilder bank={ex.bank} locked={locked} correct={grade ? grade.correct : null} onChange={(t) => onAnswer(t)} />
    </Shell>
  );
}
