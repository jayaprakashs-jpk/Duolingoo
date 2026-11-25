import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import type { TypeTranslationEx } from '@/data/types';
import { SpeakerButton } from '@/components/SpeakerButton';
import { useCourseCtx } from '@/components/CourseContext';
import { Shell } from './Shell';
import type { ExProps } from './types';

export function TypeTranslation({ ex, onAnswer, locked, grade }: ExProps<TypeTranslationEx>) {
  const course = useCourseCtx();
  const [text, setText] = useState('');
  const toTarget = ex.dir === 'toTarget';
  const border = grade ? (grade.correct ? '#58CC02' : '#FF4B4B') : '#E5E5E5';
  return (
    <Shell title="Type the translation">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {!toTarget ? <SpeakerButton text={ex.prompt} lang={course.ttsLocale} size={46} /> : null}
        <View style={{ flex: 1, borderWidth: 2, borderColor: '#E5E5E5', borderRadius: 16, padding: 12 }}>
          <Text style={{ fontSize: 20, fontWeight: '600', color: '#4B4B4B', lineHeight: 30 }}>{ex.prompt}</Text>
        </View>
      </View>
      <TextInput
        value={text}
        editable={!locked}
        onChangeText={(t) => {
          setText(t);
          onAnswer(t.trim() ? t : null);
        }}
        onSubmitEditing={() => text.trim() && onAnswer(text, { submit: true })}
        placeholder={`Type in ${toTarget ? course.targetName : course.nativeName}`}
        placeholderTextColor="#AFAFAF"
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="done"
        multiline
        blurOnSubmit
        textAlignVertical="top"
        style={{ minHeight: 120, borderWidth: 2, borderColor: border, borderRadius: 16, padding: 14, fontSize: 20, color: '#4B4B4B', backgroundColor: '#F7F7F7', lineHeight: 30 }}
      />
      <Text style={{ color: '#AFAFAF', fontSize: 13 }}>Small typos and missing accents are forgiven.</Text>
    </Shell>
  );
}
