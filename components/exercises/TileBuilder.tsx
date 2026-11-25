import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Tile } from '@/components/ui/Tile';
import { play } from '@/services/sound';

interface Props {
  bank: string[];
  locked: boolean;
  correct: boolean | null;
  onChange: (tokens: string[] | null) => void;
}

/** Shared by Word Bank and Listening exercises: tap tiles to build a sentence. */
export function TileBuilder({ bank, locked, correct, onChange }: Props) {
  const [picked, setPicked] = useState<number[]>([]);

  useEffect(() => {
    onChange(picked.length ? picked.map((i) => bank[i]) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked]);

  const add = (i: number) => {
    if (locked) return;
    void play('tap');
    setPicked((p) => [...p, i]);
  };
  const remove = (pos: number) => {
    if (locked) return;
    setPicked((p) => p.filter((_, k) => k !== pos));
  };

  return (
    <View>
      <View style={{ minHeight: 110, borderTopWidth: 2, borderBottomWidth: 2, borderColor: '#E5E5E5', paddingVertical: 8, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-start' }}>
        {picked.map((bi, pos) => (
          <Tile key={`${bi}-${pos}`} testID={`picked-${pos}`} label={bank[bi]} state={correct === null ? 'idle' : correct ? 'correct' : 'wrong'} onPress={() => remove(pos)} disabled={locked} />
        ))}
        {!picked.length ? <Text style={{ color: '#AFAFAF', padding: 12, fontSize: 15 }}>Tap the words below</Text> : null}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 16 }}>
        {bank.map((w, i) => (
          <Tile key={`${w}-${i}`} testID={`bank-${i}`} label={w} state={picked.includes(i) ? 'ghost' : 'idle'} onPress={() => add(i)} disabled={locked} />
        ))}
      </View>
    </View>
  );
}
