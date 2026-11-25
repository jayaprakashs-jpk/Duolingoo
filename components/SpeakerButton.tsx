import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { speak } from '@/services/speech';
import { Press } from '@/components/ui/Press';

interface Props {
  text: string;
  lang: string;
  size?: number;
  slow?: boolean;
  color?: string;
}

export function SpeakerButton({ text, lang, size = 44, slow, color = '#1CB0F6' }: Props) {
  const [playing, setPlaying] = useState(false);
  return (
    <Press
      accessibilityLabel={slow ? 'Play slowly' : 'Play audio'}
      onPress={() => {
        setPlaying(true);
        speak(text, lang, { slow, onDone: () => setPlaying(false) });
      }}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: playing ? '#84D8FF' : color,
        borderBottomWidth: pressed ? 1 : 4,
        borderBottomColor: '#1899D6',
        alignItems: 'center',
        justifyContent: 'center',
      })}
    >
      <Text style={{ fontSize: size * 0.48 }}>{slow ? '🐢' : '🔊'}</Text>
    </Press>
  );
}

export function SpeakerPair({ text, lang, size = 56 }: { text: string; lang: string; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center', justifyContent: 'center' }}>
      <SpeakerButton text={text} lang={lang} size={size} />
      <SpeakerButton text={text} lang={lang} size={size * 0.8} slow color="#58CC02" />
    </View>
  );
}
