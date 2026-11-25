import React from 'react';
import { Pressable, Text, type StyleProp, type ViewStyle } from 'react-native';

interface Props {
  label: string;
  onPress?: () => void;
  state?: 'idle' | 'selected' | 'correct' | 'wrong' | 'ghost' | 'matched';
  disabled?: boolean;
  big?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const COLORS = {
  idle: { bg: '#FFFFFF', border: '#E5E5E5', text: '#4B4B4B' },
  selected: { bg: '#DDF4FF', border: '#84D8FF', text: '#1899D6' },
  correct: { bg: '#D7FFB8', border: '#58CC02', text: '#58A700' },
  wrong: { bg: '#FFDFE0', border: '#FF4B4B', text: '#EA2B2B' },
  ghost: { bg: '#F0F0F0', border: '#F0F0F0', text: 'transparent' },
  matched: { bg: '#F7F7F7', border: '#E5E5E5', text: '#CFCFCF' },
} as const;

export function Tile({ label, onPress, state = 'idle', disabled, big, style, testID }: Props) {
  const c = COLORS[state];
  return (
    <Pressable
      testID={testID}
      disabled={disabled || state === 'ghost' || state === 'matched'}
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: c.bg,
          borderColor: c.border,
          borderWidth: 2,
          borderBottomWidth: pressed ? 2 : 4,
          borderRadius: 14,
          paddingVertical: big ? 14 : 10,
          paddingHorizontal: big ? 18 : 14,
          margin: 4,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Text style={{ color: c.text, fontSize: big ? 18 : 17, fontWeight: '700', lineHeight: big ? 28 : 26 }}>{label}</Text>
    </Pressable>
  );
}

