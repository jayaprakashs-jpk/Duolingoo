import React from 'react';
import { Pressable, Text } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUi } from '@/store/ui';

const TONES = { info: '#1CB0F6', success: '#58CC02', warn: '#FF9600' } as const;

export function Toasts() {
  const toasts = useUi((s) => s.toasts);
  const dismiss = useUi((s) => s.dismiss);
  const insets = useSafeAreaInsets();
  return (
    <>
      {toasts.map((t, i) => (
        <Animated.View
          key={t.id}
          entering={FadeInDown.duration(220)}
          exiting={FadeOutUp.duration(200)}
          pointerEvents="box-none"
          style={{ position: 'absolute', left: 16, right: 16, top: insets.top + 8 + i * 64, zIndex: 999 }}
        >
          <Pressable onPress={() => dismiss(t.id)} style={{ backgroundColor: TONES[t.tone], borderRadius: 16, padding: 14, borderBottomWidth: 4, borderBottomColor: 'rgba(0,0,0,0.2)' }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>{t.text}</Text>
          </Pressable>
        </Animated.View>
      ))}
    </>
  );
}
