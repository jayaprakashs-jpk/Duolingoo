import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { Press } from '@/components/ui/Press';

export type NodeState = 'locked' | 'active' | 'completed' | 'legendary';

interface Props {
  icon: string;
  label: string;
  state: NodeState;
  color: string;
  dark: string;
  side?: boolean;
  badge?: string;
  onPress: () => void;
}

/** one stepping stone on the winding path */
export function PathNode({ icon, label, state, color, dark, side, badge, onPress }: Props) {
  const ring = useSharedValue(0);
  useEffect(() => {
    if (state !== 'active') {
      ring.value = 0;
      return;
    }
    ring.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.out(Easing.quad) }), -1);
  }, [state, ring]);
  const ringStyle = useAnimatedStyle(() => ({ opacity: 0.55 * (1 - ring.value), transform: [{ scale: 1 + ring.value * 0.55 }] }));

  const size = side ? 62 : 74;
  const bg = state === 'locked' ? '#E5E5E5' : state === 'legendary' ? '#FFC800' : color;
  const edge = state === 'locked' ? '#CFCFCF' : state === 'legendary' ? '#C99A00' : dark;
  const glyph = state === 'locked' ? '🔒' : state === 'completed' ? '✓' : state === 'legendary' ? '👑' : icon;

  return (
    <View style={{ alignItems: 'center', width: 140 }}>
      {state === 'active' ? (
        <View style={{ backgroundColor: '#fff', borderWidth: 2, borderColor: '#E5E5E5', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 6 }}>
          <Text style={{ color, fontWeight: '900', letterSpacing: 1 }}>START</Text>
        </View>
      ) : null}
      <View style={{ width: size + 24, height: size + 24, alignItems: 'center', justifyContent: 'center' }}>
        {state === 'active' ? <Animated.View style={[{ position: 'absolute', width: size + 8, height: size + 8, borderRadius: (size + 8) / 2, backgroundColor: color }, ringStyle]} /> : null}
        <Press
          onPress={onPress}
          accessibilityLabel={`${label}, ${state}`}
          style={({ pressed }) => ({
            width: size,
            height: size,
            borderRadius: side ? 18 : size / 2,
            backgroundColor: bg,
            borderBottomWidth: pressed ? 3 : 8,
            borderBottomColor: edge,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ translateY: pressed ? 4 : 0 }],
          })}
        >
          <Text style={{ fontSize: state === 'completed' ? 34 : 30, color: '#fff', fontWeight: '900' }}>{glyph}</Text>
        </Press>
        {badge ? (
          <View style={{ position: 'absolute', right: 8, top: 4, backgroundColor: '#CE82FF', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 }}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text numberOfLines={1} style={{ color: state === 'locked' ? '#AFAFAF' : '#4B4B4B', fontWeight: '800', fontSize: 13, marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}
