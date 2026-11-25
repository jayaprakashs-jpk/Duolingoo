import React, { useState } from 'react';
import { Text, View } from 'react-native';
import type { FillBlankEx } from '@/data/types';
import { Tile } from '@/components/ui/Tile';
import { play } from '@/services/sound';
import { Shell } from './Shell';
import type { ExProps } from './types';
import { Press } from '@/components/ui/Press';

export function FillBlank({ ex, onAnswer, locked, grade }: ExProps<FillBlankEx>) {
  const [sel, setSel] = useState<number | null>(null);
  const blankColor = grade ? (grade.correct ? '#58A700' : '#EA2B2B') : '#1CB0F6';
  return (
    <Shell title="Fill in the blank">
      <View style={{ borderWidth: 2, borderColor: '#E5E5E5', borderRadius: 16, padding: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#4B4B4B', lineHeight: 38 }}>
          {ex.before ? `${ex.before} ` : ''}
          <Text style={{ color: blankColor, textDecorationLine: 'underline', backgroundColor: sel === null ? '#F0F0F0' : 'transparent' }}>
            {sel === null ? '        ' : ex.options[sel]}
          </Text>
          {ex.after ? ` ${ex.after.trimStart()}` : ''}
        </Text>
        <Text style={{ color: '#777', marginTop: 8, fontSize: 15 }}>{ex.translation}</Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
        {ex.options.map((o, i) => (
          <Tile
            key={i}
            big
            label={o}
            state={sel === i ? 'selected' : 'idle'}
            disabled={locked}
            onPress={() => {
              void play('tap');
              setSel(i);
              onAnswer(i);
            }}
          />
        ))}
      </View>
      <Press />
    </Shell>
  );
}
